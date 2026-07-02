<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$login = $data['email'] ?? $data['usuario'] ?? '';
$password = $data['password'] ?? '';

if (!$login || !$password) {
    echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos']);
    exit;
}

$stmt = $pdo->prepare('SELECT id_usuario, nombre, apellido_paterno, apellido_materno, password_hash, rol FROM usuarios WHERE id_usuario = ? LIMIT 1');
$stmt->execute([$login]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Credenciales inválidas']);
    exit;
}

$apellidos = trim(($user['apellido_paterno'] ?? '') . ' ' . ($user['apellido_materno'] ?? ''));

$userPayload = [
    'id_usuario' => $user['id_usuario'],
    'nombre' => $user['nombre'],
    'apellidos' => $apellidos,
    'email' => $user['id_usuario'],
    'rol' => $user['rol'],
];

echo json_encode([
    'success' => true,
    'user' => $userPayload,
]);
