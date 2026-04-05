<?php
// index.php
$pageTitle = 'Accueil';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

$db = getDB();
$currentUser = getCurrentUser();

$categories = ['Tous','Électronique','Immobilier','Véhicules','Services','Emplois','Mode'];

$search   = trim($_GET['search']   ?? '');
$category = trim($_GET['category'] ?? 'Tous');
$page     = max(1, (int)($_GET['page'] ?? 1));
$perPage  = 12;
$offset   = ($page - 1) * $perPage;

// Build query
$where  = ["a.status = 'active'"];
$params = [];

if ($search) {
    $where[]  = "(a.title LIKE ? OR a.description LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}
if ($category && $category !== 'Tous') {
    $where[]  = "a.category = ?";
    $params[] = $category;
}

$whereSQL = implode(' AND ', $where);

$countStmt = $db->prepare("SELECT COUNT(*) FROM ads a WHERE $whereSQL");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();
$totalPages = (int)ceil($total / $perPage);

$stmt = $db->prepare("SELECT a.*, GROUP_CONCAT(ai.url ORDER BY ai.sort_order SEPARATOR '|') AS image_list
    FROM ads a LEFT JOIN ad_images ai ON ai.ad_id = a.id
    WHERE $whereSQL GROUP BY a.id ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset");

foreach ($params as $key => $val) {
    $stmt->bindValue($key + 1, $val);
}
$stmt->bindValue(':limit', (int)$perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
$stmt->execute();
$ads = $stmt->fetchAll();

// Favorites
$favSet = [];
if ($currentUser) {
    $fstmt = $db->prepare("SELECT ad_id FROM favorites WHERE user_id = ?");
    $fstmt->execute([$currentUser['id']]);
    $favSet = array_column($fstmt->fetchAll(), 'ad_id');
}

require_once __DIR__ . '/includes/header.php';
?>

<!-- Hero -->
<section class="hero">
  <h1>Trouvez ce dont vous avez besoin,<br><span>partagez ce que vous avez.</span></h1>
  <p>MaketGroup est la place de marché moderne pour votre communauté. Achetez, vendez et discutez en un seul endroit.</p>
  <div class="hero-search">
    <form method="GET" style="display:flex;gap:.75rem;width:100%;">
      <?php if ($category && $category !== 'Tous'): ?>
        <input type="hidden" name="category" value="<?= h($category) ?>">
      <?php endif; ?>
      <input class="form-control" type="text" name="search" placeholder="Rechercher un article…" value="<?= h($search) ?>">
      <button type="submit" class="btn btn-primary">Chercher</button>
    </form>
  </div>
</section>

<!-- Categories -->
<div class="categories">
  <?php foreach ($categories as $cat): ?>
    <a href="?<?= http_build_query(array_filter(['search'=>$search,'category'=>$cat==='Tous'?'':$cat])) ?>"
       class="cat-btn <?= $category===$cat?'active':'' ?>"><?= h($cat) ?></a>
  <?php endforeach; ?>
</div>

<!-- Ads -->
<?php if (empty($ads)): ?>
  <div class="empty-state">
    <svg width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <h3>Aucune annonce trouvée</h3>
    <p>Essayez de modifier vos filtres ou votre recherche.</p>
  </div>
<?php else: ?>
  <div class="ads-grid">
    <?php foreach ($ads as $ad):
      $images = $ad['image_list'] ? explode('|', $ad['image_list']) : [];
      $thumb  = $images[0] ?? "https://picsum.photos/seed/{$ad['id']}/400/400";
      $isFav  = in_array($ad['id'], $favSet);
    ?>
    <a href="<?= BASE_URL ?>/ad.php?id=<?= $ad['id'] ?>" class="ad-card">
      <div class="ad-thumb">
        <img src="<?= h($thumb) ?>" alt="<?= h($ad['title']) ?>" loading="lazy" referrerpolicy="no-referrer">
        <span class="ad-price-badge"><?= formatPrice((float)$ad['price']) ?></span>
        <button class="ad-fav-btn <?= $isFav?'active':'' ?>" data-ad-id="<?= $ad['id'] ?>" title="Favori">
          <svg width="16" height="16" fill="<?= $isFav?'currentColor':'none' ?>" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="ad-body">
        <div class="ad-cat"><?= h($ad['category'] ?? '') ?></div>
        <div class="ad-title"><?= h($ad['title']) ?></div>
        <div class="ad-author">Par <?= h($ad['author_name'] ?? '') ?></div>
        <div class="ad-meta">
          <span>📍 <?= h($ad['location'] ?? '') ?></span>
          <span><?= timeAgo($ad['created_at']) ?></span>
        </div>
      </div>
    </a>
    <?php endforeach; ?>
  </div>

  <!-- Pagination -->
  <?php if ($totalPages > 1): ?>
    <div class="pagination">
      <?php for ($p = 1; $p <= $totalPages; $p++): ?>
        <?php if ($p === $page): ?>
          <span class="current"><?= $p ?></span>
        <?php else: ?>
          <a href="?<?= http_build_query(array_filter(['search'=>$search,'category'=>$category!=='Tous'?$category:'','page'=>$p])) ?>"><?= $p ?></a>
        <?php endif; ?>
      <?php endfor; ?>
    </div>
  <?php endif; ?>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
