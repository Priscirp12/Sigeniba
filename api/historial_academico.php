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

$stmt = $pdo->prepare('SELECT asa.id_periodo, p.fecha_inicio, p.fecha_fin,
                               m.id_materia, m.nombre AS materia_nombre,
                               c.tipo, cc.valor
                        FROM calificaciones_criterios cc
                        JOIN criterios_evaluacion c ON c.id_criterio = cc.id_criterio
                        JOIN asignaciones_academicas asa ON asa.id_asignacion = c.id_asignacion
                        JOIN materias m ON m.id_materia = asa.id_materia
                        JOIN periodos_escolares p ON p.id_periodo = asa.id_periodo
                        WHERE cc.matricula = ?
                        ORDER BY p.fecha_inicio, m.nombre');
$stmt->execute([$matricula]);
$filas = $stmt->fetchAll();

// Agrupar: periodo -> materia -> tipo -> suma de puntos obtenidos
$estructura = [];
foreach ($filas as $fila) {
    $idPeriodo = $fila['id_periodo'];
    $idMateria = $fila['id_materia'];
    $tipo = $fila['tipo'];

    if (!isset($estructura[$idPeriodo])) {
        $estructura[$idPeriodo] = [
            'fecha_inicio' => $fila['fecha_inicio'],
            'fecha_fin' => $fila['fecha_fin'],
            'materias' => [],
        ];
    }
    if (!isset($estructura[$idPeriodo]['materias'][$idMateria])) {
        $estructura[$idPeriodo]['materias'][$idMateria] = [
            'nombre' => $fila['materia_nombre'],
            'tipos' => [],
        ];
    }
    $actual = $estructura[$idPeriodo]['materias'][$idMateria]['tipos'][$tipo] ?? 0;
    $estructura[$idPeriodo]['materias'][$idMateria]['tipos'][$tipo] = $actual + (float) $fila['valor'];
}

$meses = [
    '01' => 'Enero', '02' => 'Febrero', '03' => 'Marzo', '04' => 'Abril',
    '05' => 'Mayo', '06' => 'Junio', '07' => 'Julio', '08' => 'Agosto',
    '09' => 'Septiembre', '10' => 'Octubre', '11' => 'Noviembre', '12' => 'Diciembre',
];

function formatear_semestre(string $fechaInicio, string $fechaFin, array $meses): string
{
    [$anioIni, $mesIni] = explode('-', $fechaInicio);
    [$anioFin, $mesFin] = explode('-', $fechaFin);

    if ($anioIni === $anioFin) {
        return $meses[$mesIni] . ' - ' . $meses[$mesFin] . ' ' . $anioFin;
    }

    return $meses[$mesIni] . ' ' . $anioIni . ' - ' . $meses[$mesFin] . ' ' . $anioFin;
}

// Ordenar periodos por fecha de inicio
uasort($estructura, function ($a, $b) {
    return strcmp($a['fecha_inicio'], $b['fecha_inicio']);
});

$semestres = [];
$todasLasCalificaciones = [];

foreach ($estructura as $idPeriodo => $datosPeriodo) {
    $materiasSalida = [];
    $sumaSemestre = 0;
    $contadorSemestre = 0;

    foreach ($datosPeriodo['materias'] as $materia) {
        $tipos = $materia['tipos'];

        if (isset($tipos['intersemestral'])) {
            $calificacion = round($tipos['intersemestral'], 2);
        } elseif (isset($tipos['extraordinario'])) {
            $calificacion = round($tipos['extraordinario'], 2);
        } else {
            $parciales = [];
            foreach (['parcial1', 'parcial2', 'parcial3'] as $tipoParcial) {
                if (isset($tipos[$tipoParcial])) {
                    $parciales[] = $tipos[$tipoParcial];
                }
            }
            if (!$parciales) {
                continue;
            }
            $calificacion = round(array_sum($parciales) / count($parciales), 2);
        }

        $materiasSalida[] = ['nombre' => $materia['nombre'], 'calificacion' => $calificacion];
        $sumaSemestre += $calificacion;
        $contadorSemestre++;
        $todasLasCalificaciones[] = $calificacion;
    }

    if (!$materiasSalida) {
        continue;
    }

    $semestres[] = [
        'id_periodo' => $idPeriodo,
        'etiqueta' => formatear_semestre($datosPeriodo['fecha_inicio'], $datosPeriodo['fecha_fin'], $meses),
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
