<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$tiposValidos = ['parcial1', 'parcial2', 'parcial3', 'extraordinario', 'intersemestral'];

if ($method === 'GET') {
    $idPeriodo = $_GET['id_periodo'] ?? null;

    if (!$idPeriodo) {
        send_error('id_periodo requerido');
    }

    $stmt = $pdo->prepare('SELECT id_ventana, id_periodo, tipo, fecha_inicio, fecha_fin FROM ventanas_captura WHERE id_periodo = ?');
    $stmt->execute([$idPeriodo]);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $idPeriodo = $data['id_periodo'] ?? null;
    $tipo = $data['tipo'] ?? null;
    $fechaInicio = $data['fecha_inicio'] ?? null;
    $fechaFin = $data['fecha_fin'] ?? null;

    if (!$idPeriodo || !in_array($tipo, $tiposValidos, true) || !$fechaInicio || !$fechaFin) {
        send_error('id_periodo, tipo válido, fecha_inicio y fecha_fin son requeridos');
    }

    $stmt = $pdo->prepare('SELECT id_ventana FROM ventanas_captura WHERE id_periodo = ? AND tipo = ?');
    $stmt->execute([$idPeriodo, $tipo]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('UPDATE ventanas_captura SET fecha_inicio = ?, fecha_fin = ? WHERE id_ventana = ?');
        $stmt->execute([$fechaInicio, $fechaFin, $existing['id_ventana']]);
        $idVentana = $existing['id_ventana'];
    } else {
        $idVentana = generate_id('VEN');
        $stmt = $pdo->prepare('INSERT INTO ventanas_captura (id_ventana, id_periodo, tipo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$idVentana, $idPeriodo, $tipo, $fechaInicio, $fechaFin]);
    }

    echo json_encode(['success' => true, 'id_ventana' => $idVentana]);
    exit;
}

send_error('Método no permitido', 405);
