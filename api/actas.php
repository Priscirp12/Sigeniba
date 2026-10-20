<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

// Actas de calificaciones por asignación (materia + grupo).
//   GET  ?id_asignacion=X  -> datos del acta y si ya se puede generar
//   POST {id_asignacion, id_docente} -> registra/actualiza el acta y devuelve sus datos

const CALIFICACION_APROBATORIA = 6;
const PARCIALES = ['parcial1' => 'Parcial 1', 'parcial2' => 'Parcial 2', 'parcial3' => 'Parcial 3'];

function cargar_asignacion(PDO $pdo, string $idAsignacion): array
{
    $stmt = $pdo->prepare('SELECT asa.id_asignacion, asa.id_grupo, asa.id_materia, asa.id_docente, asa.id_periodo,
                                  m.nombre AS materia_nombre, m.clave AS materia_clave,
                                  g.nombre AS grupo_nombre, g.semestre,
                                  p.ciclo_escolar AS generacion,
                                  c.nombre AS ciclo_escolar,
                                  u.nombre AS docente_nombre, u.apellido_paterno AS docente_apellido_paterno,
                                  u.apellido_materno AS docente_apellido_materno
                           FROM asignaciones_academicas asa
                           JOIN grupos g ON g.id_grupo = asa.id_grupo
                           LEFT JOIN materias m ON m.id_materia = asa.id_materia
                           LEFT JOIN periodos_escolares p ON p.id_periodo = asa.id_periodo
                           LEFT JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
                           LEFT JOIN docentes d ON d.id_docente = asa.id_docente
                           LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
                           WHERE asa.id_asignacion = ?');
    $stmt->execute([$idAsignacion]);
    $asignacion = $stmt->fetch();

    if (!$asignacion) {
        send_error('Asignación no encontrada', 404);
    }
    return $asignacion;
}

/**
 * Arma el acta: alumnos activos del grupo con sus 3 parciales, calificación
 * final y tipo de acreditación, más la lista de lo que falta capturar.
 */
function construir_acta(PDO $pdo, array $asignacion): array
{
    $idAsignacion = $asignacion['id_asignacion'];

    // Alumnos del acta: los activos que están hoy en el grupo, más los que ya
    // fueron calificados en esta materia aunque después avanzaron a otro grupo
    // (actas de semestres anteriores). Los que están en baja temporal dentro del
    // grupo no forman parte del acta.
    $stmt = $pdo->prepare("SELECT a.matricula, u.nombre, u.apellido_paterno, u.apellido_materno
                            FROM alumnos a
                            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
                            WHERE (a.id_grupo = ? AND a.estatus = 'activo')
                               OR ((a.id_grupo IS NULL OR a.id_grupo <> ?) AND EXISTS (
                                      SELECT 1 FROM calificaciones_criterios cc
                                      JOIN criterios_evaluacion c ON c.id_criterio = cc.id_criterio
                                      WHERE cc.matricula = a.matricula AND c.id_asignacion = ?
                                  ))
                            ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre");
    $stmt->execute([$asignacion['id_grupo'], $asignacion['id_grupo'], $asignacion['id_asignacion']]);
    $alumnos = $stmt->fetchAll();

    $stmt = $pdo->prepare('SELECT id_criterio, tipo, valor_puntos FROM criterios_evaluacion WHERE id_asignacion = ?');
    $stmt->execute([$idAsignacion]);
    $criteriosPorTipo = [];
    $tipoDeCriterio = [];
    foreach ($stmt->fetchAll() as $criterio) {
        $criteriosPorTipo[$criterio['tipo']][] = $criterio;
        $tipoDeCriterio[$criterio['id_criterio']] = $criterio['tipo'];
    }

    // Suma y número de actividades capturadas por alumno y tipo de evaluación.
    $capturas = [];
    if ($tipoDeCriterio) {
        $placeholders = implode(',', array_fill(0, count($tipoDeCriterio), '?'));
        $stmt = $pdo->prepare("SELECT matricula, id_criterio, valor FROM calificaciones_criterios WHERE id_criterio IN ($placeholders)");
        $stmt->execute(array_keys($tipoDeCriterio));
        foreach ($stmt->fetchAll() as $fila) {
            $tipo = $tipoDeCriterio[$fila['id_criterio']];
            $capturas[$fila['matricula']][$tipo]['suma'] = ($capturas[$fila['matricula']][$tipo]['suma'] ?? 0) + (float) $fila['valor'];
            $capturas[$fila['matricula']][$tipo]['total'] = ($capturas[$fila['matricula']][$tipo]['total'] ?? 0) + 1;
        }
    }

    // --- Validación: los 3 parciales completos para todos los alumnos activos ---
    $faltantes = [];
    if (!$alumnos) {
        $faltantes[] = 'El grupo no tiene alumnos activos ni alumnos calificados en esta materia.';
    }
    foreach (PARCIALES as $tipo => $etiqueta) {
        $criterios = $criteriosPorTipo[$tipo] ?? [];
        if (!$criterios) {
            $faltantes[] = "$etiqueta: no tiene criterios de evaluación.";
            continue;
        }
        $sumaCriterios = round(array_sum(array_column($criterios, 'valor_puntos')), 2);
        if (abs($sumaCriterios - 10) >= 0.01) {
            $faltantes[] = "$etiqueta: los criterios suman $sumaCriterios de 10 puntos.";
            continue;
        }
        $incompletos = 0;
        foreach ($alumnos as $alumno) {
            if (($capturas[$alumno['matricula']][$tipo]['total'] ?? 0) < count($criterios)) {
                $incompletos++;
            }
        }
        if ($incompletos > 0) {
            $faltantes[] = "$etiqueta: faltan calificaciones de $incompletos alumno(s).";
        }
    }

    // --- Filas del acta ---
    $filas = [];
    $acreditados = 0;
    $finales = [];
    foreach ($alumnos as $indice => $alumno) {
        $datos = $capturas[$alumno['matricula']] ?? [];
        $parciales = [];
        foreach (array_keys(PARCIALES) as $tipo) {
            $parciales[$tipo] = isset($datos[$tipo]) ? round($datos[$tipo]['suma'], 2) : null;
        }
        $capturados = array_filter($parciales, fn ($valor) => $valor !== null);
        $regular = $capturados ? round(array_sum($capturados) / count($capturados), 2) : null;
        $extraordinario = isset($datos['extraordinario']) ? round($datos['extraordinario']['suma'], 2) : null;
        $intersemestral = isset($datos['intersemestral']) ? round($datos['intersemestral']['suma'], 2) : null;

        // Misma regla que el historial académico: cuenta la última etapa presentada.
        if ($regular !== null && $regular >= CALIFICACION_APROBATORIA) {
            $final = $regular;
            $tac = 'O';
        } elseif ($intersemestral !== null) {
            $final = $intersemestral;
            $tac = $intersemestral >= CALIFICACION_APROBATORIA ? 'IS' : 'NA';
        } elseif ($extraordinario !== null) {
            $final = $extraordinario;
            $tac = $extraordinario >= CALIFICACION_APROBATORIA ? 'E' : 'NA';
        } else {
            $final = $regular;
            $tac = 'NA';
        }

        if ($tac !== 'NA') {
            $acreditados++;
        }
        if ($final !== null) {
            $finales[] = $final;
        }

        $filas[] = [
            'no' => $indice + 1,
            'matricula' => $alumno['matricula'],
            'nombre' => trim($alumno['apellido_paterno'] . ' ' . ($alumno['apellido_materno'] ?? '') . ' ' . $alumno['nombre']),
            'parcial1' => $parciales['parcial1'],
            'parcial2' => $parciales['parcial2'],
            'parcial3' => $parciales['parcial3'],
            'final' => $final,
            'tac' => $tac,
        ];
    }

    $docente = trim(($asignacion['docente_nombre'] ?? '') . ' ' . ($asignacion['docente_apellido_paterno'] ?? '') . ' ' . ($asignacion['docente_apellido_materno'] ?? ''));

    return [
        'lista' => !$faltantes,
        'faltantes' => $faltantes,
        'encabezado' => [
            'materia' => $asignacion['materia_nombre'],
            'clave' => $asignacion['materia_clave'],
            'grupo' => $asignacion['grupo_nombre'],
            'semestre' => (int) $asignacion['semestre'],
            'generacion' => $asignacion['generacion'],
            'ciclo_escolar' => $asignacion['ciclo_escolar'],
            'docente' => $docente ?: null,
        ],
        'alumnos' => $filas,
        'resumen' => [
            'inscritos' => count($filas),
            'acreditados' => $acreditados,
            'no_acreditados' => count($filas) - $acreditados,
            'promedio_grupo' => $finales ? round(array_sum($finales) / count($finales), 2) : null,
        ],
    ];
}

function acta_registrada(PDO $pdo, string $idAsignacion): ?array
{
    $stmt = $pdo->prepare('SELECT id_acta, fecha_cierre, fecha_actualizacion FROM actas_calificaciones WHERE id_asignacion = ?');
    $stmt->execute([$idAsignacion]);
    $acta = $stmt->fetch();
    if (!$acta) {
        return null;
    }
    return [
        'folio' => sprintf('ACT-%04d', $acta['id_acta']),
        'fecha_cierre' => $acta['fecha_cierre'],
        'fecha_actualizacion' => $acta['fecha_actualizacion'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $idAsignacion = trim($_GET['id_asignacion'] ?? '');
    if (!$idAsignacion) {
        send_error('id_asignacion es requerido');
    }

    $asignacion = cargar_asignacion($pdo, $idAsignacion);
    $acta = construir_acta($pdo, $asignacion);
    $acta['acta'] = acta_registrada($pdo, $idAsignacion);

    echo json_encode($acta);
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();
    $idAsignacion = trim($data['id_asignacion'] ?? '');
    $idDocente = trim($data['id_docente'] ?? '');

    if (!$idAsignacion || !$idDocente) {
        send_error('id_asignacion e id_docente son requeridos');
    }

    $asignacion = cargar_asignacion($pdo, $idAsignacion);
    if ($asignacion['id_docente'] !== $idDocente) {
        send_error('Solo el docente asignado a esta materia puede generar su acta', 403);
    }

    $acta = construir_acta($pdo, $asignacion);
    if (!$acta['lista']) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Aún no se puede generar el acta: faltan calificaciones de los parciales.',
            'faltantes' => $acta['faltantes'],
        ]);
        exit;
    }

    $resumen = $acta['resumen'];

    $pdo->beginTransaction();
    try {
        // Una sola acta por asignación: la primera vez se crea (folio y fecha de
        // cierre); después solo se actualizan los totales.
        $stmt = $pdo->prepare('INSERT INTO actas_calificaciones
                                    (id_asignacion, id_docente, fecha_cierre, fecha_actualizacion, inscritos, acreditados, no_acreditados, promedio_grupo)
                                VALUES (?, ?, CURDATE(), NOW(), ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    id_docente = VALUES(id_docente),
                                    fecha_actualizacion = NOW(),
                                    inscritos = VALUES(inscritos),
                                    acreditados = VALUES(acreditados),
                                    no_acreditados = VALUES(no_acreditados),
                                    promedio_grupo = VALUES(promedio_grupo)');
        $stmt->execute([
            $idAsignacion,
            $idDocente,
            $resumen['inscritos'],
            $resumen['acreditados'],
            $resumen['no_acreditados'],
            $resumen['promedio_grupo'],
        ]);

        // Calificación final oficial de cada alumno en el historial académico.
        $borrar = $pdo->prepare('DELETE FROM historial_academico WHERE matricula = ? AND id_materia = ? AND id_periodo = ? AND semestre = ?');
        $insertar = $pdo->prepare('INSERT INTO historial_academico (id_historial, matricula, id_materia, id_periodo, semestre, calificacion_final)
                                    VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($acta['alumnos'] as $fila) {
            $claves = [$fila['matricula'], $asignacion['id_materia'], $asignacion['id_periodo'], $asignacion['semestre']];
            $borrar->execute($claves);
            $insertar->execute(array_merge([generate_id('HIS')], $claves, [$fila['final']]));
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo registrar el acta: ' . $e->getMessage(), 500);
    }

    $acta['acta'] = acta_registrada($pdo, $idAsignacion);
    $acta['success'] = true;

    echo json_encode($acta);
    exit;
}

send_error('Método no permitido', 405);
