# MaketGroup — Version PHP + MySQL

Place de marché communautaire réécrite en PHP natif avec MySQL.

## Stack technique

- **Backend** : PHP 8.1+ (PDO, sessions, password_hash)
- **Base de données** : MySQL 8+ (InnoDB, utf8mb4)
- **Frontend** : HTML5, CSS3 (variables, grid, flexbox), JS vanilla
- **Sécurité** : CSRF tokens, PDO prepared statements, upload sécurisé

---

## Installation

### 1. Cloner / copier les fichiers
```
htdocs/maketgroup/   (XAMPP)
www/maketgroup/      (WAMP / cPanel)
```

### 2. Créer la base de données
```bash
mysql -u root -p < schema.sql
```
Ou importer `schema.sql` via phpMyAdmin. Ce fichier contient la structure complète et un compte administrateur par défaut.

### 3. Configurer la connexion
Éditer `config/database.php` :
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'maketgroup');
define('DB_USER', 'root');
define('DB_PASS', 'votre_mot_de_passe');
define('BASE_URL', 'http://localhost/maketgroup');
```

### 4. Permissions
```bash
chmod -R 755 uploads/
```

### 5. Compte admin par défaut
- **Email** : `admin@maketgroup.com`
- **Mot de passe** : `Admin123!`

⚠️ Changez ce mot de passe immédiatement après installation.

---

## Sécurité et Audit

L'application a été auditée et sécurisée :
- **Injections SQL** : Utilisation de PDO avec requêtes préparées et liage explicite des types pour la pagination.
- **XSS** : Échappement systématique des données dynamiques via la fonction `h()`.
- **CSRF** : Protection de tous les formulaires via des jetons de session.
- **Uploads** : Validation du type MIME réel via l'extension PHP `finfo` pour empêcher l'exécution de scripts malveillants.
- **Mots de passe** : Hachage BCRYPT via `password_hash`.

---

## Structure des fichiers

```
maketgroup/
├── config/
│   └── database.php        # Connexion PDO + constantes
├── includes/
│   ├── auth.php            # Login, register, session
│   ├── helpers.php         # Fonctions utilitaires (h, uploadImage, etc.)
│   ├── header.php          # Navbar + layout
│   └── footer.php          # Pied de page
├── api/
│   ├── toggle-favorite.php # AJAX favoris
│   ├── messages.php        # Polling messages
│   └── send-message.php    # Envoi message
├── assets/
│   ├── css/style.css       # Styles + dark mode
│   └── js/app.js           # JavaScript vanilla
├── uploads/                # Images uploadées (ads, avatars, groups)
├── index.php               # Accueil + annonces
├── ad.php                  # Détail annonce
├── create-ad.php           # Publier / modifier annonce
├── profile.php             # Profil utilisateur
├── groups.php              # Groupes + chat
├── messages.php            # Messagerie privée
├── notifications.php       # Notifications
├── admin.php               # Dashboard admin
├── login.php               # Connexion
├── register.php            # Inscription
└── schema.sql              # Schéma MySQL complet
```

---

## Fonctionnalités

| Feature | Détail |
|---------|--------|
| ✅ Authentification | Inscription, connexion, sessions sécurisées |
| ✅ Annonces | CRUD complet, upload multi-images, catégories, recherche, pagination |
| ✅ Favoris | Toggle AJAX sans rechargement de page |
| ✅ Messagerie | Chat privé entre utilisateurs |
| ✅ Groupes | Création, adhésion, chat en temps réel (polling) |
| ✅ Transactions | Achat MTN / Moov / Cash / Carte, invités inclus |
| ✅ Notifications | Centre de notifications avec compteur |
| ✅ Profil | Avatar, bio, stats, avis, transactions, favoris, sécurité |
| ✅ Admin | Stats globales, gestion users/annonces/transactions |
| ✅ Dark mode | Persisté via localStorage |
| ✅ Responsive | Mobile-first, hamburger menu |
| ✅ Sécurité | CSRF, PDO, XSS échappé, upload sécurisé |

---

## Hébergement cPanel

1. Uploader les fichiers dans `public_html/maketgroup/`
2. Créer la base MySQL dans cPanel → MySQL Databases
3. Importer `schema.sql` via phpMyAdmin
4. Modifier `config/database.php` avec les identifiants cPanel
5. Adapter `BASE_URL` selon votre domaine
