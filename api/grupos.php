<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

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

if ($method === 'PUT' && $action === 'avanzar_semestre') {
    $data = read_json_body();
    $idGrupoOrigen = trim($data['id_grupo_origen'] ?? '');
    $nombreDestino = trim($data['nombre_grupo_destino'] ?? '');
    $idCicloDestino = $data['id_ciclo_destino'] ?? null;

    if (!$idGrupoOrigen || !$nombreDestino) {
        send_error('id_grupo_origen y nombre_grupo_destino son requeridos');
    }

    $stmt = $pdo->prepare('SELECT semestre, id_periodo FROM grupos WHERE id_grupo = ?');
    $stmt->execute([$idGrupoOrigen]);
    $origen = $stmt->fetch();

    if (!$origen) {
        send_error('Grupo origen no encontrado', 404);
    }
    if ((int) $origen['semestre'] >= 6) {
        send_error('Ese grupo ya está en el último semestre (6°), no se puede avanzar más');
    }

    $semestreDestino = (int) $origen['semestre'] + 1;

    // Reutiliza el grupo destino si ya existe (misma generación + semestre + nombre); si no, lo crea.
    $stmt = $pdo->prepare('SELECT id_grupo FROM grupos WHERE nombre = ? AND id_periodo = ? AND semestre = ?');
    $stmt->execute([$nombreDestino, $origen['id_periodo'], $semestreDestino]);
    $idGrupoDestino = $stmt->fetchColumn();

    $pdo->beginTransaction();
    try {
        if (!$idGrupoDestino) {
            $idGrupoDestino = generate_id('GRP');
            $pdo->prepare('INSERT INTO grupos (id_grupo, nombre, semestre, id_periodo, id_ciclo) VALUES (?, ?, ?, ?, ?)')
                ->execute([$idGrupoDestino, $nombreDestino, $semestreDestino, $origen['id_periodo'], $idCicloDestino]);
        }

        // Misma regla que asignar_alumnos: no se mueve a un alumno con una
        // ventana de captura activa hoy para su periodo (semestre en curso).
        $stmt = $pdo->prepare("UPDATE alumnos a
                                SET a.id_grupo = ?, a.id_ciclo = ?
                                WHERE a.id_grupo = ?
                                  AND a.estatus = 'activo'
                                  AND NOT EXISTS (
                                      SELECT 1 FROM ventanas_captura v
                                      WHERE v.id_periodo = a.id_periodo
                                        AND CURDATE() BETWEEN v.fecha_inicio AND v.fecha_fin
                                  )");
        $stmt->execute([$idGrupoDestino, $idCicloDestino, $idGrupoOrigen]);
        $actualizados = $stmt->rowCount();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM alumnos WHERE id_grupo = ? AND estatus = 'activo'");
        $stmt->execute([$idGrupoOrigen]);
        $restantes = (int) $stmt->fetchColumn();

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo avanzar de semestre: ' . $e->getMessage(), 500);
    }

    echo json_encode([
        'success' => true,
        'id_grupo_destino' => $idGrupoDestino,
        'actualizados' => $actualizados,
        'omitidos' => $restantes,
    ]);
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
