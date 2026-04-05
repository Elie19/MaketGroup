<?php
// api/send-message.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) session_start();

$user = getCurrentUser();
if (!$user) { http_response_code(401); echo json_encode(['error' => 'Non autorise']); exit; }

// [FIX] Verification CSRF sur les endpoints AJAX
verifyCsrfJson();

// [FIX] Rate-limiting : max 30 messages par minute par utilisateur
$db = getDB();
$rateSql = "SELECT COUNT(*) FROM messages
            WHERE sender_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)";
$rateStmt = $db->prepare($rateSql);
$rateStmt->execute([$user['id']]);
if ((int)$rateStmt->fetchColumn() >= 30) {
    http_response_code(429);
    echo json_encode(['error' => 'Trop de messages. Attendez un moment.']);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true);
$text    = trim($data['text'] ?? '');
$chatId  = (int)($data['chat_id'] ?? 0);
$groupId = (int)($data['group_id'] ?? 0);

if (!$text) { http_response_code(400); echo json_encode(['error' => 'Message vide']); exit; }

// [FIX] Limiter la longueur du message a 2000 caracteres
if (mb_strlen($text) > 2000) {
    http_response_code(400);
    echo json_encode(['error' => 'Message trop long (max 2000 caracteres).']);
    exit;
}

if ($chatId) {
    $pChk = $db->prepare("SELECT chat_id FROM chat_participants WHERE chat_id=? AND user_id=?");
    $pChk->execute([$chatId, $user['id']]);
    if (!$pChk->fetch()) { http_response_code(403); echo json_encode(['error' => 'Acces refuse']); exit; }

    $db->prepare("INSERT INTO messages (chat_id, sender_id, sender_name, sender_photo, text_content) VALUES (?,?,?,?,?)")
       ->execute([$chatId, $user['id'], $user['display_name'], $user['photo_url'], $text]);
    $db->prepare("UPDATE chats SET updated_at=NOW() WHERE id=?")->execute([$chatId]);

} elseif ($groupId) {
    $mChk = $db->prepare("SELECT group_id FROM group_members WHERE group_id=? AND user_id=?");
    $mChk->execute([$groupId, $user['id']]);
    if (!$mChk->fetch()) { http_response_code(403); echo json_encode(['error' => 'Acces refuse']); exit; }

    $db->prepare("INSERT INTO messages (group_id, sender_id, sender_name, sender_photo, text_content) VALUES (?,?,?,?,?)")
       ->execute([$groupId, $user['id'], $user['display_name'], $user['photo_url'], $text]);
} else {
    http_response_code(400); echo json_encode(['error' => 'chat_id ou group_id requis']); exit;
}

echo json_encode(['ok' => true]);
