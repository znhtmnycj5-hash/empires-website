<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

function clanwars_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function clanwars_current_user(): ?array
{
    clanwars_start_session();
    $id = (int)($_SESSION['clanwars_user_id'] ?? 0);
    if ($id < 1) {
        return null;
    }

    $stmt = clanwars_db()->prepare(
        "SELECT u.id, u.email, u.status, p.display_name, p.regiment_name, p.avatar_url, p.bio, p.last_seen_at
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = :id LIMIT 1"
    );
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        unset($_SESSION['clanwars_user_id']);
        return null;
    }

    return [
        'id' => (int)$user['id'],
        'email' => $user['email'],
        'status' => $user['status'],
        'profile' => [
            'display_name' => $user['display_name'] ?? '',
            'regiment' => $user['regiment_name'] ?? '',
            'avatar_url' => $user['avatar_url'] ?? '',
            'bio' => $user['bio'] ?? '',
            'last_seen_at' => $user['last_seen_at'],
        ],
    ];
}

function clanwars_login_user(int $userId): void
{
    clanwars_start_session();
    session_regenerate_id(true);
    $_SESSION['clanwars_user_id'] = $userId;
    $_SESSION['clanwars_csrf'] = bin2hex(random_bytes(32));
}

function clanwars_logout_user(): void
{
    clanwars_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?: '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool)$params['secure'],
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
}
