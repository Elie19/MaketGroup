<?php
// ad.php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$db = getDB();
$id = (int)($_GET['id'] ?? 0);
if (!$id) { header('Location: ' . BASE_URL . '/index.php'); exit; }

$stmt = $db->prepare("SELECT a.*, u.display_name AS seller_name, u.photo_url AS seller_photo, u.bio AS seller_bio,
    u.location AS seller_location, u.average_rating, u.total_reviews, u.created_at AS seller_since
    FROM ads a LEFT JOIN users u ON u.id = a.author_id
    WHERE a.id = ? AND a.status != 'deleted'");
$stmt->execute([$id]);
$ad = $stmt->fetch();
if (!$ad) { header('Location: ' . BASE_URL . '/index.php'); exit; }

$pageTitle = $ad['title'];
$images = getAdImages($id);
if (empty($images)) $images = ["https://picsum.photos/seed/$id/600/600"];

$currentUser = getCurrentUser();
$isFav = false;
if ($currentUser) {
    $fstmt = $db->prepare("SELECT id FROM favorites WHERE user_id = ? AND ad_id = ?");
    $fstmt->execute([$currentUser['id'], $id]);
    $isFav = (bool)$fstmt->fetch();
}

// Reviews
$rstmt = $db->prepare("SELECT r.*, u.display_name AS reviewer_display FROM reviews r
    LEFT JOIN users u ON u.id = r.reviewer_id
    WHERE r.seller_id = ? ORDER BY r.created_at DESC LIMIT 10");
$rstmt->execute([$ad['author_id']]);
$reviews = $rstmt->fetchAll();

// Handle purchase form
$purchaseError = '';
$purchaseSuccess = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'purchase') {
    verifyCsrf();
    $amount    = (float)($ad['price']);
    $method    = $_POST['payment_method'] ?? 'cash';
    $reference = trim($_POST['payment_reference'] ?? '');
    $sellerId  = $ad['author_id'];
    $buyerId   = $currentUser ? $currentUser['id'] : null;
    $guestEmail= $buyerId ? null : trim($_POST['guest_email'] ?? '');
    $guestName = $buyerId ? null : trim($_POST['guest_name'] ?? '');

    if (!$buyerId && (!$guestEmail || !$guestName)) {
        $purchaseError = 'Veuillez renseigner votre nom et email.';
    } else {
        $db->beginTransaction();
        try {
            $ins = $db->prepare("INSERT INTO transactions (ad_id, seller_id, buyer_id, guest_email, guest_name, amount, status, payment_method, payment_reference)
                VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)");
            $ins->execute([$id, $sellerId, $buyerId, $guestEmail, $guestName, $amount, $method, $reference]);

            $db->prepare("UPDATE ads SET status='sold' WHERE id=?")->execute([$id]);
            $db->prepare("INSERT INTO notifications (user_id, type, title, content, link)
                VALUES (?, 'sale', 'Nouvelle vente !', ?, '/maketgroup/profile.php')")
               ->execute([$sellerId, "Votre annonce \"{$ad['title']}\" a été vendue pour " . formatPrice($amount) . "."]);

            $db->commit();
            $purchaseSuccess = true;
            $ad['status'] = 'sold';
            flash('success', 'Achat effectué avec succès !');
        } catch (Exception $e) {
            $db->rollBack();
            $purchaseError = 'Une erreur est survenue. Veuillez réessayer.';
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<a href="javascript:history.back()" class="btn btn-outline btn-sm" style="margin-bottom:1.5rem;">← Retour</a>

<div class="ad-detail-grid">
  <!-- Gallery -->
  <div>
    <div class="ad-gallery">
      <img id="gallery-main" src="<?= h($images[0]) ?>" alt="<?= h($ad['title']) ?>" referrerpolicy="no-referrer">
    </div>
    <?php if (count($images) > 1): ?>
    <div class="gallery-thumbs">
      <?php foreach ($images as $i => $img): ?>
        <div class="gallery-thumb <?= $i===0?'active':'' ?>">
          <img src="<?= h($img) ?>" alt="Image <?= $i+1 ?>" referrerpolicy="no-referrer">
        </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <div class="card" style="margin-top:1.5rem;">
      <h2 class="section-title">Description</h2>
      <p style="color:var(--muted);line-height:1.7;white-space:pre-wrap;"><?= h($ad['description'] ?? '') ?></p>
    </div>

    <?php if ($reviews): ?>
    <div class="card" style="margin-top:1.5rem;">
      <h2 class="section-title">Avis sur le vendeur</h2>
      <?php foreach ($reviews as $r): ?>
        <div style="padding:.75rem 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong><?= h($r['reviewer_display'] ?? $r['reviewer_name'] ?? 'Anonyme') ?></strong>
            <span class="stars"><?= str_repeat('★', (int)$r['rating']) . str_repeat('☆', 5-(int)$r['rating']) ?></span>
          </div>
          <p style="color:var(--muted);font-size:.9rem;margin-top:.3rem;"><?= h($r['comment']) ?></p>
          <span style="font-size:.75rem;color:var(--muted);"><?= timeAgo($r['created_at']) ?></span>
        </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

  <!-- Sidebar -->
  <div class="ad-sidebar">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
        <div>
          <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--green);letter-spacing:.05em;"><?= h($ad['category'] ?? '') ?></div>
          <h1 style="font-size:1.4rem;font-weight:800;margin-top:.25rem;"><?= h($ad['title']) ?></h1>
        </div>
        <button class="ad-fav-btn <?= $isFav?'active':'' ?>" data-ad-id="<?= $id ?>" style="position:static;width:38px;height:38px;background:var(--bg);border:1px solid var(--border);color:var(--muted);" title="Favori">
          <svg width="16" height="16" fill="<?= $isFav?'currentColor':'none' ?>" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div style="font-size:2rem;font-weight:800;color:var(--green);"><?= formatPrice((float)$ad['price']) ?></div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:.5rem;">📍 <?= h($ad['location'] ?? '') ?> · <?= timeAgo($ad['created_at']) ?></div>

      <?php if ($ad['status'] === 'sold'): ?>
        <div style="background:#dbeafe;color:#1e40af;border-radius:.75rem;padding:.75rem;text-align:center;font-weight:700;margin-top:1rem;">✓ Article vendu</div>
      <?php elseif (!$currentUser || $currentUser['id'] !== $ad['author_id']): ?>
        <button onclick="document.getElementById('buy-modal').style.display='flex'" class="btn btn-primary btn-full" style="margin-top:1rem;">🛒 Acheter</button>
        <?php if ($currentUser): ?>
          <a href="<?= BASE_URL ?>/messages.php?user=<?= $ad['author_id'] ?>" class="btn btn-outline btn-full" style="margin-top:.5rem;">💬 Contacter le vendeur</a>
        <?php endif; ?>
      <?php else: ?>
        <a href="<?= BASE_URL ?>/edit-ad.php?id=<?= $id ?>" class="btn btn-outline btn-full" style="margin-top:1rem;">✏️ Modifier l'annonce</a>
      <?php endif; ?>
    </div>

    <!-- Seller card -->
    <div class="card">
      <h2 class="section-title">Vendeur</h2>
      <div class="seller-card">
        <div class="seller-avatar">
          <?php if ($ad['seller_photo']): ?>
            <img src="<?= h($ad['seller_photo']) ?>" alt="avatar" referrerpolicy="no-referrer">
          <?php else: ?>
            <?= strtoupper(substr($ad['seller_name'] ?? 'V', 0, 1)) ?>
          <?php endif; ?>
        </div>
        <div>
          <div style="font-weight:700;"><?= h($ad['seller_name'] ?? '') ?></div>
          <div class="stars"><?= str_repeat('★', (int)round($ad['average_rating'])) . str_repeat('☆', 5-(int)round($ad['average_rating'])) ?></div>
          <div style="font-size:.8rem;color:var(--muted);"><?= (int)$ad['total_reviews'] ?> avis · Membre depuis <?= timeAgo($ad['seller_since']) ?></div>
        </div>
      </div>
      <?php if ($ad['seller_bio']): ?>
        <p style="margin-top:.75rem;font-size:.9rem;color:var(--muted);"><?= h($ad['seller_bio']) ?></p>
      <?php endif; ?>
      <a href="<?= BASE_URL ?>/profile.php?id=<?= $ad['author_id'] ?>" class="btn btn-outline btn-full" style="margin-top:1rem;font-size:.85rem;">Voir le profil</a>
    </div>
  </div>
</div>

<!-- Purchase Modal -->
<div id="buy-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);">
  <div class="card" style="width:100%;max-width:480px;max-height:90vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
      <h2 style="font-size:1.2rem;font-weight:800;">Finaliser l'achat</h2>
      <button onclick="document.getElementById('buy-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--muted);">✕</button>
    </div>

    <?php if ($purchaseError): ?>
      <div class="alert alert-error" style="margin-bottom:1rem;border-radius:.75rem;"><?= h($purchaseError) ?></div>
    <?php endif; ?>
    <?php if ($purchaseSuccess): ?>
      <div class="alert alert-success" style="margin-bottom:1rem;border-radius:.75rem;">Achat confirmé ! Merci.</div>
    <?php endif; ?>

    <div style="background:var(--bg);border-radius:.75rem;padding:1rem;margin-bottom:1.25rem;display:flex;justify-content:space-between;">
      <span style="font-weight:600;"><?= h($ad['title']) ?></span>
      <span style="font-weight:800;color:var(--green);"><?= formatPrice((float)$ad['price']) ?></span>
    </div>

    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="purchase">

      <?php if (!$currentUser): ?>
        <div class="form-group">
          <label class="form-label">Votre nom</label>
          <input class="form-control" type="text" name="guest_name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Votre email</label>
          <input class="form-control" type="email" name="guest_email" required>
        </div>
      <?php endif; ?>

      <div class="form-group">
        <label class="form-label">Mode de paiement</label>
        <select class="form-control" name="payment_method">
          <option value="mtn">MTN Mobile Money</option>
          <option value="moov">Moov Money</option>
          <option value="cash">Espèces</option>
          <option value="card">Carte bancaire</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Référence de paiement (optionnel)</label>
        <input class="form-control" type="text" name="payment_reference" placeholder="Ex: TXN-123456">
      </div>

      <div style="display:flex;gap:.75rem;margin-top:.5rem;">
        <button type="button" onclick="document.getElementById('buy-modal').style.display='none'" class="btn btn-outline" style="flex:1;">Annuler</button>
        <button type="submit" class="btn btn-primary" style="flex:2;">✓ Confirmer l'achat</button>
      </div>
    </form>
  </div>
</div>

<?php if ($purchaseError || $purchaseSuccess): ?>
<script>document.getElementById('buy-modal').style.display='flex';</script>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
