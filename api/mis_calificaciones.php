<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    send_error('Método no permitido', 405);
}

$matricula = $_GET['matricula'] ?? null;

if (!$matricula) {
    send_error('matricula es requerida');
}

$stmt = $pdo->prepare('SELECT id_grupo FROM alumnos WHERE matricula = ?');
$stmt->execute([$matricula]);
$alumno = $stmt->fetch();

if (!$alumno || !$alumno['id_grupo']) {
    echo json_encode([]);
    exit;
}

$stmt = $pdo->prepare('SELECT asa.id_asignacion, m.nombre AS materia_nombre,
                               u.nombre AS docente_nombre, u.apellido_paterno AS docente_apellido_paterno
                        FROM asignaciones_academicas asa
                        LEFT JOIN materias m ON m.id_materia = asa.id_materia
                        LEFT JOIN docentes d ON d.id_docente = asa.id_docente
                        LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
                        WHERE asa.id_grupo = ?
                        ORDER BY m.nombre');
$stmt->execute([$alumno['id_grupo']]);
$asignaciones = $stmt->fetchAll();

$tipos = ['parcial1', 'parcial2', 'parcial3'];
$resultado = [];

foreach ($asignaciones as $asignacion) {
    $parciales = [];
    $sumas = [];

    foreach ($tipos as $tipo) {
        $stmt = $pdo->prepare('SELECT id_criterio, nombre, valor_puntos, es_examen
                                FROM criterios_evaluacion
                                WHERE id_asignacion = ? AND tipo = ?
                                ORDER BY es_examen DESC, nombre');
        $stmt->execute([$asignacion['id_asignacion'], $tipo]);
        $criterios = $stmt->fetchAll();

        if (!$criterios) {
            $parciales[$tipo] = null;
            continue;
        }

        $idsCriterios = array_column($criterios, 'id_criterio');
        $placeholders = implode(',', array_fill(0, count($idsCriterios), '?'));
        $stmt = $pdo->prepare("SELECT id_criterio, valor FROM calificaciones_criterios WHERE matricula = ? AND id_criterio IN ($placeholders)");
        $stmt->execute(array_merge([$matricula], $idsCriterios));

        $valores = [];
        foreach ($stmt->fetchAll() as $fila) {
            $valores[$fila['id_criterio']] = (float) $fila['valor'];
        }

        if (!$valores) {
            $parciales[$tipo] = null;
            continue;
        }

        $criteriosConValor = array_map(function ($criterio) use ($valores) {
            return [
                'nombre' => $criterio['nombre'],
                'valor_puntos' => (float) $criterio['valor_puntos'],
                'obtenido' => $valores[$criterio['id_criterio']] ?? null,
            ];
        }, $criterios);

        $suma = round(array_sum($valores), 2);
        $parciales[$tipo] = ['criterios' => $criteriosConValor, 'suma' => $suma];
        $sumas[] = $suma;
    }

    $promedio = $sumas ? round(array_sum($sumas) / count($sumas), 2) : null;

    $resultado[] = [
        'id_asignacion' => $asignacion['id_asignacion'],
        'materia_nombre' => $asignacion['materia_nombre'],
        'docente_nombre' => trim(($asignacion['docente_nombre'] ?? '') . ' ' . ($asignacion['docente_apellido_paterno'] ?? '')),
        'parciales' => $parciales,
        'promedio' => $promedio,
    ];
}

echo json_encode($resultado);
