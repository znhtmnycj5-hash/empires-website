<?php
declare(strict_types=1);

function clanwars_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function clanwars_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        clanwars_json(['success' => false, 'message' => 'Некорректный JSON.'], 400);
    }
    return $data;
}

function clanwars_require_csrf(): void
{
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string)($_SESSION['clanwars_csrf'] ?? '');
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        clanwars_json(['success' => false, 'message' => 'Сессия устарела. Обновите страницу и повторите действие.'], 419);
    }
}

function clanwars_csrf_token(): string
{
    if (empty($_SESSION['clanwars_csrf'])) {
        $_SESSION['clanwars_csrf'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['clanwars_csrf'];
}
