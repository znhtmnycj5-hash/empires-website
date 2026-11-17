<?php
declare(strict_types=1);

/**
 * Copy to config/database.local.php and enter the MySQL credentials there.
 * Never commit database.local.php or real credentials.
 */
return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'clanwars',
    'username' => 'clanwars_user',
    'password' => '',
    'charset' => 'utf8mb4',
];
