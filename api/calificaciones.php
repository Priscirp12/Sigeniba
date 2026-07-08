<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$tiposValidos = ['parcial1', 'parcial2', 'parcial3', 'extraordinario', 'intersemestral'];

if ($method === 'GET') {
    $idAsignacion = $_GET['id_asignacion'] ?? null;
    $tipo = $_GET['tipo'] ?? null;

    if (!$idAsignacion || !in_array($tipo, $tiposValidos, true)) {
        send_error('id_asignacion y un tipo válido son requeridos');
    }

    $stmt = $pdo->prepare('SELECT id_grupo, id_periodo FROM asignaciones_academicas WHERE id_asignacion = ?');
    $stmt->execute([$idAsignacion]);
    $asignacion = $stmt->fetch();

    if (!$asignacion) {
        send_error('Asignación no encontrada', 404);
    }

    $stmt = $pdo->prepare('SELECT id_criterio, nombre, valor_puntos, es_examen
                            FROM criterios_evaluacion
                            WHERE id_asignacion = ? AND tipo = ?
                            ORDER BY es_examen DESC, nombre');
    $stmt->execute([$idAsignacion, $tipo]);
    $criterios = $stmt->fetchAll();

    $sumaCriterios = round(array_sum(array_column($criterios, 'valor_puntos')), 2);
    $ventana = ventana_captura_estado($pdo, $asignacion['id_periodo'], $tipo);
    $editable = $ventana['abierta'] && count($criterios) > 0 && abs($sumaCriterios - 10) < 0.01;

    $stmt = $pdo->prepare('SELECT a.matricula, u.nombre, u.apellido_paterno, u.apellido_materno
                            FROM alumnos a
                            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
                            WHERE a.id_grupo = ?
                            ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre');
    $stmt->execute([$asignacion['id_grupo']]);
    $alumnos = $stmt->fetchAll();

    $valoresPorAlumno = [];
    if ($criterios) {
        $idsCriterios = array_column($criterios, 'id_criterio');
        $placeholders = implode(',', array_fill(0, count($idsCriterios), '?'));
        $stmt = $pdo->prepare("SELECT matricula, id_criterio, valor FROM calificaciones_criterios WHERE id_criterio IN ($placeholders)");
        $stmt->execute($idsCriterios);
        foreach ($stmt->fetchAll() as $fila) {
            $valoresPorAlumno[$fila['matricula']][$fila['id_criterio']] = (float) $fila['valor'];
        }
    }

    $resultado = [];
    foreach ($alumnos as $alumno) {
        $valores = $valoresPorAlumno[$alumno['matricula']] ?? [];
        $resultado[] = [
            'alumno' => $alumno,
            'valores' => $valores,
            'suma' => round(array_sum($valores), 2),
        ];
    }

    echo json_encode([
        'criterios' => $criterios,
        'alumnos' => $resultado,
        'ventana' => $ventana,
        'editable' => $editable,
        'suma_criterios' => $sumaCriterios,
    ]);
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $matricula = $data['matricula'] ?? null;
    $idCriterio = $data['id_criterio'] ?? null;
    $valor = $data['valor'] ?? null;

    if (!$matricula || !$idCriterio || $valor === null) {
        send_error('matricula, id_criterio y valor son requeridos');
    }

    $stmt = $pdo->prepare('SELECT c.valor_puntos, c.tipo, a.id_periodo
                            FROM criterios_evaluacion c
                            LEFT JOIN asignaciones_academicas a ON a.id_asignacion = c.id_asignacion
                            WHERE c.id_criterio = ?');
    $stmt->execute([$idCriterio]);
    $criterio = $stmt->fetch();

    if (!$criterio) {
        send_error('Criterio no encontrado', 404);
    }

    $ventana = ventana_captura_estado($pdo, $criterio['id_periodo'], $criterio['tipo']);
    if (!$ventana['abierta']) {
        send_error('La ventana de captura para este periodo está cerrada', 403);
    }

    if ((float) $valor < 0 || (float) $valor > (float) $criterio['valor_puntos']) {
        send_error('El valor no puede exceder ' . $criterio['valor_puntos'] . ' puntos para este criterio');
    }

    $idCalificacion = generate_id('CAL');
    $stmt = $pdo->prepare('INSERT INTO calificaciones_criterios (id_calificacion, matricula, id_criterio, valor, fecha_registro)
                            VALUES (?, ?, ?, ?, CURDATE())
                            ON DUPLICATE KEY UPDATE valor = VALUES(valor), fecha_registro = CURDATE()');
    $stmt->execute([$idCalificacion, $matricula, $idCriterio, $valor]);

    echo json_encode(['success' => true]);
    exit;
}

send_error('Método no permitido', 405);
