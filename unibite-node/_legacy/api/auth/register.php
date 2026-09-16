<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);

if (!is_array($input)) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON body'], 400);
}

$username = cleanInput($input['username'] ?? '');
$email    = cleanInput($input['email']    ?? '');
$password = (string) ($input['password']  ?? '');
$fullName = cleanInput($input['full_name'] ?? '');

$errors = [];

if ($username === '' || strlen($username) < 3 || strlen($username) > 50) {
    $errors['username'] = 'Username must be 3 to 50 characters';
} elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    $errors['username'] = 'Username may contain only letters, numbers and underscores';
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'A valid email is required';
} elseif (strlen($email) > 100) {
    $errors['email'] = 'Email is too long (max 100 characters)';
}

if (strlen($password) < 8) {
    $errors['password'] = 'Password must be at least 8 characters';
}

if ($fullName === '' || strlen($fullName) < 2 || strlen($fullName) > 100) {
    $errors['full_name'] = 'Full name must be 2 to 100 characters';
}

if (!empty($errors)) {
    jsonResponse([
        'success' => false,
        'error'   => 'Validation failed',
        'fields'  => $errors,
    ], 400);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $stmt = $conn->prepare(
        "INSERT INTO users (username, email, password_hash, full_name, points, is_admin)
         VALUES (?, ?, ?, ?, 0, 0)"
    );
    $stmt->bind_param("ssss", $username, $email, $passwordHash, $fullName);
    $stmt->execute();
    $newUserId = $conn->insert_id;
    $stmt->close();
} catch (mysqli_sql_exception $e) {

    if ($e->getCode() === 1062) {
        jsonResponse([
            'success' => false,
            'error'   => 'Username or email already exists',
        ], 409);
    }

    throw $e;
}

addPoints($newUserId, 5, 'signup_bonus', null);

login($newUserId);

$stmt = $conn->prepare(
    "SELECT id, username, email, full_name, points, is_admin
     FROM users WHERE id = ?"
);
$stmt->bind_param("i", $newUserId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

jsonResponse([
    'success' => true,
    'user'    => $user,
]);
