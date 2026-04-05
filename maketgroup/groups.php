<?php
// groups.php
$pageTitle = 'Groupes';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$db = getDB();
$currentUser = getCurrentUser();

$groupCategories = ['Général','Électronique','Immobilier','Véhicules','Services','Emplois','Mode'];
$filterCat = $_GET['category'] ?? '';

// Handle actions
if ($currentUser && $_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'create_group') {
        $name     = trim($_POST['name'] ?? '');
        $desc     = trim($_POST['description'] ?? '');
        $cat      = $_POST['category'] ?? 'Général';
        $photoUrl = null;
        if (!empty($_FILES['photo']['tmp_name'])) {
            $photoUrl = uploadImage($_FILES['photo'], 'groups');
        }
        if (strlen($name) >= 2) {
            $db->prepare("INSERT INTO groups_chat (name, description, category, admin_id, photo_url) VALUES (?,?,?,?,?)")
               ->execute([$name, $desc, $cat, $currentUser['id'], $photoUrl]);
            $gid = $db->lastInsertId();
            $db->prepare("INSERT INTO group_members (group_id, user_id) VALUES (?,?)")->execute([$gid, $currentUser['id']]);
            flash('success', "Groupe \"$name\" créé !");
        }
        header('Location: ' . BASE_URL . '/groups.php');
        exit;
    }

    if ($action === 'join') {
        $gid = (int)($_POST['group_id'] ?? 0);
        $check = $db->prepare("SELECT group_id FROM group_members WHERE group_id=? AND user_id=?");
        $check->execute([$gid, $currentUser['id']]);
        if (!$check->fetch()) {
            $db->prepare("INSERT INTO group_members (group_id, user_id) VALUES (?,?)")->execute([$gid, $currentUser['id']]);
        }
        header('Location: ' . BASE_URL . '/groups.php?chat=' . $gid);
        exit;
    }

    if ($action === 'leave') {
        $gid = (int)($_POST['group_id'] ?? 0);
        $db->prepare("DELETE FROM group_members WHERE group_id=? AND user_id=?")->execute([$gid, $currentUser['id']]);
        header('Location: ' . BASE_URL . '/groups.php');
        exit;
    }

    if ($action === 'send_msg') {
        $gid  = (int)($_POST['group_id'] ?? 0);
        $text = trim($_POST['text'] ?? '');
        if ($text && $gid) {
            // Verify membership
            $mem = $db->prepare("SELECT group_id FROM group_members WHERE group_id=? AND user_id=?");
            $mem->execute([$gid, $currentUser['id']]);
            if ($mem->fetch()) {
                $db->prepare("INSERT INTO messages (group_id, sender_id, sender_name, sender_photo, text_content) VALUES (?,?,?,?,?)")
                   ->execute([$gid, $currentUser['id'], $currentUser['display_name'], $currentUser['photo_url'], $text]);
            }
        }
        header('Location: ' . BASE_URL . '/groups.php?chat=' . $gid . '#chat-bottom');
        exit;
    }
}

// Active chat group
$activeChatId = (int)($_GET['chat'] ?? 0);
$activeGroup  = null;
$chatMessages = [];
$isMember     = false;

if ($activeChatId) {
    $gStmt = $db->prepare("SELECT g.*, (SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id) AS member_count FROM groups_chat g WHERE g.id=?");
    $gStmt->execute([$activeChatId]);
    $activeGroup = $gStmt->fetch();

    if ($activeGroup && $currentUser) {
        $mChk = $db->prepare("SELECT group_id FROM group_members WHERE group_id=? AND user_id=?");
        $mChk->execute([$activeChatId, $currentUser['id']]);
        $isMember = (bool)$mChk->fetch();

        if ($isMember) {
            $mStmt = $db->prepare("SELECT * FROM messages WHERE group_id=? ORDER BY created_at ASC LIMIT 100");
            $mStmt->execute([$activeChatId]);
            $chatMessages = $mStmt->fetchAll();
        }
    }
}

// Load groups
$where  = [];
$params = [];
if ($filterCat) { $where[] = "g.category = ?"; $params[] = $filterCat; }

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
$gStmt = $db->prepare("SELECT g.*, (SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id) AS member_count FROM groups_chat g $whereSQL ORDER BY g.created_at DESC");
$gStmt->execute($params);
$groups = $gStmt->fetchAll();

// Which groups does current user belong to?
$myGroupIds = [];
if ($currentUser) {
    $mgStmt = $db->prepare("SELECT group_id FROM group_members WHERE user_id=?");
    $mgStmt->execute([$currentUser['id']]);
    $myGroupIds = array_column($mgStmt->fetchAll(), 'group_id');
}

require_once __DIR__ . '/includes/header.php';
?>

<div style="display:grid;grid-template-columns:<?= $activeChatId?'1fr 420px':'1fr' ?>;gap:2rem;align-items:start;">

  <!-- Groups List -->
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <h1 class="page-title" style="margin:0;">Groupes</h1>
      <?php if ($currentUser): ?>
        <button onclick="document.getElementById('create-modal').style.display='flex'" class="btn btn-primary btn-sm">+ Créer un groupe</button>
      <?php endif; ?>
    </div>

    <!-- Category filter -->
    <div class="categories" style="margin-bottom:1.5rem;">
      <a href="?<?= $activeChatId?"chat=$activeChatId":'' ?>" class="cat-btn <?= !$filterCat?'active':'' ?>">Tous</a>
      <?php foreach ($groupCategories as $cat): ?>
        <a href="?category=<?= urlencode($cat) ?><?= $activeChatId?"&chat=$activeChatId":'' ?>" class="cat-btn <?= $filterCat===$cat?'active':'' ?>"><?= h($cat) ?></a>
      <?php endforeach; ?>
    </div>

    <?php if (empty($groups)): ?>
      <div class="empty-state">
        <svg width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3>Aucun groupe trouvé</h3>
        <?php if ($currentUser): ?><p><button onclick="document.getElementById('create-modal').style.display='flex'" class="btn btn-primary btn-sm" style="margin-top:.75rem;">Créer le premier groupe</button></p><?php endif; ?>
      </div>
    <?php else: ?>
      <div class="groups-grid">
        <?php foreach ($groups as $g):
          $joined = in_array($g['id'], $myGroupIds);
        ?>
          <div class="group-card">
            <?php if ($g['photo_url']): ?>
              <div class="group-thumb"><img src="<?= h($g['photo_url']) ?>" alt="<?= h($g['name']) ?>" referrerpolicy="no-referrer"></div>
            <?php else: ?>
              <div class="group-thumb" style="background:linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.05));display:flex;align-items:center;justify-content:center;">
                <span style="font-size:2rem;">👥</span>
              </div>
            <?php endif; ?>
            <div class="group-cat"><?= h($g['category'] ?? '') ?></div>
            <div class="group-name"><?= h($g['name']) ?></div>
            <?php if ($g['description']): ?>
              <p style="font-size:.85rem;color:var(--muted);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;"><?= h($g['description']) ?></p>
            <?php endif; ?>
            <div class="group-members">👥 <?= $g['member_count'] ?> membre<?= $g['member_count']>1?'s':'' ?></div>

            <div style="display:flex;gap:.5rem;margin-top:auto;">
              <?php if ($joined): ?>
                <a href="?chat=<?= $g['id'] ?>" class="btn btn-outline btn-sm" style="flex:1;justify-content:center;">💬 Ouvrir</a>
                <?php if ($currentUser['id'] != $g['admin_id']): ?>
                  <form method="POST" style="flex:0;">
                    <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                    <input type="hidden" name="action" value="leave">
                    <input type="hidden" name="group_id" value="<?= $g['id'] ?>">
                    <button type="submit" class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);">Quitter</button>
                  </form>
                <?php endif; ?>
              <?php elseif ($currentUser): ?>
                <form method="POST" style="flex:1;">
                  <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
                  <input type="hidden" name="action" value="join">
                  <input type="hidden" name="group_id" value="<?= $g['id'] ?>">
                  <button type="submit" class="btn btn-primary btn-sm btn-full">Rejoindre</button>
                </form>
              <?php else: ?>
                <a href="<?= BASE_URL ?>/login.php" class="btn btn-outline btn-sm" style="flex:1;justify-content:center;">Se connecter</a>
              <?php endif; ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

  <!-- Chat Panel -->
  <?php if ($activeChatId && $activeGroup): ?>
  <div style="position:sticky;top:80px;">
    <div class="card" style="padding:0;overflow:hidden;">
      <!-- Header -->
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700;"><?= h($activeGroup['name']) ?></div>
          <div style="font-size:.8rem;color:var(--muted);"><?= $activeGroup['member_count'] ?> membres</div>
        </div>
        <a href="<?= BASE_URL ?>/groups.php" style="color:var(--muted);font-size:1.2rem;text-decoration:none;">✕</a>
      </div>

      <?php if (!$isMember): ?>
        <div style="padding:2rem;text-align:center;color:var(--muted);">
          <p style="margin-bottom:1rem;">Rejoignez ce groupe pour participer à la conversation.</p>
          <form method="POST">
            <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
            <input type="hidden" name="action" value="join">
            <input type="hidden" name="group_id" value="<?= $activeChatId ?>">
            <button type="submit" class="btn btn-primary">Rejoindre le groupe</button>
          </form>
        </div>
      <?php elseif (!$currentUser): ?>
        <div style="padding:2rem;text-align:center;color:var(--muted);">
          <a href="<?= BASE_URL ?>/login.php" class="btn btn-primary">Se connecter pour discuter</a>
        </div>
      <?php else: ?>
        <!-- Messages -->
        <div style="height:380px;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.5rem;" id="chat-messages">
          <?php if (empty($chatMessages)): ?>
            <div style="text-align:center;color:var(--muted);padding:2rem 0;font-size:.9rem;">Aucun message. Soyez le premier !</div>
          <?php else: ?>
            <?php foreach ($chatMessages as $msg):
              $mine = $currentUser && $msg['sender_id'] == $currentUser['id'];
            ?>
              <div class="msg <?= $mine?'mine':'theirs' ?>">
                <?= h($msg['text_content']) ?>
                <div class="msg-meta"><?= h($msg['sender_name']) ?> · <?= timeAgo($msg['created_at']) ?></div>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
          <div id="chat-bottom"></div>
        </div>

        <!-- Input -->
        <form method="POST" style="padding:.75rem;border-top:1px solid var(--border);display:flex;gap:.5rem;">
          <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
          <input type="hidden" name="action" value="send_msg">
          <input type="hidden" name="group_id" value="<?= $activeChatId ?>">
          <input class="form-control" type="text" name="text" placeholder="Écrire un message…" required autocomplete="off" style="border-radius:50px;">
          <button type="submit" class="btn btn-primary btn-sm">Envoyer</button>
        </form>
      <?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</div>

<!-- Create Group Modal -->
<?php if ($currentUser): ?>
<div id="create-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);">
  <div class="card" style="width:100%;max-width:480px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
      <h2 style="font-size:1.2rem;font-weight:800;">Créer un groupe</h2>
      <button onclick="document.getElementById('create-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--muted);">✕</button>
    </div>
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="create_group">
      <div class="form-group">
        <label class="form-label">Nom du groupe *</label>
        <input class="form-control" type="text" name="name" required placeholder="Ex: Passionnés d'électronique">
      </div>
      <div class="form-group">
        <label class="form-label">Catégorie</label>
        <select class="form-control" name="category">
          <?php foreach ($groupCategories as $cat): ?>
            <option value="<?= h($cat) ?>"><?= h($cat) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="3" placeholder="Décrivez le but de ce groupe…"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Photo du groupe (optionnel)</label>
        <input class="form-control" type="file" name="photo" accept="image/*" style="padding:.45rem .75rem;">
      </div>
      <div style="display:flex;gap:.75rem;">
        <button type="button" onclick="document.getElementById('create-modal').style.display='none'" class="btn btn-outline" style="flex:1;">Annuler</button>
        <button type="submit" class="btn btn-primary" style="flex:2;">Créer le groupe</button>
      </div>
    </form>
  </div>
</div>
<?php endif; ?>

<script>
// Auto-scroll to bottom of chat
const chatBottom = document.getElementById('chat-bottom');
if (chatBottom) chatBottom.scrollIntoView();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
