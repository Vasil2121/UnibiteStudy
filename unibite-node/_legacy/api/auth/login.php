<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON body'], 400);
}

$identifier = cleanInput($payload['identifier'] ?? '');
$password   = (string) ($payload['password'] ?? '');

$errors = [];
if ($identifier === '') {
    $errors['identifier'] = 'Username or email is required';
}
if ($password === '') {
    $errors['password'] = 'Password is required';
}

if (!empty($errors)) {
    jsonResponse([
        'success' => false,
        'error'   => 'Validation failed',
        'fields'  => $errors,
    ], 400);
}

if (strpos($identifier, '@') !== false) {
    $sql = "SELECT id, username, email, password_hash, full_name, points, is_admin
            FROM users WHERE email = ? LIMIT 1";
} else {
    $sql = "SELECT id, username, email, password_hash, full_name, points, is_admin
            FROM users WHERE username = ? LIMIT 1";
}

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $identifier);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

$dummyHash = '$2y$10$abcdefghijklmnopqrstuuKK7DFDb.fF3yqXyHFnEzD9Y5w/D8KGS';
$hashToCheck = $user ? $user['password_hash'] : $dummyHash;

$passwordOk = password_verify($password, $hashToCheck);

if (!$user || !$passwordOk) {
    jsonResponse([
        'success' => false,
        'error'   => 'Invalid username/email or password',
    ], 401);
}

login((int) $user['id']);

unset($user['password_hash']);
$user['id']       = (int) $user['id'];
$user['points']   = (int) $user['points'];
$user['is_admin'] = (int) $user['is_admin'];

jsonResponse([
    'success' => true,
    'user'    => $user,
]);
