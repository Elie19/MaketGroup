<?php
// admin.php
$pageTitle = 'Administration';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$currentUser = requireAdmin();
$db = getDB();

// Handle admin actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'delete_ad') {
        $db->prepare("UPDATE ads SET status='deleted' WHERE id=?")->execute([(int)$_POST['ad_id']]);
        flash('success', 'Annonce supprimée.');
    }
    if ($action === 'ban_user') {
        // We use role field to mark as banned (simple approach)
        $db->prepare("UPDATE users SET role='banned' WHERE id=? AND id!=?")->execute([(int)$_POST['user_id'], $currentUser['id']]);
        flash('success', 'Utilisateur banni.');
    }
    if ($action === 'restore_user') {
        $db->prepare("UPDATE users SET role='user' WHERE id=?")->execute([(int)$_POST['user_id']]);
        flash('success', 'Utilisateur restauré.');
    }
    if ($action === 'promote_admin') {
        $db->prepare("UPDATE users SET role='admin' WHERE id=?")->execute([(int)$_POST['user_id']]);
        flash('success', 'Utilisateur promu admin.');
    }
    header('Location: ' . BASE_URL . '/admin.php?tab=' . ($_GET['tab'] ?? 'overview'));
    exit;
}

$tab = $_GET['tab'] ?? 'overview';

// Stats
$stats = [];
$queries = [
    'total_users'        => "SELECT COUNT(*) FROM users",
    'total_ads'          => "SELECT COUNT(*) FROM ads WHERE status='active'",
    'total_transactions' => "SELECT COUNT(*) FROM transactions",
    'total_revenue'      => "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status='completed'",
    'total_groups'       => "SELECT COUNT(*) FROM groups_chat",
    'total_messages'     => "SELECT COUNT(*) FROM messages",
    'new_users_week'     => "SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
    'new_ads_week'       => "SELECT COUNT(*) FROM ads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status='active'",
];
foreach ($queries as $key => $q) {
    $stats[$key] = $db->query($q)->fetchColumn();
}

// Recent data per tab
$users = $ads = $transactions = [];

if ($tab === 'users') {
    $users = $db->query("SELECT * FROM users ORDER BY created_at DESC LIMIT 50")->fetchAll();
}
if ($tab === 'ads') {
    $ads = $db->query("SELECT a.*, u.display_name AS author_display FROM ads a LEFT JOIN users u ON u.id=a.author_id WHERE a.status!='deleted' ORDER BY a.created_at DESC LIMIT 50")->fetchAll();
}
if ($tab === 'transactions') {
    $transactions = $db->query("SELECT t.*, a.title AS ad_title, s.display_name AS seller_name, b.display_name AS buyer_name
        FROM transactions t
        LEFT JOIN ads a ON a.id=t.ad_id
        LEFT JOIN users s ON s.id=t.seller_id
        LEFT JOIN users b ON b.id=t.buyer_id
        ORDER BY t.created_at DESC LIMIT 50")->fetchAll();
}

// Sales by category chart data
$catSales = $db->query("SELECT a.category, COUNT(t.id) AS cnt FROM transactions t JOIN ads a ON a.id=t.ad_id GROUP BY a.category ORDER BY cnt DESC LIMIT 7")->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem;">
  <h1 class="page-title" style="margin:0;">🛡 Administration</h1>
  <span style="font-size:.85rem;color:var(--muted);">Connecté en tant que <?= h($currentUser['display_name'] ?? '') ?></span>
</div>

<!-- Tabs -->
<div class="tabs" style="margin-bottom:1.5rem;">
  <a href="?tab=overview"     class="tab <?= $tab==='overview'?'active':'' ?>">Vue d'ensemble</a>
  <a href="?tab=users"        class="tab <?= $tab==='users'?'active':'' ?>">Utilisateurs</a>
  <a href="?tab=ads"          class="tab <?= $tab==='ads'?'active':'' ?>">Annonces</a>
  <a href="?tab=transactions" class="tab <?= $tab==='transactions'?'active':'' ?>">Transactions</a>
</div>

<!-- Overview -->
<?php if ($tab === 'overview'): ?>
  <div class="stats-grid">
    <?php
    $cards = [
      ['👤', 'Utilisateurs',   $stats['total_users'],        '+' . $stats['new_users_week'] . ' cette semaine'],
      ['📢', 'Annonces actives', $stats['total_ads'],         '+' . $stats['new_ads_week'] . ' cette semaine'],
      ['💰', 'Transactions',    $stats['total_transactions'], 'Au total'],
      ['💵', 'Chiffre d\'affaires', formatPrice((float)$stats['total_revenue']), 'Complétées'],
      ['👥', 'Groupes',        $stats['total_groups'],       'Créés'],
      ['💬', 'Messages',       $stats['total_messages'],     'Échangés'],
    ];
    foreach ($cards as [$icon, $label, $val, $sub]):
    ?>
      <div class="stat-card">
        <div style="font-size:1.5rem;"><?= $icon ?></div>
        <div class="value"><?= $val ?></div>
        <div class="label"><?= $label ?></div>
        <div style="font-size:.75rem;color:var(--green);margin-top:.2rem;"><?= $sub ?></div>
      </div>
    <?php endforeach; ?>
  </div>

  <?php if ($catSales): ?>
    <div class="card" style="margin-top:1.5rem;">
      <h2 class="section-title">Ventes par catégorie</h2>
      <?php
        $maxCnt = max(array_column($catSales, 'cnt'));
        foreach ($catSales as $row):
          $pct = $maxCnt > 0 ? round(($row['cnt'] / $maxCnt) * 100) : 0;
      ?>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.75rem;">
          <div style="width:130px;font-size:.88rem;font-weight:500;flex-shrink:0;"><?= h($row['category'] ?? '—') ?></div>
          <div style="flex:1;background:var(--bg);border-radius:50px;height:10px;overflow:hidden;">
            <div style="width:<?= $pct ?>%;background:var(--green);height:100%;border-radius:50px;"></div>
          </div>
          <div style="width:40px;text-align:right;font-size:.85rem;font-weight:700;"><?= $row['cnt'] ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

<!-- Users -->
<?php elseif ($tab === 'users'): ?>
  <div class="card" style="overflow:auto;">
    <table>
      <thead>
        <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Inscrit le</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <?php foreach ($users as $u): ?>
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:.6rem;">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--green);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;overflow:hidden;flex-shrink:0;">
                  <?php if ($u['photo_url']): ?><img src="<?= h($u['photo_url']) ?>" style="width:100%;height:100%;object-fit:cover;"><?php else: echo strtoupper(substr($u['display_name']??'U',0,1)); endif; ?>
                </div>
                <span style="font-weight:600;"><?= h($u['display_name'] ?? '—') ?></span>
              </div>
            </td>
            <td style="color:var(--muted);"><?= h($u['email']) ?></td>
            <td>
              <span class="badge-status <?= $u['role']==='admin'?'badge-admin':($u['role']==='banned'?'badge-deleted':'badge-active') ?>">
                <?= h($u['role']) ?>
              </span>
            </td>
            <td style="color:var(--muted);font-size:.85rem;"><?= timeAgo($u['created_at']) ?></td>
            <td>
              <?php if ($u['id'] !== $currentUser['id']): ?>
                <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
                  <?php if ($u['role'] !== 'admin'): ?>
                    <form method="POST" style="display:inline;">
                      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                      <input type="hidden" name="action" value="promote_admin">
                      <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                      <button type="submit" class="btn btn-outline btn-sm" style="font-size:.75rem;" onclick="return confirm('Promouvoir admin ?')">Admin</button>
                    </form>
                  <?php endif; ?>
                  <?php if ($u['role'] !== 'banned'): ?>
                    <form method="POST" style="display:inline;">
                      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                      <input type="hidden" name="action" value="ban_user">
                      <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                      <button type="submit" class="btn btn-danger btn-sm" style="font-size:.75rem;" onclick="return confirm('Bannir ?')">Bannir</button>
                    </form>
                  <?php else: ?>
                    <form method="POST" style="display:inline;">
                      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                      <input type="hidden" name="action" value="restore_user">
                      <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                      <button type="submit" class="btn btn-outline btn-sm" style="font-size:.75rem;">Restaurer</button>
                    </form>
                  <?php endif; ?>
                </div>
              <?php else: ?>
                <span style="font-size:.8rem;color:var(--muted);">C'est vous</span>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

<!-- Ads -->
<?php elseif ($tab === 'ads'): ?>
  <div class="card" style="overflow:auto;">
    <table>
      <thead>
        <tr><th>Titre</th><th>Auteur</th><th>Prix</th><th>Catégorie</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <?php foreach ($ads as $ad): ?>
          <tr>
            <td><a href="<?= BASE_URL ?>/ad.php?id=<?= $ad['id'] ?>" style="color:var(--green);font-weight:600;"><?= h($ad['title']) ?></a></td>
            <td style="color:var(--muted);"><?= h($ad['author_display'] ?? '—') ?></td>
            <td style="font-weight:700;"><?= formatPrice((float)$ad['price']) ?></td>
            <td style="color:var(--muted);"><?= h($ad['category'] ?? '—') ?></td>
            <td><span class="badge-status badge-<?= h($ad['status']) ?>"><?= h($ad['status']) ?></span></td>
            <td style="color:var(--muted);font-size:.85rem;"><?= timeAgo($ad['created_at']) ?></td>
            <td>
              <form method="POST" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                <input type="hidden" name="action" value="delete_ad">
                <input type="hidden" name="ad_id" value="<?= $ad['id'] ?>">
                <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Supprimer ?')" style="font-size:.75rem;">🗑</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

<!-- Transactions -->
<?php elseif ($tab === 'transactions'): ?>
  <div class="card" style="overflow:auto;">
    <table>
      <thead>
        <tr><th>Article</th><th>Vendeur</th><th>Acheteur</th><th>Montant</th><th>Paiement</th><th>Statut</th><th>Date</th></tr>
      </thead>
      <tbody>
        <?php foreach ($transactions as $t): ?>
          <tr>
            <td style="font-weight:600;"><?= h($t['ad_title'] ?? '—') ?></td>
            <td style="color:var(--muted);"><?= h($t['seller_name'] ?? '—') ?></td>
            <td style="color:var(--muted);"><?= h($t['buyer_name'] ?? $t['guest_name'] ?? 'Invité') ?></td>
            <td style="font-weight:700;color:var(--green);"><?= formatPrice((float)$t['amount']) ?></td>
            <td><?= strtoupper($t['payment_method'] ?? '—') ?></td>
            <td><span class="badge-status badge-active"><?= h($t['status']) ?></span></td>
            <td style="color:var(--muted);font-size:.85rem;"><?= timeAgo($t['created_at']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
