<?php
// profile.php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$db = getDB();
$currentUser = getCurrentUser();

// Whose profile?
$profileId = isset($_GET['id']) ? (int)$_GET['id'] : ($currentUser['id'] ?? 0);
if (!$profileId) { header('Location: ' . BASE_URL . '/login.php'); exit; }

$stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$profileId]);
$profile = $stmt->fetch();
if (!$profile) { header('Location: ' . BASE_URL . '/index.php'); exit; }

$isOwn = $currentUser && $currentUser['id'] === $profileId;
$pageTitle = ($profile['display_name'] ?? 'Profil') . ' — Profil';

// Handle profile update
$errors = [];
if ($isOwn && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    verifyCsrf();

    if ($_POST['action'] === 'update_profile') {
        $name     = trim($_POST['display_name'] ?? '');
        $bio      = trim($_POST['bio'] ?? '');
        $location = trim($_POST['location'] ?? '');

        if (strlen($name) < 2) $errors[] = 'Le nom doit comporter au moins 2 caractères.';

        // Photo upload
        $photoUrl = $profile['photo_url'];
        if (!empty($_FILES['photo']['tmp_name'])) {
            $url = uploadImage($_FILES['photo'], 'avatars');
            if ($url) $photoUrl = $url;
            else $errors[] = 'Format d\'image invalide.';
        }

        if (empty($errors)) {
            $db->prepare("UPDATE users SET display_name=?, bio=?, location=?, photo_url=? WHERE id=?")
               ->execute([$name, $bio, $location, $photoUrl, $currentUser['id']]);
            flash('success', 'Profil mis à jour !');
            header('Location: ' . BASE_URL . '/profile.php');
            exit;
        }
    }

    if ($_POST['action'] === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new     = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if (!password_verify($current, $currentUser['password']))
            $errors[] = 'Mot de passe actuel incorrect.';
        elseif (strlen($new) < 6)
            $errors[] = 'Le nouveau mot de passe doit comporter au moins 6 caractères.';
        elseif ($new !== $confirm)
            $errors[] = 'Les mots de passe ne correspondent pas.';
        else {
            $db->prepare("UPDATE users SET password=? WHERE id=?")->execute([password_hash($new, PASSWORD_BCRYPT), $currentUser['id']]);
            flash('success', 'Mot de passe modifié !');
            header('Location: ' . BASE_URL . '/profile.php');
            exit;
        }
    }

    if ($_POST['action'] === 'delete_ad') {
        $adId = (int)($_POST['ad_id'] ?? 0);
        $db->prepare("UPDATE ads SET status='deleted' WHERE id=? AND author_id=?")->execute([$adId, $currentUser['id']]);
        flash('success', 'Annonce supprimée.');
        header('Location: ' . BASE_URL . '/profile.php');
        exit;
    }
}

// Stats
$adCount = (int)$db->prepare("SELECT COUNT(*) FROM ads WHERE author_id=? AND status='active'")->execute([$profileId]) ? 0 : 0;
$stmtC = $db->prepare("SELECT COUNT(*) FROM ads WHERE author_id=? AND status='active'"); $stmtC->execute([$profileId]); $adCount=(int)$stmtC->fetchColumn();
$stmtS = $db->prepare("SELECT COUNT(*) FROM transactions WHERE seller_id=? AND status='completed'"); $stmtS->execute([$profileId]); $salesCount=(int)$stmtS->fetchColumn();
$stmtR = $db->prepare("SELECT AVG(rating) FROM reviews WHERE seller_id=?"); $stmtR->execute([$profileId]); $avgRating=(float)$stmtR->fetchColumn();

// Tab data
$tab = $_GET['tab'] ?? 'ads';

// Ads
$adsStmt = $db->prepare("SELECT a.*, GROUP_CONCAT(ai.url ORDER BY ai.sort_order SEPARATOR '|') AS image_list
    FROM ads a LEFT JOIN ad_images ai ON ai.ad_id=a.id
    WHERE a.author_id=? AND a.status!='deleted' GROUP BY a.id ORDER BY a.created_at DESC");
$adsStmt->execute([$profileId]);
$userAds = $adsStmt->fetchAll();

// Transactions (only for owner)
$transactions = [];
if ($isOwn) {
    $tStmt = $db->prepare("SELECT t.*, a.title AS ad_title FROM transactions t
        LEFT JOIN ads a ON a.id=t.ad_id
        WHERE t.seller_id=? OR t.buyer_id=? ORDER BY t.created_at DESC LIMIT 20");
    $tStmt->execute([$profileId, $profileId]);
    $transactions = $tStmt->fetchAll();
}

// Reviews
$revStmt = $db->prepare("SELECT r.*, u.display_name AS reviewer_display FROM reviews r
    LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.seller_id=? ORDER BY r.created_at DESC");
$revStmt->execute([$profileId]);
$reviews = $revStmt->fetchAll();

// Favorites (only for owner)
$favorites = [];
if ($isOwn) {
    $fStmt = $db->prepare("SELECT a.*, GROUP_CONCAT(ai.url ORDER BY ai.sort_order SEPARATOR '|') AS image_list
        FROM favorites f JOIN ads a ON a.id=f.ad_id LEFT JOIN ad_images ai ON ai.ad_id=a.id
        WHERE f.user_id=? AND a.status='active' GROUP BY a.id ORDER BY f.created_at DESC");
    $fStmt->execute([$profileId]);
    $favorites = $fStmt->fetchAll();
}

require_once __DIR__ . '/includes/header.php';
?>

<?php if ($errors): ?>
  <div class="alert alert-error" style="margin-bottom:1rem;border-radius:var(--radius);">
    <?php foreach ($errors as $e): ?><div>• <?= h($e) ?></div><?php endforeach; ?>
  </div>
<?php endif; ?>

<!-- Profile Header -->
<div class="card" style="margin-bottom:1.5rem;">
  <div class="profile-header">
    <div class="profile-avatar-lg">
      <?php if ($profile['photo_url']): ?>
        <img src="<?= h($profile['photo_url']) ?>" alt="avatar" referrerpolicy="no-referrer">
      <?php else: ?>
        <?= strtoupper(substr($profile['display_name'] ?? 'U', 0, 1)) ?>
      <?php endif; ?>
    </div>
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;">
        <h1 style="font-size:1.5rem;font-weight:800;"><?= h($profile['display_name'] ?? '') ?></h1>
        <?php if ($profile['role'] === 'admin'): ?>
          <span class="badge-status badge-admin">Admin</span>
        <?php endif; ?>
      </div>
      <?php if ($profile['location']): ?>
        <div style="color:var(--muted);font-size:.9rem;margin-top:.2rem;">📍 <?= h($profile['location']) ?></div>
      <?php endif; ?>
      <?php if ($profile['bio']): ?>
        <p style="margin-top:.5rem;font-size:.9rem;color:var(--muted);"><?= h($profile['bio']) ?></p>
      <?php endif; ?>
      <div style="margin-top:.5rem;font-size:.8rem;color:var(--muted);">Membre depuis <?= timeAgo($profile['created_at']) ?></div>

      <div class="profile-stats">
        <div class="stat"><strong><?= $adCount ?></strong><span>Annonces</span></div>
        <div class="stat"><strong><?= $salesCount ?></strong><span>Ventes</span></div>
        <div class="stat">
          <strong><?= $avgRating > 0 ? number_format($avgRating, 1) : '—' ?></strong>
          <span>Note moy.</span>
        </div>
        <div class="stat"><strong><?= (int)$profile['total_reviews'] ?></strong><span>Avis</span></div>
      </div>
    </div>

    <?php if ($isOwn): ?>
      <button onclick="document.getElementById('edit-modal').style.display='flex'" class="btn btn-outline btn-sm">✏️ Modifier</button>
    <?php elseif ($currentUser): ?>
      <a href="<?= BASE_URL ?>/messages.php?user=<?= $profileId ?>" class="btn btn-primary btn-sm">💬 Message</a>
    <?php endif; ?>
  </div>
</div>

<!-- Tabs -->
<div class="tabs">
  <a href="?id=<?= $profileId ?>&tab=ads"   class="tab <?= $tab==='ads'?'active':'' ?>">Annonces (<?= $adCount ?>)</a>
  <a href="?id=<?= $profileId ?>&tab=reviews" class="tab <?= $tab==='reviews'?'active':'' ?>">Avis (<?= count($reviews) ?>)</a>
  <?php if ($isOwn): ?>
    <a href="?id=<?= $profileId ?>&tab=transactions" class="tab <?= $tab==='transactions'?'active':'' ?>">Transactions</a>
    <a href="?id=<?= $profileId ?>&tab=favorites"    class="tab <?= $tab==='favorites'?'active':'' ?>">Favoris (<?= count($favorites) ?>)</a>
    <a href="?id=<?= $profileId ?>&tab=security"     class="tab <?= $tab==='security'?'active':'' ?>">Sécurité</a>
  <?php endif; ?>
</div>

<!-- Tab: Ads -->
<?php if ($tab === 'ads'): ?>
  <?php if (empty($userAds)): ?>
    <div class="empty-state">
      <svg width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
      <h3>Aucune annonce</h3>
      <?php if ($isOwn): ?><p><a href="<?= BASE_URL ?>/create-ad.php" class="btn btn-primary btn-sm" style="margin-top:.75rem;">+ Publier</a></p><?php endif; ?>
    </div>
  <?php else: ?>
    <div class="ads-grid">
      <?php foreach ($userAds as $ad):
        $images = $ad['image_list'] ? explode('|', $ad['image_list']) : [];
        $thumb  = $images[0] ?? "https://picsum.photos/seed/{$ad['id']}/400/400";
      ?>
        <div style="position:relative;">
          <a href="<?= BASE_URL ?>/ad.php?id=<?= $ad['id'] ?>" class="ad-card">
            <div class="ad-thumb">
              <img src="<?= h($thumb) ?>" alt="<?= h($ad['title']) ?>" loading="lazy">
              <span class="ad-price-badge"><?= formatPrice((float)$ad['price']) ?></span>
              <?php if ($ad['status'] !== 'active'): ?>
                <span style="position:absolute;top:.75rem;left:.75rem;background:var(--danger);color:#fff;font-size:.7rem;font-weight:700;padding:.2rem .5rem;border-radius:.4rem;"><?= strtoupper($ad['status']) ?></span>
              <?php endif; ?>
            </div>
            <div class="ad-body">
              <div class="ad-cat"><?= h($ad['category'] ?? '') ?></div>
              <div class="ad-title"><?= h($ad['title']) ?></div>
              <div class="ad-meta"><span>📍 <?= h($ad['location'] ?? '') ?></span><span><?= timeAgo($ad['created_at']) ?></span></div>
            </div>
          </a>
          <?php if ($isOwn): ?>
            <div style="display:flex;gap:.5rem;padding:.5rem 1rem 1rem;">
              <a href="<?= BASE_URL ?>/create-ad.php?id=<?= $ad['id'] ?>" class="btn btn-outline btn-sm" style="flex:1;justify-content:center;">✏️ Modifier</a>
              <form method="POST" style="flex:1;" onsubmit="return confirm('Supprimer cette annonce ?')">
                <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                <input type="hidden" name="action" value="delete_ad">
                <input type="hidden" name="ad_id" value="<?= $ad['id'] ?>">
                <button type="submit" class="btn btn-danger btn-sm btn-full">🗑 Supprimer</button>
              </form>
            </div>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

<!-- Tab: Reviews -->
<?php elseif ($tab === 'reviews'): ?>
  <?php if (empty($reviews)): ?>
    <div class="empty-state"><svg width="50" height="50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z"/></svg>
      <h3>Aucun avis pour le moment</h3></div>
  <?php else: ?>
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <?php foreach ($reviews as $r): ?>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
            <strong><?= h($r['reviewer_display'] ?? $r['reviewer_name'] ?? 'Anonyme') ?></strong>
            <div>
              <span class="stars"><?= str_repeat('★',(int)$r['rating']) . str_repeat('☆',5-(int)$r['rating']) ?></span>
              <span style="font-size:.8rem;color:var(--muted);margin-left:.5rem;"><?= timeAgo($r['created_at']) ?></span>
            </div>
          </div>
          <p style="color:var(--muted);font-size:.9rem;"><?= h($r['comment']) ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

<!-- Tab: Transactions -->
<?php elseif ($tab === 'transactions' && $isOwn): ?>
  <?php if (empty($transactions)): ?>
    <div class="empty-state"><h3>Aucune transaction</h3></div>
  <?php else: ?>
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr><th>Article</th><th>Montant</th><th>Paiement</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>
          <?php foreach ($transactions as $t): ?>
            <tr>
              <td><?= h($t['ad_title'] ?? '—') ?></td>
              <td style="font-weight:700;color:var(--green);"><?= formatPrice((float)$t['amount']) ?></td>
              <td><?= h(strtoupper($t['payment_method'] ?? '—')) ?></td>
              <td><span class="badge-status badge-active"><?= h($t['status']) ?></span></td>
              <td style="color:var(--muted);font-size:.85rem;"><?= timeAgo($t['created_at']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>

<!-- Tab: Favorites -->
<?php elseif ($tab === 'favorites' && $isOwn): ?>
  <?php if (empty($favorites)): ?>
    <div class="empty-state"><h3>Aucun favori</h3></div>
  <?php else: ?>
    <div class="ads-grid">
      <?php foreach ($favorites as $ad):
        $images = $ad['image_list'] ? explode('|', $ad['image_list']) : [];
        $thumb  = $images[0] ?? "https://picsum.photos/seed/{$ad['id']}/400/400";
      ?>
        <a href="<?= BASE_URL ?>/ad.php?id=<?= $ad['id'] ?>" class="ad-card">
          <div class="ad-thumb">
            <img src="<?= h($thumb) ?>" alt="<?= h($ad['title']) ?>" loading="lazy">
            <span class="ad-price-badge"><?= formatPrice((float)$ad['price']) ?></span>
          </div>
          <div class="ad-body">
            <div class="ad-cat"><?= h($ad['category'] ?? '') ?></div>
            <div class="ad-title"><?= h($ad['title']) ?></div>
            <div class="ad-meta"><span>📍 <?= h($ad['location'] ?? '') ?></span><span><?= timeAgo($ad['created_at']) ?></span></div>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

<!-- Tab: Security -->
<?php elseif ($tab === 'security' && $isOwn): ?>
  <div class="card" style="max-width:480px;">
    <h2 class="section-title">Changer le mot de passe</h2>
    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="change_password">
      <div class="form-group">
        <label class="form-label">Mot de passe actuel</label>
        <input class="form-control" type="password" name="current_password" required>
      </div>
      <div class="form-group">
        <label class="form-label">Nouveau mot de passe</label>
        <input class="form-control" type="password" name="new_password" required minlength="6">
      </div>
      <div class="form-group">
        <label class="form-label">Confirmer le nouveau mot de passe</label>
        <input class="form-control" type="password" name="confirm_password" required>
      </div>
      <button type="submit" class="btn btn-primary">Mettre à jour</button>
    </form>
  </div>
<?php endif; ?>

<!-- Edit Profile Modal -->
<?php if ($isOwn): ?>
<div id="edit-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);">
  <div class="card" style="width:100%;max-width:520px;max-height:90vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
      <h2 style="font-size:1.2rem;font-weight:800;">Modifier le profil</h2>
      <button onclick="document.getElementById('edit-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--muted);">✕</button>
    </div>
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="update_profile">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
        <div class="profile-avatar-lg" style="width:64px;height:64px;font-size:1.4rem;">
          <?php if ($profile['photo_url']): ?>
            <img src="<?= h($profile['photo_url']) ?>" alt="avatar" referrerpolicy="no-referrer">
          <?php else: ?>
            <?= strtoupper(substr($profile['display_name'] ?? 'U', 0, 1)) ?>
          <?php endif; ?>
        </div>
        <div>
          <label class="btn btn-outline btn-sm" style="cursor:pointer;">
            📷 Changer la photo
            <input type="file" name="photo" accept="image/*" style="display:none;" onchange="previewAvatar(this)">
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nom d'affichage</label>
        <input class="form-control" type="text" name="display_name" required value="<?= h($profile['display_name'] ?? '') ?>">
      </div>
      <div class="form-group">
        <label class="form-label">Localisation</label>
        <input class="form-control" type="text" name="location" value="<?= h($profile['location'] ?? '') ?>" placeholder="Ex: Cotonou, Bénin">
      </div>
      <div class="form-group">
        <label class="form-label">Biographie</label>
        <textarea class="form-control" name="bio" rows="3" placeholder="Parlez de vous…"><?= h($profile['bio'] ?? '') ?></textarea>
      </div>
      <div style="display:flex;gap:.75rem;">
        <button type="button" onclick="document.getElementById('edit-modal').style.display='none'" class="btn btn-outline" style="flex:1;">Annuler</button>
        <button type="submit" class="btn btn-primary" style="flex:2;">💾 Enregistrer</button>
      </div>
    </form>
  </div>
</div>
<script>
function previewAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const av = document.querySelector('#edit-modal .profile-avatar-lg');
      if (av) av.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}
</script>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
