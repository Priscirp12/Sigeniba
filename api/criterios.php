<?php
// Endpoint de criterios de evaluación: cada asignación (materia+grupo+docente+periodo)
// define, por cada tipo de evaluación (parcial1/2/3, extraordinario, intersemestral),
// un conjunto de criterios cuyos puntos deben sumar 10 (ej. Examen 5 + Tareas 3 +
// Participación 2). El criterio "Examen" es fijo: se crea automáticamente y no se
// puede eliminar, solo editar su valor (máximo 5 puntos).
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$tiposValidos = ['parcial1', 'parcial2', 'parcial3', 'extraordinario', 'intersemestral'];

// Devuelve los criterios ya guardados de una asignación y tipo de evaluación,
// con el criterio "Examen" siempre primero.
function obtener_criterios(PDO $pdo, string $idAsignacion, string $tipo): array
{
    $stmt = $pdo->prepare('SELECT id_criterio, id_asignacion, nombre, valor_puntos, tipo, es_examen
                            FROM criterios_evaluacion
                            WHERE id_asignacion = ? AND tipo = ?
                            ORDER BY es_examen DESC, nombre');
    $stmt->execute([$idAsignacion, $tipo]);
    return $stmt->fetchAll();
}

// GET: consulta los criterios de una asignación+tipo. Si es la primera vez que se
// piden (no existe ninguno todavía), crea automáticamente el criterio fijo "Examen"
// (5 puntos) antes de responder, para que el docente siempre parta de ese criterio
// ya existente. También informa si ese tipo ya tiene calificaciones capturadas,
// dato que el frontend usa para bloquear la edición de los criterios.
if ($method === 'GET') {
    $idAsignacion = $_GET['id_asignacion'] ?? null;
    $tipo = $_GET['tipo'] ?? null;

    if (!$idAsignacion || !in_array($tipo, $tiposValidos, true)) {
        send_error('id_asignacion y un tipo válido son requeridos');
    }

    $criterios = obtener_criterios($pdo, $idAsignacion, $tipo);

    if (!$criterios) {
        $idCriterio = generate_id('CRI');
        $stmt = $pdo->prepare('INSERT INTO criterios_evaluacion (id_criterio, id_asignacion, nombre, valor_puntos, tipo, es_examen) VALUES (?, ?, ?, ?, ?, 1)');
        $stmt->execute([$idCriterio, $idAsignacion, 'Examen', 5, $tipo]);
        $criterios = obtener_criterios($pdo, $idAsignacion, $tipo);
    }

    echo json_encode([
        'criterios' => $criterios,
        'tiene_calificaciones' => tiene_calificaciones_capturadas($pdo, $idAsignacion, $tipo),
    ]);
    exit;
}

// POST: agrega un criterio nuevo (no-"Examen") a una asignación+tipo. Antes de
// insertar valida que: (1) ese tipo no tenga ya calificaciones capturadas (si las
// tiene, los criterios quedan bloqueados hasta vaciarlas), y (2) la suma de los
// criterios existentes más el nuevo no rebase los 10 puntos permitidos.
if ($method === 'POST') {
    $data = read_json_body();
    $idAsignacion = $data['id_asignacion'] ?? null;
    $tipo = $data['tipo'] ?? null;
    $nombre = trim($data['nombre'] ?? '');
    $valorPuntos = $data['valor_puntos'] ?? null;

    if (!$idAsignacion || !in_array($tipo, $tiposValidos, true) || !$nombre || $valorPuntos === null) {
        send_error('id_asignacion, tipo, nombre y valor_puntos son requeridos');
    }

    if ((float) $valorPuntos <= 0) {
        send_error('El valor en puntos debe ser mayor a 0');
    }

    if (tiene_calificaciones_capturadas($pdo, $idAsignacion, $tipo)) {
        send_error('Ya hay calificaciones capturadas para esta evaluación. Vacíalas primero desde Captura de Calificaciones para poder modificar los criterios.', 409);
    }

    $stmt = $pdo->prepare('SELECT COALESCE(SUM(valor_puntos), 0) AS suma FROM criterios_evaluacion WHERE id_asignacion = ? AND tipo = ?');
    $stmt->execute([$idAsignacion, $tipo]);
    $suma = (float) $stmt->fetch()['suma'];

    if ($suma + (float) $valorPuntos > 10) {
        send_error('La suma de los criterios no puede exceder 10 puntos (llevas ' . round($suma, 2) . ')');
    }

    $idCriterio = generate_id('CRI');
    $stmt = $pdo->prepare('INSERT INTO criterios_evaluacion (id_criterio, id_asignacion, nombre, valor_puntos, tipo, es_examen) VALUES (?, ?, ?, ?, ?, 0)');
    $stmt->execute([$idCriterio, $idAsignacion, $nombre, $valorPuntos, $tipo]);

    echo json_encode(['success' => true, 'id_criterio' => $idCriterio]);
    exit;
}

// PUT: edita el valor en puntos (y, si no es el criterio "Examen", también el
// nombre) de un criterio existente. Igual que en POST, bloquea el cambio si ya
// hay calificaciones capturadas, revisa que "Examen" no pase de 5 puntos, y que
// el resto de criterios más el nuevo valor no exceda la suma de 10.
if ($method === 'PUT') {
    $data = read_json_body();
    $idCriterio = $data['id_criterio'] ?? null;
    $valorPuntos = $data['valor_puntos'] ?? null;

    if (!$idCriterio || $valorPuntos === null) {
        send_error('id_criterio y valor_puntos son requeridos');
    }

    if ((float) $valorPuntos <= 0) {
        send_error('El valor en puntos debe ser mayor a 0');
    }

    $stmt = $pdo->prepare('SELECT id_asignacion, tipo, es_examen FROM criterios_evaluacion WHERE id_criterio = ?');
    $stmt->execute([$idCriterio]);
    $criterio = $stmt->fetch();

    if (!$criterio) {
        send_error('Criterio no encontrado', 404);
    }

    if (tiene_calificaciones_capturadas($pdo, $criterio['id_asignacion'], $criterio['tipo'])) {
        send_error('Ya hay calificaciones capturadas para esta evaluación. Vacíalas primero desde Captura de Calificaciones para poder modificar los criterios.', 409);
    }

    if ($criterio['es_examen'] && (float) $valorPuntos > 5) {
        send_error('El criterio de Examen no puede superar los 5 puntos');
    }

    $stmt = $pdo->prepare('SELECT COALESCE(SUM(valor_puntos), 0) AS suma FROM criterios_evaluacion WHERE id_asignacion = ? AND tipo = ? AND id_criterio != ?');
    $stmt->execute([$criterio['id_asignacion'], $criterio['tipo'], $idCriterio]);
    $suma = (float) $stmt->fetch()['suma'];

    if ($suma + (float) $valorPuntos > 10) {
        send_error('La suma de los criterios no puede exceder 10 puntos (el resto suma ' . round($suma, 2) . ')');
    }

    // El nombre del criterio "Examen" es fijo; solo se permite renombrar los demás.
    $sets = ['valor_puntos = ?'];
    $params = [$valorPuntos];
    if (!$criterio['es_examen'] && array_key_exists('nombre', $data) && trim($data['nombre']) !== '') {
        $sets[] = 'nombre = ?';
        $params[] = trim($data['nombre']);
    }
    $params[] = $idCriterio;

    $stmt = $pdo->prepare('UPDATE criterios_evaluacion SET ' . implode(', ', $sets) . ' WHERE id_criterio = ?');
    $stmt->execute($params);

    echo json_encode(['success' => true]);
    exit;
}

// DELETE: elimina un criterio (nunca el de "Examen", que es fijo), siempre que
// esa evaluación no tenga ya calificaciones capturadas. El try/catch es un
// respaldo por si la base de datos rechaza el borrado (ej. por una llave foránea)
// aunque la validación anterior ya debería haberlo evitado.
if ($method === 'DELETE') {
    $idCriterio = $_GET['id_criterio'] ?? null;

    if (!$idCriterio) {
        send_error('id_criterio requerido');
    }

    $stmt = $pdo->prepare('SELECT id_asignacion, tipo, es_examen FROM criterios_evaluacion WHERE id_criterio = ?');
    $stmt->execute([$idCriterio]);
    $criterio = $stmt->fetch();

    if (!$criterio) {
        send_error('Criterio no encontrado', 404);
    }

    if ($criterio['es_examen']) {
        send_error('No se puede eliminar el criterio de Examen');
    }

    if (tiene_calificaciones_capturadas($pdo, $criterio['id_asignacion'], $criterio['tipo'])) {
        send_error('Ya hay calificaciones capturadas para esta evaluación. Vacíalas primero desde Captura de Calificaciones para poder modificar los criterios.', 409);
    }

    try {
        $pdo->prepare('DELETE FROM criterios_evaluacion WHERE id_criterio = ?')->execute([$idCriterio]);
    } catch (Throwable $e) {
        send_error('No se puede eliminar: ya tiene calificaciones capturadas', 409);
    }

    echo json_encode(['success' => true]);
    exit;
}

// Cualquier otro método HTTP no está soportado en este endpoint.
send_error('Método no permitido', 405);
