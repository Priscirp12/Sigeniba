<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Método no permitido', 405);
}

$matricula = $_GET['matricula'] ?? null;

if (!$matricula) {
    send_error('matricula es requerida');
}

$stmt = $pdo->prepare('SELECT a.matricula, u.nombre, u.apellido_paterno, u.apellido_materno
                        FROM alumnos a
                        LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
                        WHERE a.matricula = ?');
$stmt->execute([$matricula]);
$alumno = $stmt->fetch();

if (!$alumno) {
    send_error('Alumno no encontrado', 404);
}

// Un "periodo" es una generación completa (varios años, varios semestres), así
// que el historial se agrupa por (periodo + semestre del grupo) — no solo por
// periodo — para no mezclar en un mismo bloque materias de semestres distintos.
$stmt = $pdo->prepare('SELECT asa.id_periodo, g.semestre,
                               m.id_materia, m.nombre AS materia_nombre,
                               c.tipo, cc.valor
                        FROM calificaciones_criterios cc
                        JOIN criterios_evaluacion c ON c.id_criterio = cc.id_criterio
                        JOIN asignaciones_academicas asa ON asa.id_asignacion = c.id_asignacion
                        JOIN materias m ON m.id_materia = asa.id_materia
                        JOIN grupos g ON g.id_grupo = asa.id_grupo
                        WHERE cc.matricula = ?
                        ORDER BY g.semestre, m.nombre');
$stmt->execute([$matricula]);
$filas = $stmt->fetchAll();

// Agrupar: (periodo+semestre) -> materia -> tipo -> suma de puntos obtenidos
$estructura = [];
foreach ($filas as $fila) {
    $semestre = (int) $fila['semestre'];
    $claveGrupo = $fila['id_periodo'] . '|' . $semestre;
    $idMateria = $fila['id_materia'];
    $tipo = $fila['tipo'];

    if (!isset($estructura[$claveGrupo])) {
        $estructura[$claveGrupo] = [
            'semestre' => $semestre,
            'materias' => [],
        ];
    }
    if (!isset($estructura[$claveGrupo]['materias'][$idMateria])) {
        $estructura[$claveGrupo]['materias'][$idMateria] = [
            'nombre' => $fila['materia_nombre'],
            'tipos' => [],
        ];
    }
    $actual = $estructura[$claveGrupo]['materias'][$idMateria]['tipos'][$tipo] ?? 0;
    $estructura[$claveGrupo]['materias'][$idMateria]['tipos'][$tipo] = $actual + (float) $fila['valor'];
}

$meses = [
    '01' => 'Enero', '02' => 'Febrero', '03' => 'Marzo', '04' => 'Abril',
    '05' => 'Mayo', '06' => 'Junio', '07' => 'Julio', '08' => 'Agosto',
    '09' => 'Septiembre', '10' => 'Octubre', '11' => 'Noviembre', '12' => 'Diciembre',
];

// Ordenar por número de semestre
uasort($estructura, function ($a, $b) {
    return $a['semestre'] <=> $b['semestre'];
});

$semestres = [];
$todasLasCalificaciones = [];

foreach ($estructura as $claveGrupo => $datosPeriodo) {
    $materiasSalida = [];
    $sumaSemestre = 0;
    $contadorSemestre = 0;

    foreach ($datosPeriodo['materias'] as $materia) {
        $tipos = $materia['tipos'];

        // Calificación regular: promedio de los parciales capturados (puede no existir
        // si el alumno pasó directo a extraordinario/intersemestral sin parciales).
        $calificacionRegular = null;
        $parciales = [];
        foreach (['parcial1', 'parcial2', 'parcial3'] as $tipoParcial) {
            if (isset($tipos[$tipoParcial])) {
                $parciales[] = $tipos[$tipoParcial];
            }
        }
        if ($parciales) {
            $calificacionRegular = round(array_sum($parciales) / count($parciales), 2);
        }

        // Si el alumno reprueba en parciales, se le aplica extraordinario; si también
        // reprueba el extraordinario, se le aplica intersemestral. Cada etapa se guarda
        // por separado (nunca se mezclan ni se reemplazan entre sí en el historial).
        $calificacionExtraordinario = isset($tipos['extraordinario']) ? round($tipos['extraordinario'], 2) : null;
        $calificacionIntersemestral = isset($tipos['intersemestral']) ? round($tipos['intersemestral'], 2) : null;

        if ($calificacionRegular === null && $calificacionExtraordinario === null && $calificacionIntersemestral === null) {
            continue;
        }

        // La calificación que finalmente cuenta para el promedio es la de la última
        // etapa que el alumno haya presentado (intersemestral > extraordinario > regular).
        if ($calificacionIntersemestral !== null) {
            $calificacionFinal = $calificacionIntersemestral;
            $origenCalificacion = 'intersemestral';
        } elseif ($calificacionExtraordinario !== null) {
            $calificacionFinal = $calificacionExtraordinario;
            $origenCalificacion = 'extraordinario';
        } else {
            $calificacionFinal = $calificacionRegular;
            $origenCalificacion = 'regular';
        }

        $materiasSalida[] = [
            'nombre' => $materia['nombre'],
            'calificacion' => $calificacionFinal,
            'origen_calificacion' => $origenCalificacion,
            'calificacion_regular' => $calificacionRegular,
            'calificacion_extraordinario' => $calificacionExtraordinario,
            'calificacion_intersemestral' => $calificacionIntersemestral,
        ];
        $sumaSemestre += $calificacionFinal;
        $contadorSemestre++;
        $todasLasCalificaciones[] = $calificacionFinal;
    }

    if (!$materiasSalida) {
        continue;
    }

    $semestres[] = [
        'semestre' => $datosPeriodo['semestre'],
        'etiqueta' => 'Semestre ' . $datosPeriodo['semestre'],
        'materias' => $materiasSalida,
        'promedio_semestre' => round($sumaSemestre / $contadorSemestre, 2),
    ];
}

$promedioGeneral = $todasLasCalificaciones ? round(array_sum($todasLasCalificaciones) / count($todasLasCalificaciones), 2) : null;

$nombreCompleto = trim($alumno['nombre'] . ' ' . $alumno['apellido_paterno'] . ' ' . ($alumno['apellido_materno'] ?? ''));

$hoy = new DateTime();
$fechaEmision = $hoy->format('d') . ' de ' . $meses[$hoy->format('m')] . ' de ' . $hoy->format('Y');

$stmt = $pdo->query('SELECT plantilla_legenda FROM configuracion_historial WHERE id = 1');
$plantilla = $stmt->fetch()['plantilla_legenda'] ?? 'QUE EL ALUMNO {NOMBRE}, CON MATRÍCULA {MATRICULA}, OBTUVO UN PROMEDIO GENERAL DE {PROMEDIO}:';

$legenda = str_replace(
    ['{NOMBRE}', '{MATRICULA}', '{PROMEDIO}', '{FECHA_EMISION}'],
    [strtoupper($nombreCompleto), $alumno['matricula'], $promedioGeneral !== null ? number_format($promedioGeneral, 1) : '-', $fechaEmision],
    $plantilla
);

echo json_encode([
    'alumno' => [
        'matricula' => $alumno['matricula'],
        'nombre' => $nombreCompleto,
    ],
    'semestres' => $semestres,
    'promedio_general' => $promedioGeneral,
    'legenda' => $legenda,
]);
