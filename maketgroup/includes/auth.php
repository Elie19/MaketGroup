<?php
// includes/auth.php

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function getCurrentUser(): ?array {
    if (!isset($_SESSION['user_id'])) return null;
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function requireLogin(): array {
    $user = getCurrentUser();
    if (!$user) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
    // [FIX] Bloquer les comptes bannis partout dans l'app
    if ($user['role'] === 'banned') {
        session_destroy();
        header('Location: ' . BASE_URL . '/login.php?banned=1');
        exit;
    }
    return $user;
}

function requireAdmin(): array {
    $user = requireLogin();
    if ($user['role'] !== 'admin') {
        header('Location: ' . BASE_URL . '/index.php');
        exit;
    }
    return $user;
}

function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

function isAdmin(): bool {
    $user = getCurrentUser();
    return $user && $user['role'] === 'admin';
}

// [FIX] Protection brute-force : max 10 tentatives / 15 min par IP+email
function checkLoginRateLimit(string $email): bool {
    $db  = getDB();
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $ip . '|' . strtolower($email));

    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM login_attempts
         WHERE attempt_key = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
    );
    $stmt->execute([$key]);
    return (int)$stmt->fetchColumn() >= 10;
}

function recordLoginAttempt(string $email): void {
    $db  = getDB();
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $ip . '|' . strtolower($email));
    $db->prepare("INSERT INTO login_attempts (attempt_key, attempted_at) VALUES (?, NOW())")
       ->execute([$key]);
    // Purger les anciennes tentatives (> 1h) pour garder la table legere
    $db->exec("DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
}

function clearLoginAttempts(string $email): void {
    $db  = getDB();
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $ip . '|' . strtolower($email));
    $db->prepare("DELETE FROM login_attempts WHERE attempt_key = ?")->execute([$key]);
}

// [FIX] Politique de mot de passe renforcee (min 8 car., 1 majuscule, 1 chiffre)
function validatePassword(string $password): ?string {
    if (strlen($password) < 8) {
        return 'Le mot de passe doit comporter au moins 8 caracteres.';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return 'Le mot de passe doit contenir au moins une majuscule.';
    }
    if (!preg_match('/[0-9]/', $password)) {
        return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    return null;
}

function login(string $email, string $password): bool|string {
    // [FIX] Verification du rate-limit avant toute requete
    if (checkLoginRateLimit($email)) {
        return 'Trop de tentatives. Reessayez dans 15 minutes.';
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // [FIX] Verification du bannissement
        if ($user['role'] === 'banned') {
            return 'Votre compte a ete suspendu. Contactez le support.';
        }
        // [FIX] Regenerer l'ID de session pour eviter la fixation de session
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        clearLoginAttempts($email);
        return true;
    }

    recordLoginAttempt($email);
    return false;
}

function register(string $displayName, string $email, string $password): bool|string {
    $db   = getDB();
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) return 'Cet email est deja utilise.';

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO users (display_name, email, password) VALUES (?, ?, ?)");
    $stmt->execute([$displayName, $email, $hash]);

    // [FIX] Regenerer la session aussi a l'inscription
    session_regenerate_id(true);
    $_SESSION['user_id'] = $db->lastInsertId();
    return true;
}

function logout(): void {
    session_destroy();
    header('Location: ' . BASE_URL . '/login.php');
    exit;
}
