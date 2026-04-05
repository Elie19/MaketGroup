<?php
// register.php
$pageTitle = 'Inscription';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

if (isLoggedIn()) {
    header('Location: ' . BASE_URL . '/index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $name     = trim($_POST['name'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm  = $_POST['confirm'] ?? '';

    if (strlen($name) < 2) {
        $error = 'Le nom doit comporter au moins 2 caracteres.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Adresse email invalide.';
    } elseif ($password !== $confirm) {
        $error = 'Les mots de passe ne correspondent pas.';
    } else {
        // [FIX] Utiliser la fonction de validation centralisee (min 8, majuscule, chiffre)
        $pwError = validatePassword($password);
        if ($pwError) {
            $error = $pwError;
        } else {
            $result = register($name, $email, $password);
            if ($result === true) {
                flash('success', 'Compte cree avec succes ! Bienvenue !');
                header('Location: ' . BASE_URL . '/index.php');
                exit;
            } else {
                $error = $result;
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>
<div class="auth-wrap">
  <div class="auth-logo">
    <div class="brand-icon"></div>
    <h1 style="font-size:1.5rem;font-weight:800;">MaketGroup</h1>
    <p style="color:var(--muted);font-size:.9rem;margin-top:.25rem;">Creez votre compte gratuitement</p>
  </div>

  <div class="card">
    <?php if ($error): ?>
      <div class="alert alert-error" style="margin:-1.5rem -1.5rem 1.25rem;border-radius:var(--radius) var(--radius) 0 0;"><?= h($error) ?></div>
    <?php endif; ?>

    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <div class="form-group">
        <label class="form-label">Nom d'affichage</label>
        <input class="form-control" type="text" name="name" required autofocus value="<?= h($_POST['name'] ?? '') ?>">
      </div>
      <div class="form-group">
        <label class="form-label">Adresse email</label>
        <input class="form-control" type="email" name="email" required value="<?= h($_POST['email'] ?? '') ?>">
      </div>
      <div class="form-group">
        <label class="form-label">Mot de passe</label>
        <!-- [FIX] minlength=8, pattern enforcing majuscule + chiffre -->
        <input class="form-control" type="password" name="password" required
               minlength="8"
               pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
               title="Min. 8 caracteres, une majuscule et un chiffre">
        <span class="form-hint">Min. 8 caracteres, une majuscule et un chiffre</span>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmer le mot de passe</label>
        <input class="form-control" type="password" name="confirm" required>
      </div>
      <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem;">Creer mon compte</button>
    </form>

    <p style="text-align:center;margin-top:1.25rem;font-size:.9rem;color:var(--muted);">
      Deja un compte ? <a href="<?= BASE_URL ?>/login.php" style="color:var(--green);font-weight:600;">Se connecter</a>
    </p>
  </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
