<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id_materia, nombre, clave, horas_semana, id_periodo FROM materias ORDER BY nombre');
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $nombre = trim($data['nombre'] ?? '');
    $clave = $data['clave'] ?? null;
    $horasSemana = $data['horas_semana'] ?? null;
    $idPeriodo = $data['id_periodo'] ?? null;

    if (!$nombre) {
        send_error('El nombre de la materia es requerido');
    }

    $idMateria = generate_id('MAT');
    $stmt = $pdo->prepare('INSERT INTO materias (id_materia, nombre, clave, horas_semana, id_periodo) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$idMateria, $nombre, $clave, $horasSemana, $idPeriodo]);

    echo json_encode(['success' => true, 'id_materia' => $idMateria]);
    exit;
}

if ($method === 'PUT') {
    $data = read_json_body();
    $idMateria = trim($data['id_materia'] ?? '');
    $nombre = trim($data['nombre'] ?? '');

    if (!$idMateria || !$nombre) {
        send_error('id_materia y nombre son requeridos');
    }

    $sets = ['nombre = ?'];
    $params = [$nombre];
    foreach (['clave', 'horas_semana'] as $field) {
        if (array_key_exists($field, $data)) {
            $sets[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    $params[] = $idMateria;

    $stmt = $pdo->prepare('UPDATE materias SET ' . implode(', ', $sets) . ' WHERE id_materia = ?');
    $stmt->execute($params);

    echo json_encode(['success' => true]);
    exit;
}

send_error('Método no permitido', 405);
