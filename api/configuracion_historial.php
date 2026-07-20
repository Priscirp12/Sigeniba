<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT plantilla_legenda FROM configuracion_historial WHERE id = 1');
    $fila = $stmt->fetch();

    echo json_encode(['plantilla_legenda' => $fila['plantilla_legenda'] ?? '']);
    exit;
}

if ($method === 'PUT') {
    $data = read_json_body();
    $plantilla = trim($data['plantilla_legenda'] ?? '');

    if (!$plantilla) {
        send_error('La plantilla no puede estar vacía');
    }

    $stmt = $pdo->prepare('INSERT INTO configuracion_historial (id, plantilla_legenda) VALUES (1, ?)
                            ON DUPLICATE KEY UPDATE plantilla_legenda = VALUES(plantilla_legenda)');
    $stmt->execute([$plantilla]);

    echo json_encode(['success' => true]);
    exit;
}

send_error('Método no permitido', 405);
