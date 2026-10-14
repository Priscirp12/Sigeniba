<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/mail_config.php';
require_once __DIR__ . '/mail_helper.php';

require_method('POST');

const TOKEN_TTL_MINUTOS = 45;

$data = read_json_body();
$identificador = trim($data['identificador'] ?? '');

if (!$identificador) {
    send_error('Debes indicar tu usuario o correo');
}

$mensajeGenerico = 'Si el usuario existe y tiene permiso para recuperar su contraseña, '
    . 'se enviará un enlace a su correo registrado.';

// El correo de un docente puede estar en usuarios.email (correo de recuperación)
// o en docentes.email (el que ya se captura desde "Gestión de Docentes"); se
// revisan ambos para no depender de que el admin lo llene dos veces.
$stmt = $pdo->prepare(
    "SELECT u.id_usuario, u.nombre, u.rol, COALESCE(u.email, d.email) AS email
     FROM usuarios u
     LEFT JOIN docentes d ON d.id_usuario = u.id_usuario
     WHERE (u.id_usuario = ? OR u.email = ? OR d.email = ?) AND u.rol IN ('docente','administrador')
     LIMIT 1"
);
$stmt->execute([$identificador, $identificador, $identificador]);
$usuario = $stmt->fetch();

if ($usuario && !empty($usuario['email'])) {
    $tokenPlano = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $tokenPlano);
    $expiresAt = date('Y-m-d H:i:s', time() + TOKEN_TTL_MINUTOS * 60);
    $idReset = generate_id('PWR');

    $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id_usuario = ? AND used_at IS NULL')
        ->execute([$usuario['id_usuario']]);

    $pdo->prepare('INSERT INTO password_resets (id_reset, id_usuario, token_hash, expires_at) VALUES (?, ?, ?, ?)')
        ->execute([$idReset, $usuario['id_usuario'], $tokenHash, $expiresAt]);

    $link = rtrim($mailAppUrl, '/') . '/restablecer-password?token=' . $tokenPlano;
    enviar_correo_recuperacion($usuario['email'], $usuario['nombre'] ?? '', $link);
}

echo json_encode(['success' => true, 'message' => $mensajeGenerico]);
