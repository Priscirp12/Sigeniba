<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

/**
 * Grupos que hoy tienen alumnos activos, con el grupo al que pasarían en el
 * siguiente semestre (ej. "1A" -> "2A", misma generación) y si pueden avanzar:
 *   listo            -> se puede avanzar
 *   en_curso         -> su generación tiene una ventana de captura activa hoy
 *   ultimo_semestre  -> ya está en 6° semestre
 */
function grupos_para_avance(PDO $pdo): array
{
    $stmt = $pdo->query("SELECT g.id_grupo, g.nombre, g.semestre, g.id_periodo, g.id_ciclo,
                                p.ciclo_escolar AS generacion, c.nombre AS ciclo_escolar,
                                COUNT(a.matricula) AS alumnos,
                                EXISTS (
                                    SELECT 1 FROM ventanas_captura v
                                    WHERE v.id_periodo = g.id_periodo
                                      AND CURDATE() BETWEEN v.fecha_inicio AND v.fecha_fin
                                ) AS en_curso
                         FROM grupos g
                         JOIN alumnos a ON a.id_grupo = g.id_grupo AND a.estatus = 'activo'
                         LEFT JOIN periodos_escolares p ON p.id_periodo = g.id_periodo
                         LEFT JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
                         GROUP BY g.id_grupo
                         ORDER BY g.semestre, g.nombre, p.ciclo_escolar");

    $grupos = [];
    foreach ($stmt->fetchAll() as $grupo) {
        $semestre = (int) $grupo['semestre'];
        $destinoSemestre = $semestre < 6 ? $semestre + 1 : null;
        $destinoNombre = null;
        if ($destinoSemestre !== null) {
            // "1A" -> "2A"; si el nombre no empieza con número se conserva igual.
            $destinoNombre = preg_match('/^(\d+)(.*)$/', $grupo['nombre'], $partes)
                ? ((int) $partes[1] + 1) . $partes[2]
                : $grupo['nombre'];
        }

        if ($destinoSemestre === null) {
            $estado = 'ultimo_semestre';
        } elseif ((int) $grupo['en_curso'] === 1) {
            $estado = 'en_curso';
        } else {
            $estado = 'listo';
        }

        $grupos[] = [
            'id_grupo' => $grupo['id_grupo'],
            'nombre' => $grupo['nombre'],
            'semestre' => $semestre,
            'id_periodo' => $grupo['id_periodo'],
            'id_ciclo' => $grupo['id_ciclo'],
            'generacion' => $grupo['generacion'],
            'ciclo_escolar' => $grupo['ciclo_escolar'],
            'alumnos' => (int) $grupo['alumnos'],
            'destino_nombre' => $destinoNombre,
            'destino_semestre' => $destinoSemestre,
            'estado' => $estado,
        ];
    }
    return $grupos;
}

if ($method === 'GET' && $action === 'avance') {
    echo json_encode(grupos_para_avance($pdo));
    exit;
}

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT g.id_grupo, g.nombre, g.semestre, g.id_periodo, g.id_ciclo, g.clave_tutor,
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
    $idPeriodo = trim($data['id_periodo'] ?? '');
    $idCiclo = $data['id_ciclo'] ?? null;
    $claveTutor = $data['clave_tutor'] ?? null;

    if (!$nombre || !$semestre || !$idPeriodo) {
        send_error('Nombre, semestre y periodo escolar del grupo son requeridos');
    }

    $idGrupo = generate_id('GRP');
    $stmt = $pdo->prepare('INSERT INTO grupos (id_grupo, nombre, semestre, id_periodo, id_ciclo, clave_tutor) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$idGrupo, $nombre, $semestre, $idPeriodo, $idCiclo, $claveTutor]);

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

    // Solo se permite cambiar de grupo a un alumno cuando no tiene ninguna
    // ventana de captura activa hoy (parcial, extraordinario o intersemestral)
    // para su periodo, es decir, cuando el semestre no está en curso.
    $stmt = $pdo->prepare("UPDATE alumnos a
                            SET a.id_grupo = ?
                            WHERE a.matricula IN ($placeholders)
                              AND a.estatus = 'activo'
                              AND NOT EXISTS (
                                  SELECT 1 FROM ventanas_captura v
                                  WHERE v.id_periodo = a.id_periodo
                                    AND CURDATE() BETWEEN v.fecha_inicio AND v.fecha_fin
                              )");
    $stmt->execute(array_merge([$idGrupo], $matriculas));
    $actualizados = $stmt->rowCount();
    $omitidos = count($matriculas) - $actualizados;

    echo json_encode(['success' => true, 'actualizados' => $actualizados, 'omitidos' => $omitidos]);
    exit;
}

if ($method === 'PUT' && $action === 'avanzar_todos') {
    // Se toma una foto de los grupos y de sus alumnos ANTES de mover a nadie,
    // para que un alumno que acaba de pasar de 1A a 2A no vuelva a avanzar
    // cuando se procese 2A en la misma operación.
    $grupos = grupos_para_avance($pdo);
    $matriculasPorGrupo = [];
    $stmt = $pdo->prepare("SELECT matricula FROM alumnos WHERE id_grupo = ? AND estatus = 'activo'");
    foreach ($grupos as $grupo) {
        if ($grupo['estado'] === 'listo') {
            $stmt->execute([$grupo['id_grupo']]);
            $matriculasPorGrupo[$grupo['id_grupo']] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
    }

    $resumen = ['grupos_avanzados' => 0, 'alumnos_avanzados' => 0, 'grupos_en_curso' => 0, 'grupos_ultimo_semestre' => 0];

    $pdo->beginTransaction();
    try {
        $buscarDestino = $pdo->prepare('SELECT id_grupo FROM grupos WHERE nombre = ? AND id_periodo = ? AND semestre = ?');
        $crearDestino = $pdo->prepare('INSERT INTO grupos (id_grupo, nombre, semestre, id_periodo, id_ciclo) VALUES (?, ?, ?, ?, ?)');

        foreach ($grupos as $grupo) {
            if ($grupo['estado'] === 'en_curso') {
                $resumen['grupos_en_curso']++;
                continue;
            }
            if ($grupo['estado'] === 'ultimo_semestre') {
                $resumen['grupos_ultimo_semestre']++;
                continue;
            }

            $matriculas = $matriculasPorGrupo[$grupo['id_grupo']] ?? [];
            if (!$matriculas) {
                continue;
            }

            // El grupo destino conserva el ciclo escolar del grupo actual.
            $idCiclo = $grupo['id_ciclo'];
            $buscarDestino->execute([$grupo['destino_nombre'], $grupo['id_periodo'], $grupo['destino_semestre']]);
            $idGrupoDestino = $buscarDestino->fetchColumn();
            if (!$idGrupoDestino) {
                $idGrupoDestino = generate_id('GRP');
                $crearDestino->execute([$idGrupoDestino, $grupo['destino_nombre'], $grupo['destino_semestre'], $grupo['id_periodo'], $idCiclo]);
            }

            $placeholders = implode(',', array_fill(0, count($matriculas), '?'));
            $mover = $pdo->prepare("UPDATE alumnos SET id_grupo = ?, id_ciclo = COALESCE(?, id_ciclo) WHERE matricula IN ($placeholders)");
            $mover->execute(array_merge([$idGrupoDestino, $idCiclo], $matriculas));

            $resumen['grupos_avanzados']++;
            $resumen['alumnos_avanzados'] += count($matriculas);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo avanzar de semestre: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true] + $resumen);
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
