<?php
// includes/helpers.php

function h(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function timeAgo(string $datetime): string {
    $now  = new DateTime();
    $then = new DateTime($datetime);
    $diff = $now->diff($then);
    if ($diff->days === 0) {
        if ($diff->h === 0) return "Il y a {$diff->i} min";
        return "Il y a {$diff->h}h";
    }
    if ($diff->days < 30) return "Il y a {$diff->days}j";
    if ($diff->days < 365) {
        $m = round($diff->days / 30);
        return "Il y a {$m} mois";
    }
    $y = round($diff->days / 365);
    return "Il y a {$y} an" . ($y > 1 ? 's' : '');
}

function formatPrice(float $price): string {
    return number_format($price, 0, ',', ' ') . ' FCFA';
}

function uploadImage(array $file, string $subdir = 'ads'): string|false {
    // [FIX] Extension imposee depuis le MIME reel — on n'utilise plus l'extension originale
    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    // Verification du MIME reel via finfo
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($mimeToExt[$mime])) return false;
    if ($file['size'] > MAX_FILE_SIZE) return false;

    $dir = UPLOAD_DIR . $subdir . '/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // [FIX] L'extension est dictee par le MIME, pas par le nom fourni par l'utilisateur
    $ext  = $mimeToExt[$mime];
    $name = bin2hex(random_bytes(12)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . $name)) return false;
    return UPLOAD_URL . $subdir . '/' . $name;
}

function getAdImages(int $adId): array {
    $db = getDB();
    $stmt = $db->prepare("SELECT url FROM ad_images WHERE ad_id = ? ORDER BY sort_order");
    $stmt->execute([$adId]);
    return array_column($stmt->fetchAll(), 'url');
}

function getUnreadNotifCount(int $userId): int {
    $db = getDB();
    $stmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    return (int)$stmt->fetchColumn();
}

function flash(string $key, string $message): void {
    $_SESSION['flash'][$key] = $message;
}

function getFlash(string $key): ?string {
    $msg = $_SESSION['flash'][$key] ?? null;
    unset($_SESSION['flash'][$key]);
    return $msg;
}

function csrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrf(): void {
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        http_response_code(403);
        die('Token CSRF invalide.');
    }
}

// [FIX] Verification CSRF pour les requetes JSON/AJAX (header X-CSRF-Token)
function verifyCsrfJson(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($token !== ($_SESSION['csrf_token'] ?? '')) {
        http_response_code(403);
        echo json_encode(['error' => 'Token CSRF invalide.']);
        exit;
    }
}
