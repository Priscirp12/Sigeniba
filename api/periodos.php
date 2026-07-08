<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id_periodo, ciclo_escolar, fecha_inicio, fecha_fin FROM periodos_escolares ORDER BY fecha_inicio DESC');
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $cicloEscolar = trim($data['ciclo_escolar'] ?? '');
    $fechaInicio = $data['fecha_inicio'] ?? null;
    $fechaFin = $data['fecha_fin'] ?? null;

    if (!$cicloEscolar || !$fechaInicio || !$fechaFin) {
        send_error('Ciclo escolar, fecha de inicio y fecha de fin son requeridos');
    }

    $idPeriodo = generate_id('PER');
    $stmt = $pdo->prepare('INSERT INTO periodos_escolares (id_periodo, ciclo_escolar, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)');
    $stmt->execute([$idPeriodo, $cicloEscolar, $fechaInicio, $fechaFin]);

    echo json_encode(['success' => true, 'id_periodo' => $idPeriodo]);
    exit;
}

send_error('Método no permitido', 405);
