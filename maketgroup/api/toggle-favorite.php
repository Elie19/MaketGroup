<?php
// api/toggle-favorite.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) session_start();

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Non autorise']);
    exit;
}

// [FIX] Verification CSRF sur les endpoints AJAX
verifyCsrfJson();

$data = json_decode(file_get_contents('php://input'), true);
$adId = (int)($data['ad_id'] ?? 0);

if (!$adId) {
    http_response_code(400);
    echo json_encode(['error' => 'ad_id manquant']);
    exit;
}

$db = getDB();

$stmt = $db->prepare("SELECT id FROM favorites WHERE user_id=? AND ad_id=?");
$stmt->execute([$user['id'], $adId]);
$exists = $stmt->fetch();

if ($exists) {
    $db->prepare("DELETE FROM favorites WHERE user_id=? AND ad_id=?")->execute([$user['id'], $adId]);
    $db->prepare("UPDATE ads SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id=?")->execute([$adId]);
    echo json_encode(['favorited' => false]);
} else {
    $db->prepare("INSERT IGNORE INTO favorites (user_id, ad_id) VALUES (?,?)")->execute([$user['id'], $adId]);
    $db->prepare("UPDATE ads SET favorites_count = favorites_count + 1 WHERE id=?")->execute([$adId]);
    echo json_encode(['favorited' => true]);
}
