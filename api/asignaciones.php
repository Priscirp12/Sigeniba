<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $idGrupo = $_GET['id_grupo'] ?? null;
    $idDocente = $_GET['id_docente'] ?? null;

    $sql = 'SELECT asa.id_asignacion, asa.id_grupo, asa.id_materia, asa.id_docente, asa.id_periodo,
                   m.nombre AS materia_nombre, m.clave AS materia_clave, m.horas_semana,
                   g.nombre AS grupo_nombre, g.semestre,
                   p.ciclo_escolar
            FROM asignaciones_academicas asa
            LEFT JOIN materias m ON m.id_materia = asa.id_materia
            LEFT JOIN grupos g ON g.id_grupo = asa.id_grupo
            LEFT JOIN periodos_escolares p ON p.id_periodo = asa.id_periodo
            WHERE 1 = 1';
    $params = [];

    if ($idGrupo) {
        $sql .= ' AND asa.id_grupo = ?';
        $params[] = $idGrupo;
    }
    if ($idDocente) {
        $sql .= ' AND asa.id_docente = ?';
        $params[] = $idDocente;
    }

    $sql .= ' ORDER BY m.nombre';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $idGrupo = $data['id_grupo'] ?? null;
    $idMateria = $data['id_materia'] ?? null;
    $idDocente = $data['id_docente'] ?? null;
    $idPeriodo = $data['id_periodo'] ?? null;

    if (!$idGrupo || !$idMateria || !$idDocente || !$idPeriodo) {
        send_error('id_grupo, id_materia, id_docente e id_periodo son requeridos');
    }

    $idAsignacion = generate_id('ASG');
    $stmt = $pdo->prepare('INSERT INTO asignaciones_academicas (id_asignacion, id_grupo, id_materia, id_docente, id_periodo) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$idAsignacion, $idGrupo, $idMateria, $idDocente, $idPeriodo]);

    echo json_encode(['success' => true, 'id_asignacion' => $idAsignacion]);
    exit;
}

send_error('Método no permitido', 405);
