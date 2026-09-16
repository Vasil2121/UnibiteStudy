<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function login(int $userId): void {

    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logout(): void {

    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
}

function getCurrentUserId(): ?int {
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function getCurrentUser(): ?array {
    global $conn;
    static $cached = null;
    static $cacheLoaded = false;

    if ($cacheLoaded) {
        return $cached;
    }

    $userId = getCurrentUserId();
    if ($userId === null) {
        $cacheLoaded = true;
        return null;
    }

    $stmt = $conn->prepare(
        "SELECT id, username, email, full_name, points, is_admin, created_at
         FROM users WHERE id = ?"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $cached = $result->fetch_assoc() ?: null;
    $stmt->close();

    $cacheLoaded = true;
    return $cached;
}

function isLoggedIn(): bool {
    return getCurrentUserId() !== null;
}

function isAdmin(): bool {
    $user = getCurrentUser();
    return $user !== null && (int) $user['is_admin'] === 1;
}

function requireLoginPage(): void {
    if (isLoggedIn()) {
        return;
    }

    $_SESSION['after_login_redirect'] = $_SERVER['REQUEST_URI'] ?? '/unibite/';

    header('Location: /unibite/login.php');
    exit;
}

function requireLoginApi(): void {
    if (isLoggedIn()) {
        return;
    }
    jsonResponse(['success' => false, 'error' => 'Login required'], 401);
}

function requireAdminPage(): void {
    requireLoginPage();
    if (!isAdmin()) {
        header('Location: /unibite/');
        exit;
    }
}

function requireAdminApi(): void {
    requireLoginApi();
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Admin only'], 403);
    }
}
