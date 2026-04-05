<?php
// create-ad.php
$pageTitle = 'Publier une annonce';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$currentUser = requireLogin();
$db = getDB();

$categories = ['Électronique','Immobilier','Véhicules','Services','Emplois','Mode'];
$errors = [];

// Edit mode
$editMode = false;
$ad = null;
if (isset($_GET['id'])) {
    $editId = (int)$_GET['id'];
    $stmt = $db->prepare("SELECT * FROM ads WHERE id = ? AND author_id = ?");
    $stmt->execute([$editId, $currentUser['id']]);
    $ad = $stmt->fetch();
    if ($ad) {
        $editMode = true;
        $pageTitle = 'Modifier l\'annonce';
        $ad['images'] = getAdImages($editId);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();

    $title       = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $price       = (float)($_POST['price'] ?? 0);
    $category    = $_POST['category'] ?? '';
    $location    = trim($_POST['location'] ?? '');

    if (strlen($title) < 3)       $errors[] = 'Le titre doit comporter au moins 3 caractères.';
    if ($price <= 0)               $errors[] = 'Le prix doit être supérieur à 0.';
    if (!in_array($category, $categories)) $errors[] = 'Catégorie invalide.';
    if (strlen($location) < 2)    $errors[] = 'Veuillez indiquer une localisation.';

    // Handle image uploads
    $uploadedUrls = [];
    if (!empty($_FILES['images']['name'][0])) {
        foreach ($_FILES['images']['tmp_name'] as $k => $tmp) {
            if ($_FILES['images']['error'][$k] !== UPLOAD_ERR_OK) continue;
            $fileArr = [
                'name'     => $_FILES['images']['name'][$k],
                'type'     => $_FILES['images']['type'][$k],
                'tmp_name' => $tmp,
                'size'     => $_FILES['images']['size'][$k],
            ];
            $url = uploadImage($fileArr, 'ads');
            if ($url) $uploadedUrls[] = $url;
            if (count($uploadedUrls) >= 5) break;
        }
        if (empty($uploadedUrls) && !$editMode) $errors[] = 'Impossible de téléverser les images.';
    }

    if (empty($errors)) {
        if ($editMode && $ad) {
            $db->prepare("UPDATE ads SET title=?, description=?, price=?, category=?, location=?, author_name=? WHERE id=?")
               ->execute([$title, $description, $price, $category, $location, $currentUser['display_name'], $ad['id']]);

            if (!empty($uploadedUrls)) {
                $db->prepare("DELETE FROM ad_images WHERE ad_id=?")->execute([$ad['id']]);
                $insImg = $db->prepare("INSERT INTO ad_images (ad_id, url, sort_order) VALUES (?,?,?)");
                foreach ($uploadedUrls as $i => $url) $insImg->execute([$ad['id'], $url, $i]);
            }
            flash('success', 'Annonce mise à jour !');
            header('Location: ' . BASE_URL . '/ad.php?id=' . $ad['id']);
        } else {
            $stmt = $db->prepare("INSERT INTO ads (title, description, price, category, location, author_id, author_name, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')");
            $stmt->execute([$title, $description, $price, $category, $location, $currentUser['id'], $currentUser['display_name']]);
            $newId = (int)$db->lastInsertId();

            $insImg = $db->prepare("INSERT INTO ad_images (ad_id, url, sort_order) VALUES (?,?,?)");
            foreach ($uploadedUrls as $i => $url) $insImg->execute([$newId, $url, $i]);

            flash('success', 'Annonce publiée avec succès !');
            header('Location: ' . BASE_URL . '/ad.php?id=' . $newId);
        }
        exit;
    }
}

$vals = [
    'title'       => $_POST['title']       ?? ($ad['title']       ?? ''),
    'description' => $_POST['description'] ?? ($ad['description'] ?? ''),
    'price'       => $_POST['price']       ?? ($ad['price']       ?? ''),
    'category'    => $_POST['category']    ?? ($ad['category']    ?? ''),
    'location'    => $_POST['location']    ?? ($ad['location']    ?? ''),
];

require_once __DIR__ . '/includes/header.php';
?>

<div style="max-width:680px;margin:0 auto;">
  <h1 class="page-title"><?= $editMode ? '✏️ Modifier l\'annonce' : '📢 Publier une annonce' ?></h1>

  <?php if ($errors): ?>
    <div class="alert alert-error" style="margin-bottom:1.25rem;border-radius:var(--radius);">
      <?php foreach ($errors as $e): ?><div>• <?= h($e) ?></div><?php endforeach; ?>
    </div>
  <?php endif; ?>

  <div class="card">
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">

      <div class="form-group">
        <label class="form-label">Titre de l'annonce *</label>
        <input class="form-control" type="text" name="title" required maxlength="200"
               value="<?= h($vals['title']) ?>" placeholder="Ex: iPhone 14 Pro 256 Go noir">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label class="form-label">Prix (FCFA) *</label>
          <input class="form-control" type="number" name="price" required min="0" step="1"
                 value="<?= h($vals['price']) ?>" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">Catégorie *</label>
          <select class="form-control" name="category" required>
            <option value="">Choisir…</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= h($cat) ?>" <?= $vals['category']===$cat?'selected':'' ?>><?= h($cat) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Localisation *</label>
        <input class="form-control" type="text" name="location" required maxlength="150"
               value="<?= h($vals['location']) ?>" placeholder="Ex: Cotonou, Bénin">
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="5"
                  placeholder="Décrivez votre article en détail : état, caractéristiques, raison de la vente…"><?= h($vals['description']) ?></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Photos <?= $editMode ? '(laisser vide pour conserver les actuelles)' : '(max 5)' ?></label>
        <?php if ($editMode && !empty($ad['images'])): ?>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;">
            <?php foreach ($ad['images'] as $img): ?>
              <img src="<?= h($img) ?>" style="width:80px;height:80px;object-fit:cover;border-radius:.5rem;border:1px solid var(--border);" referrerpolicy="no-referrer">
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
        <input class="form-control" type="file" name="images[]" accept="image/*" multiple style="padding:.45rem .75rem;">
        <div id="img-preview" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;"></div>
        <span class="form-hint">Formats acceptés : JPG, PNG, WebP. Max 5 Mo par image.</span>
      </div>

      <div style="display:flex;gap:.75rem;margin-top:.5rem;">
        <a href="<?= BASE_URL ?>/index.php" class="btn btn-outline" style="flex:1;justify-content:center;">Annuler</a>
        <button type="submit" class="btn btn-primary" style="flex:2;">
          <?= $editMode ? '💾 Enregistrer' : '🚀 Publier l\'annonce' ?>
        </button>
      </div>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
