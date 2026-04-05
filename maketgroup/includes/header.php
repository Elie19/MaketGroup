<?php
// includes/header.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';

$currentUser  = getCurrentUser();
$unreadNotifs = $currentUser ? getUnreadNotifCount($currentUser['id']) : 0;
$currentPage  = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="fr" id="html-root">
<head>
<meta charset="UTF-8">
<meta name="base-url" content="<?= BASE_URL ?>">
<meta name="csrf-token" content="<?= csrfToken() ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= h($pageTitle ?? 'MaketGroup') ?> — MaketGroup</title>
<link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/style.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

<nav class="navbar">
  <div class="nav-inner">
    <a href="<?= BASE_URL ?>/index.php" class="nav-brand">
      <span class="brand-icon"></span>
      MaketGroup
    </a>

    <div class="nav-search-wrap">
      <form method="GET" action="<?= BASE_URL ?>/index.php" class="nav-search">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" name="search" placeholder="Rechercher…" value="<?= h($_GET['search'] ?? '') ?>">
      </form>
    </div>

    <div class="nav-links">
      <a href="<?= BASE_URL ?>/index.php" class="nav-link <?= $currentPage==='index.php'?'active':'' ?>">Accueil</a>
      <a href="<?= BASE_URL ?>/groups.php" class="nav-link <?= $currentPage==='groups.php'?'active':'' ?>">Groupes</a>
      <?php if ($currentUser): ?>
        <a href="<?= BASE_URL ?>/messages.php" class="nav-link <?= $currentPage==='messages.php'?'active':'' ?>">Messages</a>
        <a href="<?= BASE_URL ?>/create-ad.php" class="btn btn-primary btn-sm">+ Publier</a>
        <a href="<?= BASE_URL ?>/notifications.php" class="nav-icon-btn <?= $unreadNotifs>0?'has-badge':'' ?>" title="Notifications">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <?php if ($unreadNotifs > 0): ?><span class="badge"><?= $unreadNotifs ?></span><?php endif; ?>
        </a>
        <a href="<?= BASE_URL ?>/profile.php" class="nav-avatar" title="Mon profil">
          <?php if ($currentUser['photo_url']): ?>
            <img src="<?= h($currentUser['photo_url']) ?>" alt="avatar">
          <?php else: ?>
            <span><?= strtoupper(substr($currentUser['display_name'] ?? 'U', 0, 1)) ?></span>
          <?php endif; ?>
        </a>
        <?php if (isAdmin()): ?>
          <a href="<?= BASE_URL ?>/admin.php" class="nav-link">Admin</a>
        <?php endif; ?>
        <a href="<?= BASE_URL ?>/logout.php" class="nav-link muted">Déconnexion</a>
      <?php else: ?>
        <a href="<?= BASE_URL ?>/login.php" class="nav-link">Connexion</a>
        <a href="<?= BASE_URL ?>/register.php" class="btn btn-primary btn-sm">S'inscrire</a>
      <?php endif; ?>

      <button onclick="toggleTheme()" class="nav-icon-btn theme-toggle" title="Thème">
        <svg class="icon-sun" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
    </div>

    <button class="nav-hamburger" onclick="toggleMenu()">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<?php
$flash_success = getFlash('success');
$flash_error   = getFlash('error');
if ($flash_success): ?>
  <div class="alert alert-success"><?= h($flash_success) ?></div>
<?php endif; ?>
<?php if ($flash_error): ?>
  <div class="alert alert-error"><?= h($flash_error) ?></div>
<?php endif; ?>

<main class="main-content">
