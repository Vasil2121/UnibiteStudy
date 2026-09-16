<?php

const DB_HOST = 'localhost';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'unibite';
const DB_PORT = 3306;

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
} catch (mysqli_sql_exception $e) {

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error'   => 'Database connection failed',

        'detail'  => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$conn->set_charset('utf8mb4');

$conn->query("SET time_zone = '+03:00'");
date_default_timezone_set('Europe/Athens');
