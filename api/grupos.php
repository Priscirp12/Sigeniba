<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT g.id_grupo, g.nombre, g.semestre, g.turno, g.clave_tutor,
                                 u.nombre AS tutor_nombre, u.apellido_paterno AS tutor_apellido_paterno
                          FROM grupos g
                          LEFT JOIN docentes d ON d.id_docente = g.clave_tutor
                          LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
                          ORDER BY g.semestre, g.nombre');
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $nombre = trim($data['nombre'] ?? '');
    $semestre = $data['semestre'] ?? null;
    $turno = $data['turno'] ?? null;
    $claveTutor = $data['clave_tutor'] ?? null;

    if (!$nombre || !$semestre) {
        send_error('Nombre y semestre del grupo son requeridos');
    }

    $idGrupo = generate_id('GRP');
    $stmt = $pdo->prepare('INSERT INTO grupos (id_grupo, nombre, semestre, turno, clave_tutor) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$idGrupo, $nombre, $semestre, $turno, $claveTutor]);

    echo json_encode(['success' => true, 'id_grupo' => $idGrupo]);
    exit;
}

if ($method === 'PUT' && $action === 'asignar_alumnos') {
    $data = read_json_body();
    $idGrupo = trim($data['id_grupo'] ?? '');
    $matriculas = $data['matriculas'] ?? [];

    if (!$idGrupo || !is_array($matriculas) || !$matriculas) {
        send_error('id_grupo y al menos una matrícula son requeridos');
    }

    $placeholders = implode(',', array_fill(0, count($matriculas), '?'));
    $stmt = $pdo->prepare("UPDATE alumnos SET id_grupo = ? WHERE matricula IN ($placeholders)");
    $stmt->execute(array_merge([$idGrupo], $matriculas));

    echo json_encode(['success' => true, 'actualizados' => $stmt->rowCount()]);
    exit;
}

if ($method === 'PUT' && $action === 'asignar_tutor') {
    $data = read_json_body();
    $idGrupo = trim($data['id_grupo'] ?? '');
    $idDocente = trim($data['id_docente'] ?? '');

    if (!$idGrupo || !$idDocente) {
        send_error('id_grupo e id_docente son requeridos');
    }

    $stmt = $pdo->prepare('UPDATE grupos SET clave_tutor = ? WHERE id_grupo = ?');
    $stmt->execute([$idDocente, $idGrupo]);

    echo json_encode(['success' => true]);
    exit;
}

send_error('Método no permitido', 405);
