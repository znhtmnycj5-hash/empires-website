<?php
declare(strict_types=1);

function clanwars_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $localConfig = dirname(__DIR__) . '/config/database.local.php';
    if (is_file($localConfig)) {
        $config = require $localConfig;
    } else {
        $config = [
            'host' => getenv('CLANWARS_DB_HOST') ?: '127.0.0.1',
            'port' => (int)(getenv('CLANWARS_DB_PORT') ?: 3306),
            'database' => getenv('CLANWARS_DB_NAME') ?: '',
            'username' => getenv('CLANWARS_DB_USER') ?: '',
            'password' => getenv('CLANWARS_DB_PASSWORD') ?: '',
            'charset' => 'utf8mb4',
        ];
    }

    foreach (['host', 'database', 'username', 'password'] as $key) {
        if (!array_key_exists($key, $config) || ($key !== 'password' && trim((string)$config[$key]) === '')) {
            throw new RuntimeException('Не настроено подключение к базе данных.');
        }
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        (int)($config['port'] ?? 3306),
        $config['database'],
        $config['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, (string)$config['username'], (string)$config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
