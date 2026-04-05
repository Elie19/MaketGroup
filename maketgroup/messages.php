<?php
// messages.php
$pageTitle = 'Messagerie';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$currentUser = requireLogin();
$db = getDB();

// Start or open a chat with a specific user
if (isset($_GET['user'])) {
    $targetId = (int)$_GET['user'];
    if ($targetId && $targetId !== $currentUser['id']) {
        // Find existing chat between these 2 users
        $existStmt = $db->prepare(
            "SELECT c.id FROM chats c
             JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
             JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
             WHERE (SELECT COUNT(*) FROM chat_participants WHERE chat_id = c.id) = 2
             LIMIT 1"
        );
        $existStmt->execute([$currentUser['id'], $targetId]);
        $existing = $existStmt->fetch();

        if ($existing) {
            header('Location: ' . BASE_URL . '/messages.php?chat=' . $existing['id']);
        } else {
            $db->prepare("INSERT INTO chats (updated_at) VALUES (NOW())")->execute();
            $chatId = $db->lastInsertId();
            $db->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?,?),(?,?)")
               ->execute([$chatId, $currentUser['id'], $chatId, $targetId]);
            header('Location: ' . BASE_URL . '/messages.php?chat=' . $chatId);
        }
        exit;
    }
}

// Send message
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'send') {
    verifyCsrf();
    $chatId = (int)($_POST['chat_id'] ?? 0);
    $text   = trim($_POST['text'] ?? '');

    if ($chatId && $text) {
        // Verify user is participant
        $partChk = $db->prepare("SELECT chat_id FROM chat_participants WHERE chat_id=? AND user_id=?");
        $partChk->execute([$chatId, $currentUser['id']]);
        if ($partChk->fetch()) {
            $db->prepare("INSERT INTO messages (chat_id, sender_id, sender_name, sender_photo, text_content) VALUES (?,?,?,?,?)")
               ->execute([$chatId, $currentUser['id'], $currentUser['display_name'], $currentUser['photo_url'], $text]);
            $db->prepare("UPDATE chats SET updated_at=NOW() WHERE id=?")->execute([$chatId]);
        }
    }
    header('Location: ' . BASE_URL . '/messages.php?chat=' . $chatId . '#chat-bottom');
    exit;
}

// Load conversations list
$convStmt = $db->prepare(
    "SELECT c.id, c.updated_at,
        (SELECT m.text_content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_msg,
        (SELECT u.display_name FROM chat_participants cp2
            JOIN users u ON u.id = cp2.user_id
            WHERE cp2.chat_id = c.id AND cp2.user_id != ? LIMIT 1) AS other_name,
        (SELECT u.photo_url FROM chat_participants cp2
            JOIN users u ON u.id = cp2.user_id
            WHERE cp2.chat_id = c.id AND cp2.user_id != ? LIMIT 1) AS other_photo,
        (SELECT cp2.user_id FROM chat_participants cp2
            WHERE cp2.chat_id = c.id AND cp2.user_id != ? LIMIT 1) AS other_id
     FROM chats c
     JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = ?
     ORDER BY c.updated_at DESC"
);
$convStmt->execute([$currentUser['id'], $currentUser['id'], $currentUser['id'], $currentUser['id']]);
$conversations = $convStmt->fetchAll();

// Active chat
$activeChatId = (int)($_GET['chat'] ?? 0);
$chatMessages = [];
$otherUser    = null;

if ($activeChatId) {
    // Verify membership
    $pChk = $db->prepare("SELECT chat_id FROM chat_participants WHERE chat_id=? AND user_id=?");
    $pChk->execute([$activeChatId, $currentUser['id']]);
    if ($pChk->fetch()) {
        $mStmt = $db->prepare("SELECT * FROM messages WHERE chat_id=? ORDER BY created_at ASC LIMIT 100");
        $mStmt->execute([$activeChatId]);
        $chatMessages = $mStmt->fetchAll();

        $oStmt = $db->prepare("SELECT u.* FROM chat_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.chat_id=? AND cp.user_id!=?");
        $oStmt->execute([$activeChatId, $currentUser['id']]);
        $otherUser = $oStmt->fetch();
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<h1 class="page-title">Messagerie</h1>

<div class="chat-layout">
  <!-- Conversations list -->
  <div class="chat-list">
    <?php if (empty($conversations)): ?>
      <div style="padding:2rem;text-align:center;color:var(--muted);font-size:.9rem;">
        <div style="font-size:2rem;margin-bottom:.5rem;">💬</div>
        Aucune conversation.<br>Visitez un profil ou une annonce pour démarrer.
      </div>
    <?php else: ?>
      <?php foreach ($conversations as $conv): ?>
        <a href="<?= BASE_URL ?>/messages.php?chat=<?= $conv['id'] ?>" class="chat-list-item <?= $conv['id']==$activeChatId?'active':'' ?>" style="text-decoration:none;">
          <div class="chat-list-avatar">
            <?php if ($conv['other_photo']): ?>
              <img src="<?= h($conv['other_photo']) ?>" alt="avatar" referrerpolicy="no-referrer">
            <?php else: ?>
              <?= strtoupper(substr($conv['other_name'] ?? 'U', 0, 1)) ?>
            <?php endif; ?>
          </div>
          <div class="chat-list-info">
            <div class="chat-list-name"><?= h($conv['other_name'] ?? 'Utilisateur') ?></div>
            <div class="chat-list-preview"><?= h($conv['last_msg'] ?? 'Nouvelle conversation') ?></div>
          </div>
          <div style="font-size:.7rem;color:var(--muted);flex-shrink:0;margin-left:auto;"><?= timeAgo($conv['updated_at']) ?></div>
        </a>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <!-- Chat window -->
  <?php if ($activeChatId && $otherUser): ?>
    <div class="chat-window">
      <div class="chat-header" style="display:flex;align-items:center;gap:.75rem;">
        <div class="chat-list-avatar" style="width:36px;height:36px;font-size:.85rem;">
          <?php if ($otherUser['photo_url']): ?>
            <img src="<?= h($otherUser['photo_url']) ?>" alt="avatar" referrerpolicy="no-referrer">
          <?php else: ?>
            <?= strtoupper(substr($otherUser['display_name'] ?? 'U', 0, 1)) ?>
          <?php endif; ?>
        </div>
        <div>
          <div style="font-weight:700;"><?= h($otherUser['display_name'] ?? '') ?></div>
          <a href="<?= BASE_URL ?>/profile.php?id=<?= $otherUser['id'] ?>" style="font-size:.78rem;color:var(--green);">Voir le profil</a>
        </div>
      </div>

      <div class="chat-messages" id="chat-messages">
        <?php if (empty($chatMessages)): ?>
          <div style="text-align:center;color:var(--muted);padding:2rem;font-size:.9rem;">
            Début de votre conversation avec <?= h($otherUser['display_name'] ?? '') ?>
          </div>
        <?php else: ?>
          <?php foreach ($chatMessages as $msg):
            $mine = $msg['sender_id'] == $currentUser['id'];
          ?>
            <div>
              <div class="msg <?= $mine?'mine':'theirs' ?>"><?= h($msg['text_content']) ?></div>
              <div class="msg-meta" style="text-align:<?= $mine?'right':'left' ?>;">
                <?= $mine ? 'Vous' : h($msg['sender_name']) ?> · <?= timeAgo($msg['created_at']) ?>
              </div>
            </div>
          <?php endforeach; ?>
        <?php endif; ?>
        <div id="chat-bottom"></div>
      </div>

      <form method="POST" class="chat-input">
        <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
        <input type="hidden" name="action" value="send">
        <input type="hidden" name="chat_id" value="<?= $activeChatId ?>">
        <input class="form-control" type="text" name="text" placeholder="Écrire un message…" required autocomplete="off" id="msg-input">
        <button type="submit" class="btn btn-primary">Envoyer</button>
      </form>
    </div>
  <?php else: ?>
    <div style="display:flex;align-items:center;justify-content:center;color:var(--muted);">
      <div style="text-align:center;">
        <div style="font-size:3rem;margin-bottom:.75rem;">💬</div>
        <h3 style="font-weight:600;margin-bottom:.4rem;">Sélectionnez une conversation</h3>
        <p style="font-size:.9rem;">ou démarrez-en une depuis un profil.</p>
      </div>
    </div>
  <?php endif; ?>
</div>

<script>
const chatBottom = document.getElementById('chat-bottom');
if (chatBottom) chatBottom.scrollIntoView({ behavior: 'smooth' });
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
