<?php
// notifications.php
$pageTitle = 'Notifications';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$currentUser = requireLogin();
$db = getDB();

// Mark all as read
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    if ($_POST['action'] === 'mark_all_read') {
        $db->prepare("UPDATE notifications SET is_read=1 WHERE user_id=?")->execute([$currentUser['id']]);
        header('Location: ' . BASE_URL . '/notifications.php');
        exit;
    }
    if ($_POST['action'] === 'mark_read') {
        $nid = (int)($_POST['notif_id'] ?? 0);
        $db->prepare("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?")->execute([$nid, $currentUser['id']]);
    }
}

$stmt = $db->prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50");
$stmt->execute([$currentUser['id']]);
$notifications = $stmt->fetchAll();

$unread = array_filter($notifications, fn($n) => !$n['is_read']);

require_once __DIR__ . '/includes/header.php';
?>

<div style="max-width:700px;margin:0 auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
    <h1 class="page-title" style="margin:0;">Notifications <?php if ($unread): ?><span style="font-size:1rem;color:var(--green);">(<?= count($unread) ?> non lues)</span><?php endif; ?></h1>
    <?php if ($unread): ?>
      <form method="POST">
        <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
        <input type="hidden" name="action" value="mark_all_read">
        <button type="submit" class="btn btn-outline btn-sm">✓ Tout marquer lu</button>
      </form>
    <?php endif; ?>
  </div>

  <?php if (empty($notifications)): ?>
    <div class="empty-state">
      <svg width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <h3>Aucune notification</h3>
      <p>Vous êtes à jour !</p>
    </div>
  <?php else: ?>
    <div style="display:flex;flex-direction:column;gap:.5rem;">
      <?php foreach ($notifications as $n):
        $icons = ['sale'=>'💰','message'=>'💬','group'=>'👥','info'=>'ℹ️','review'=>'⭐'];
        $icon  = $icons[$n['type']] ?? '🔔';
      ?>
        <div class="card" style="<?= !$n['is_read']?'border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.03);':'' ?>padding:1rem 1.25rem;display:flex;gap:1rem;align-items:flex-start;">
          <div style="font-size:1.4rem;flex-shrink:0;margin-top:.1rem;"><?= $icon ?></div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:<?= !$n['is_read']?'700':'600' ?>;font-size:.95rem;"><?= h($n['title']) ?></div>
            <div style="font-size:.88rem;color:var(--muted);margin-top:.2rem;"><?= h($n['content']) ?></div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:.4rem;"><?= timeAgo($n['created_at']) ?></div>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0;">
            <?php if (!$n['is_read']): ?>
              <form method="POST" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                <input type="hidden" name="action" value="mark_read">
                <input type="hidden" name="notif_id" value="<?= $n['id'] ?>">
                <button type="submit" style="background:none;border:none;cursor:pointer;font-size:.75rem;color:var(--green);font-weight:600;">Marquer lu</button>
              </form>
            <?php else: ?>
              <span style="width:8px;height:8px;border-radius:50%;background:var(--border);display:inline-block;"></span>
            <?php endif; ?>
            <?php if ($n['link']): ?>
              <a href="<?= h(BASE_URL . $n['link']) ?>" class="btn btn-outline btn-sm" style="font-size:.75rem;padding:.3rem .6rem;">Voir →</a>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
