<?php
// login.php
$pageTitle = 'Connexion';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

if (isLoggedIn()) {
    header('Location: ' . BASE_URL . '/index.php');
    exit;
}

$error = '';

// [FIX] Afficher le message de bannissement transmis par requireLogin()
if (isset($_GET['banned'])) {
    $error = 'Votre compte a ete suspendu. Contactez le support.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $result = login($email, $password);

    if ($result === true) {
        flash('success', 'Bienvenue !');
        header('Location: ' . BASE_URL . '/index.php');
        exit;
    } else {
        // login() retourne false ou un string d'erreur
        $error = $result === false
            ? 'Email ou mot de passe incorrect.'
            : $result;
    }
}

require_once __DIR__ . '/includes/header.php';
?>
<div class="auth-wrap">
  <div class="auth-logo">
    <div class="brand-icon"></div>
    <h1 style="font-size:1.5rem;font-weight:800;">MaketGroup</h1>
    <p style="color:var(--muted);font-size:.9rem;margin-top:.25rem;">Connectez-vous a votre compte</p>
  </div>

  <div class="card">
    <?php if ($error): ?>
      <div class="alert alert-error" style="margin:-1.5rem -1.5rem 1.25rem;border-radius:var(--radius) var(--radius) 0 0;"><?= h($error) ?></div>
    <?php endif; ?>

    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <div class="form-group">
        <label class="form-label">Adresse email</label>
        <input class="form-control" type="email" name="email" required autofocus value="<?= h($_POST['email'] ?? '') ?>">
      </div>
      <div class="form-group">
        <label class="form-label">Mot de passe</label>
        <input class="form-control" type="password" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem;">Se connecter</button>
    </form>

    <p style="text-align:center;margin-top:1.25rem;font-size:.9rem;color:var(--muted);">
      Pas encore de compte ? <a href="<?= BASE_URL ?>/register.php" style="color:var(--green);font-weight:600;">S'inscrire</a>
    </p>
  </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
