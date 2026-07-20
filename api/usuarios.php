<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

require_method('PUT');

$data = read_json_body();
$idUsuarioActual = trim($data['id_usuario_actual'] ?? '');
$passwordActual = $data['password_actual'] ?? '';
$nuevoIdUsuario = trim($data['nuevo_id_usuario'] ?? '');
$nuevaPassword = $data['nueva_password'] ?? '';
$nuevoEmail = trim($data['email'] ?? '');

if (!$idUsuarioActual || !$passwordActual) {
    send_error('Usuario y contraseña actuales son requeridos');
}

if (!$nuevoIdUsuario && !$nuevaPassword && !$nuevoEmail) {
    send_error('Debes indicar un nuevo usuario, una nueva contraseña o un correo');
}

$stmt = $pdo->prepare('SELECT id_usuario, password_hash FROM usuarios WHERE id_usuario = ? LIMIT 1');
$stmt->execute([$idUsuarioActual]);
$usuario = $stmt->fetch();

if (!$usuario || !password_verify($passwordActual, $usuario['password_hash'])) {
    send_error('La contraseña actual es incorrecta', 401);
}

$idUsuarioFinal = $idUsuarioActual;

$pdo->beginTransaction();
try {
    if ($nuevoIdUsuario && $nuevoIdUsuario !== $idUsuarioActual) {
        $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?');
        $stmt->execute([$nuevoIdUsuario]);
        if ($stmt->fetch()) {
            throw new RuntimeException('Ese nombre de usuario ya está en uso');
        }
        $pdo->prepare('UPDATE usuarios SET id_usuario = ? WHERE id_usuario = ?')->execute([$nuevoIdUsuario, $idUsuarioActual]);
        $idUsuarioFinal = $nuevoIdUsuario;
    }

    if ($nuevaPassword) {
        $hash = password_hash($nuevaPassword, PASSWORD_DEFAULT);
        $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?')->execute([$hash, $idUsuarioFinal]);
    }

    if ($nuevoEmail) {
        $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?');
        $stmt->execute([$nuevoEmail, $idUsuarioFinal]);
        if ($stmt->fetch()) {
            throw new RuntimeException('Ese correo ya está en uso');
        }
        $pdo->prepare('UPDATE usuarios SET email = ? WHERE id_usuario = ?')->execute([$nuevoEmail, $idUsuarioFinal]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    send_error('No se pudo actualizar la cuenta: ' . $e->getMessage(), 500);
}

echo json_encode(['success' => true, 'id_usuario' => $idUsuarioFinal]);
