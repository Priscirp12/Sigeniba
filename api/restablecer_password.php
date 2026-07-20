<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

require_method('POST');

const PASSWORD_MIN_LEN = 6;

$data = read_json_body();
$token = trim($data['token'] ?? '');
$nuevaPassword = $data['nueva_password'] ?? '';

if (!$token || !$nuevaPassword) {
    send_error('Token y nueva contraseña son requeridos');
}
if (strlen($nuevaPassword) < PASSWORD_MIN_LEN) {
    send_error('La nueva contraseña debe tener al menos ' . PASSWORD_MIN_LEN . ' caracteres');
}

$tokenHash = hash('sha256', $token);

$stmt = $pdo->prepare(
    "SELECT pr.id_reset, pr.id_usuario, pr.expires_at, pr.used_at, u.rol
     FROM password_resets pr
     JOIN usuarios u ON u.id_usuario = pr.id_usuario
     WHERE pr.token_hash = ? LIMIT 1"
);
$stmt->execute([$tokenHash]);
$reset = $stmt->fetch();

$mensajeInvalido = 'El enlace no es válido o ya fue utilizado. Solicita uno nuevo.';

if (!$reset || $reset['used_at'] !== null || !in_array($reset['rol'], ['docente', 'administrador'], true)) {
    send_error($mensajeInvalido, 400);
}
if (strtotime($reset['expires_at']) < time()) {
    send_error('El enlace ha expirado. Solicita uno nuevo.', 400);
}

$pdo->beginTransaction();
try {
    $hash = password_hash($nuevaPassword, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?')
        ->execute([$hash, $reset['id_usuario']]);

    $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id_reset = ?')
        ->execute([$reset['id_reset']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    send_error('No se pudo restablecer la contraseña: ' . $e->getMessage(), 500);
}

echo json_encode(['success' => true, 'message' => 'Tu contraseña se actualizó correctamente.']);
