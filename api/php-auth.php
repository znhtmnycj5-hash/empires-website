<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/http.php';
require_once dirname(__DIR__) . '/includes/auth.php';

clanwars_start_session();

$action = (string)($_GET['action'] ?? '');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

function clanwars_normalize_name(string $name): string
{
    return trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
}

function clanwars_validate_name(string $name): void
{
    $length = mb_strlen($name, 'UTF-8');
    if ($length < 3 || $length > 24) {
        clanwars_json(['success' => false, 'message' => 'Никнейм должен содержать от 3 до 24 символов.'], 422);
    }
    if (!preg_match('/^[\p{L}\p{N}_ -]+$/u', $name)) {
        clanwars_json(['success' => false, 'message' => 'В никнейме разрешены буквы, цифры, пробел, дефис и подчёркивание.'], 422);
    }
}

function clanwars_name_available(string $name): bool
{
    $stmt = clanwars_db()->prepare('SELECT user_id FROM user_profiles WHERE display_name = :name LIMIT 1');
    $stmt->execute(['name' => $name]);
    return !$stmt->fetchColumn();
}

if ($action === 'me' && $method === 'GET') {
    $user = clanwars_current_user();
    clanwars_json([
        'success' => true,
        'authenticated' => $user !== null,
        'user' => $user ? ['id' => $user['id'], 'email' => $user['email'], 'status' => $user['status']] : null,
        'profile' => $user['profile'] ?? null,
        'csrf' => clanwars_csrf_token(),
    ]);
}

if ($action === 'check_name' && $method === 'GET') {
    $name = clanwars_normalize_name((string)($_GET['name'] ?? ''));
    if (mb_strlen($name, 'UTF-8') < 3 || mb_strlen($name, 'UTF-8') > 24
        || !preg_match('/^[\p{L}\p{N}_ -]+$/u', $name)) {
        clanwars_json(['success' => true, 'available' => false, 'valid' => false]);
    }
    clanwars_json(['success' => true, 'available' => clanwars_name_available($name), 'valid' => true]);
}

if (!in_array($method, ['POST'], true)) {
    clanwars_json(['success' => false, 'message' => 'Метод не поддерживается.'], 405);
}

$input = clanwars_input();
clanwars_require_csrf();

try {
    $db = clanwars_db();

    if ($action === 'register') {
        $email = mb_strtolower(trim((string)($input['email'] ?? '')), 'UTF-8');
        $password = (string)($input['password'] ?? '');
        $name = clanwars_normalize_name((string)($input['display_name'] ?? ''));

        clanwars_validate_name($name);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email, 'UTF-8') > 190) {
            clanwars_json(['success' => false, 'message' => 'Укажите корректный адрес электронной почты.'], 422);
        }
        if (strlen($password) < 8 || strlen($password) > 4096) {
            clanwars_json(['success' => false, 'message' => 'Пароль должен содержать не менее 8 символов.'], 422);
        }
        if (!clanwars_name_available($name)) {
            clanwars_json(['success' => false, 'message' => 'Этот никнейм уже занят. Выберите другой.'], 409);
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("INSERT INTO users (email, password_hash, status, created_at, updated_at) VALUES (:email, :hash, 'active', NOW(), NOW())");
            $stmt->execute(['email' => $email, 'hash' => password_hash($password, PASSWORD_DEFAULT)]);
            $userId = (int)$db->lastInsertId();

            $profile = $db->prepare("INSERT INTO user_profiles (user_id, display_name, regiment_name, avatar_url, created_at, updated_at) VALUES (:id, :name, '', '', NOW(), NOW())");
            $profile->execute(['id' => $userId, 'name' => $name]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        clanwars_login_user($userId);
        clanwars_json(['success' => true, 'message' => 'Аккаунт создан.', 'authenticated' => true, 'user' => clanwars_current_user(), 'csrf' => clanwars_csrf_token()], 201);
    }

    if ($action === 'login') {
        $email = mb_strtolower(trim((string)($input['email'] ?? '')), 'UTF-8');
        $password = (string)($input['password'] ?? '');
        $stmt = $db->prepare("SELECT id, password_hash, status FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        if (!$row || $row['status'] !== 'active' || !password_verify($password, $row['password_hash'])) {
            clanwars_json(['success' => false, 'message' => 'Неверная почта или пароль.'], 401);
        }
        if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
            $update = $db->prepare('UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id');
            $update->execute(['hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $row['id']]);
        }
        $db->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = :id')->execute(['id' => $row['id']]);
        clanwars_login_user((int)$row['id']);
        clanwars_json(['success' => true, 'message' => 'Вход выполнен.', 'authenticated' => true, 'user' => clanwars_current_user(), 'csrf' => clanwars_csrf_token()]);
    }

    if ($action === 'logout') {
        clanwars_require_csrf();
        clanwars_logout_user();
        clanwars_json(['success' => true, 'message' => 'Вы вышли из аккаунта.', 'authenticated' => false]);
    }

    if ($action === 'profile_update') {
        clanwars_require_csrf();
        $current = clanwars_current_user();
        if (!$current) clanwars_json(['success' => false, 'message' => 'Войдите в аккаунт.'], 401);

        $updates = [];
        if (array_key_exists('display_name', $input)) {
            $name = clanwars_normalize_name((string)$input['display_name']);
            clanwars_validate_name($name);
            if (mb_strtolower($name, 'UTF-8') !== mb_strtolower($current['profile']['display_name'], 'UTF-8') && !clanwars_name_available($name)) {
                clanwars_json(['success' => false, 'message' => 'Этот никнейм уже занят. Выберите другой.'], 409);
            }
            $updates['display_name'] = $name;
        }
        if (array_key_exists('regiment', $input)) $updates['regiment_name'] = mb_substr(trim((string)$input['regiment']), 0, 255, 'UTF-8');
        if (array_key_exists('avatar_url', $input)) $updates['avatar_url'] = mb_substr(trim((string)$input['avatar_url']), 0, 500, 'UTF-8');

        if ($updates) {
            $sets = [];
            foreach ($updates as $key => $value) $sets[] = $key . ' = :' . $key;
            $updates['user_id'] = $current['id'];
            $sql = 'UPDATE user_profiles SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE user_id = :user_id';
            $db->prepare($sql)->execute($updates);
        }
        clanwars_json(['success' => true, 'message' => 'Профиль обновлён.', 'user' => clanwars_current_user(), 'csrf' => clanwars_csrf_token()]);
    }

    clanwars_json(['success' => false, 'message' => 'Неизвестное действие.'], 404);
} catch (PDOException $e) {
    error_log('Clanwars auth database error: ' . $e->getMessage());
    if ((string)$e->getCode() === '23000') {
        clanwars_json(['success' => false, 'message' => 'Почта или никнейм уже используются.'], 409);
    }
    clanwars_json(['success' => false, 'message' => 'Ошибка базы данных. Проверьте настройки подключения и структуру таблиц.'], 500);
} catch (Throwable $e) {
    error_log('Clanwars auth error: ' . $e->getMessage());
    clanwars_json(['success' => false, 'message' => 'Внутренняя ошибка сервера.'], 500);
}
