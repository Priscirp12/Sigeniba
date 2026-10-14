<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id_ciclo, nombre, fecha_inicio, fecha_fin FROM ciclos_escolares ORDER BY fecha_inicio DESC');
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $nombre = trim($data['nombre'] ?? '');
    $fechaInicio = $data['fecha_inicio'] ?? null;
    $fechaFin = $data['fecha_fin'] ?? null;

    if (!$nombre || !$fechaInicio || !$fechaFin) {
        send_error('Nombre, fecha de inicio y fecha de fin son requeridos');
    }

    $idCiclo = generate_id('CIC');
    $stmt = $pdo->prepare('INSERT INTO ciclos_escolares (id_ciclo, nombre, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)');
    $stmt->execute([$idCiclo, $nombre, $fechaInicio, $fechaFin]);

    echo json_encode(['success' => true, 'id_ciclo' => $idCiclo]);
    exit;
}

send_error('Método no permitido', 405);
