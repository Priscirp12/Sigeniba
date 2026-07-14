<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT g.id_grupo, g.nombre, g.semestre, g.clave_tutor,
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
    $claveTutor = $data['clave_tutor'] ?? null;

    if (!$nombre || !$semestre) {
        send_error('Nombre y semestre del grupo son requeridos');
    }

    $idGrupo = generate_id('GRP');
    $stmt = $pdo->prepare('INSERT INTO grupos (id_grupo, nombre, semestre, clave_tutor) VALUES (?, ?, ?, ?)');
    $stmt->execute([$idGrupo, $nombre, $semestre, $claveTutor]);

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

    // Solo se permite cambiar de grupo a un alumno cuando su periodo escolar
    // no está en curso (es decir, entre semestres). Si el periodo del alumno
    // está activo hoy, esa fila se omite silenciosamente.
    $stmt = $pdo->prepare("UPDATE alumnos a
                            LEFT JOIN periodos_escolares p ON p.id_periodo = a.id_periodo
                            SET a.id_grupo = ?
                            WHERE a.matricula IN ($placeholders)
                              AND (a.id_periodo IS NULL OR CURDATE() < p.fecha_inicio OR CURDATE() > p.fecha_fin)");
    $stmt->execute(array_merge([$idGrupo], $matriculas));
    $actualizados = $stmt->rowCount();
    $omitidos = count($matriculas) - $actualizados;

    echo json_encode(['success' => true, 'actualizados' => $actualizados, 'omitidos' => $omitidos]);
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
