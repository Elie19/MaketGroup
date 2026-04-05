<?php
// api/messages.php  — polling endpoint
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) session_start();

$user = getCurrentUser();
if (!$user) { http_response_code(401); echo json_encode([]); exit; }

$db      = getDB();
$after   = (int)($_GET['after'] ?? 0);
$chatId  = (int)($_GET['chat_id'] ?? 0);
$groupId = (int)($_GET['group_id'] ?? 0);

if ($chatId) {
    // Verify participant
    $pChk = $db->prepare("SELECT chat_id FROM chat_participants WHERE chat_id=? AND user_id=?");
    $pChk->execute([$chatId, $user['id']]);
    if (!$pChk->fetch()) { echo json_encode([]); exit; }

    $stmt = $db->prepare("SELECT * FROM messages WHERE chat_id=? AND id>? ORDER BY created_at ASC LIMIT 50");
    $stmt->execute([$chatId, $after]);
} elseif ($groupId) {
    // Verify member
    $mChk = $db->prepare("SELECT group_id FROM group_members WHERE group_id=? AND user_id=?");
    $mChk->execute([$groupId, $user['id']]);
    if (!$mChk->fetch()) { echo json_encode([]); exit; }

    $stmt = $db->prepare("SELECT * FROM messages WHERE group_id=? AND id>? ORDER BY created_at ASC LIMIT 50");
    $stmt->execute([$groupId, $after]);
} else {
    echo json_encode([]); exit;
}

$messages = $stmt->fetchAll();
$result = array_map(function($m) use ($user) {
    return [
        'id'           => $m['id'],
        'text_content' => $m['text_content'],
        'sender_name'  => $m['sender_name'],
        'is_mine'      => $m['sender_id'] == $user['id'],
        'time_ago'     => timeAgo($m['created_at']),
    ];
}, $messages);

echo json_encode($result);
