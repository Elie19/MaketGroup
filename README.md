# MaketGroup — Guide d'Installation

Ce projet est une plateforme de petites annonces communautaire développée en **PHP natif** avec une base de données **MySQL**.

## 🚀 Prérequis

- Serveur Web (Apache / Nginx)
- PHP 8.1 ou supérieur
- MySQL 8.0 ou supérieur
- Extension PHP `pdo_mysql` activée
- Extension PHP `fileinfo` activée (pour la validation sécurisée des images)

## 📂 Structure du Projet

L'application se trouve dans le dossier `/maketgroup`.

## 🛠 Installation Étape par Étape

### 1. Préparation des fichiers
Copiez le contenu du dossier `maketgroup` dans le répertoire racine de votre serveur web :
- **XAMPP** : `C:/xampp/htdocs/maketgroup/`
- **WAMP** : `C:/wamp64/www/maketgroup/`
- **Linux/cPanel** : `/var/www/html/` ou `public_html/`

### 2. Configuration de la Base de Données
1. Connectez-vous à votre interface de gestion de base de données (ex: phpMyAdmin).
2. Créez une nouvelle base de données nommée `maketgroup`.
3. Importez le fichier `maketgroup/schema.sql` dans cette base de données.
   - *Note : Ce fichier contient la structure des tables et un compte administrateur par défaut.*

### 3. Configuration de l'Application
Éditez le fichier `maketgroup/config/database.php` pour renseigner vos identifiants :

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'maketgroup');
define('DB_USER', 'votre_utilisateur');
define('DB_PASS', 'votre_mot_de_passe');

// IMPORTANT : Adaptez l'URL de base selon votre installation
define('BASE_URL', 'http://localhost/maketgroup');
```

### 4. Droits d'accès (Permissions)
Assurez-vous que le serveur web a les droits d'écriture sur le dossier des uploads :
```bash
chmod -R 755 maketgroup/uploads/
```

## 🔐 Accès Administrateur

Un compte administrateur est créé par défaut lors de l'import du schéma :
- **Email** : `admin@maketgroup.com`
- **Mot de passe** : `Admin123!`

> [!IMPORTANT]
> Pour des raisons de sécurité, changez le mot de passe de l'administrateur dès votre première connexion.

## 🛡 Sécurité et Audit

L'application intègre plusieurs couches de sécurité :
- **Injections SQL** : Utilisation systématique de PDO avec requêtes préparées.
- **XSS** : Échappement des données en sortie via la fonction `h()`.
- **CSRF** : Protection des formulaires via des jetons de session.
- **Uploads** : Validation du type MIME réel des fichiers via `finfo`.
- **Mots de passe** : Hachage sécurisé via `password_hash` (BCRYPT).

---
*Développé pour MaketGroup.*
