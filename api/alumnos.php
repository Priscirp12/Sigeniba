<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'GET') {
    $sql = 'SELECT a.matricula, a.id_usuario, a.id_grupo, a.id_periodo, a.id_ciclo, a.email, a.telefono,
                   a.estatus, a.fecha_baja, a.motivo_baja,
                   u.nombre, u.apellido_paterno, u.apellido_materno, u.sexo, u.edad,
                   g.nombre AS grupo_nombre, g.semestre
            FROM alumnos a
            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
            LEFT JOIN grupos g ON g.id_grupo = a.id_grupo
            WHERE 1 = 1';
    $params = [];

    if (!empty($_GET['id_periodo'])) {
        $sql .= ' AND a.id_periodo = ?';
        $params[] = $_GET['id_periodo'];
    }
    if (!empty($_GET['semestre'])) {
        $sql .= ' AND g.semestre = ?';
        $params[] = $_GET['semestre'];
    }
    if (!empty($_GET['id_grupo'])) {
        $sql .= ' AND a.id_grupo = ?';
        $params[] = $_GET['id_grupo'];
    }
    if (!empty($_GET['sin_grupo'])) {
        $sql .= ' AND a.id_grupo IS NULL';
    }
    if (!empty($_GET['estatus']) && in_array($_GET['estatus'], ['activo', 'inactivo'], true)) {
        $sql .= ' AND a.estatus = ?';
        $params[] = $_GET['estatus'];
    }

    $sql .= ' ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();

    $matricula = trim($data['matricula'] ?? '');
    $nombre = trim($data['nombre'] ?? '');
    $apellidoPaterno = trim($data['apellido_paterno'] ?? '');
    $apellidoMaterno = trim($data['apellido_materno'] ?? '');
    $sexo = $data['sexo'] ?? null;
    $edad = $data['edad'] ?? null;
    $password = $data['password'] ?? '';
    $email = $data['email'] ?? null;
    $telefono = $data['telefono'] ?? null;
    $idPeriodo = $data['id_periodo'] ?? null;
    $idCiclo = $data['id_ciclo'] ?? null;

    if (!$matricula || !$nombre || !$apellidoPaterno || !$edad || !$password) {
        send_error('Nombre, apellido paterno, matrícula, edad y contraseña son requeridos');
    }
    if (!preg_match('/^[A-Za-z0-9-]+$/', $matricula)) {
        send_error('La matrícula solo puede contener letras, números y guiones, sin espacios');
    }
    if ($email && !email_valido($email)) {
        send_error('El correo no tiene un formato válido');
    }
    if ($telefono && !telefono_valido($telefono)) {
        send_error('El teléfono debe tener exactamente 10 dígitos numéricos');
    }

    $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?');
    $stmt->execute([$matricula]);
    if ($stmt->fetch()) {
        send_error('Ya existe un usuario registrado con esa matrícula');
    }

    $pdo->beginTransaction();
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO usuarios (id_usuario, nombre, apellido_paterno, apellido_materno, edad, sexo, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$matricula, $nombre, $apellidoPaterno, $apellidoMaterno, $edad, $sexo, $hash, 'alumno']);

        $stmt = $pdo->prepare('INSERT INTO alumnos (matricula, id_usuario, id_periodo, id_ciclo, email, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$matricula, $matricula, $idPeriodo, $idCiclo, $email, $telefono]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo registrar el alumno: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true, 'matricula' => $matricula]);
    exit;
}

if ($method === 'PUT' && $action === 'baja') {
    $data = read_json_body();
    $matricula = trim($data['matricula'] ?? '');
    $motivo = trim($data['motivo'] ?? '') ?: null;

    if (!$matricula) {
        send_error('Matrícula requerida');
    }

    $stmt = $pdo->prepare('SELECT estatus FROM alumnos WHERE matricula = ?');
    $stmt->execute([$matricula]);
    $alumno = $stmt->fetch();

    if (!$alumno) {
        send_error('Alumno no encontrado', 404);
    }
    if ($alumno['estatus'] === 'inactivo') {
        send_error('El alumno ya se encuentra dado de baja temporal');
    }

    // Se conserva id_grupo para saber de qué grupo salió; las calificaciones ya
    // capturadas se mantienen, pero no se podrán registrar nuevas.
    $stmt = $pdo->prepare("UPDATE alumnos SET estatus = 'inactivo', fecha_baja = CURDATE(), motivo_baja = ? WHERE matricula = ?");
    $stmt->execute([$motivo, $matricula]);

    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'PUT' && $action === 'reincorporar') {
    $data = read_json_body();
    $matricula = trim($data['matricula'] ?? '');
    $idGrupo = trim($data['id_grupo'] ?? '');

    if (!$matricula || !$idGrupo) {
        send_error('Matrícula y grupo nuevo son requeridos');
    }

    $stmt = $pdo->prepare('SELECT estatus, id_grupo FROM alumnos WHERE matricula = ?');
    $stmt->execute([$matricula]);
    $alumno = $stmt->fetch();

    if (!$alumno) {
        send_error('Alumno no encontrado', 404);
    }
    if ($alumno['estatus'] === 'activo') {
        send_error('El alumno ya se encuentra activo');
    }
    if ($alumno['id_grupo'] === $idGrupo) {
        send_error('Selecciona un grupo distinto al que tenía antes de la baja');
    }

    $stmt = $pdo->prepare('SELECT id_periodo, id_ciclo FROM grupos WHERE id_grupo = ?');
    $stmt->execute([$idGrupo]);
    $grupo = $stmt->fetch();

    if (!$grupo) {
        send_error('Grupo no encontrado', 404);
    }

    // El alumno se integra a la generación y ciclo escolar del grupo nuevo.
    $stmt = $pdo->prepare("UPDATE alumnos
                            SET estatus = 'activo', fecha_baja = NULL, motivo_baja = NULL,
                                id_grupo = ?, id_periodo = ?, id_ciclo = COALESCE(?, id_ciclo)
                            WHERE matricula = ?");
    $stmt->execute([$idGrupo, $grupo['id_periodo'], $grupo['id_ciclo'], $matricula]);

    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'PUT') {
    $data = read_json_body();
    $matricula = trim($data['matricula'] ?? '');

    if (!$matricula) {
        send_error('Matrícula requerida');
    }

    $stmt = $pdo->prepare('SELECT id_usuario FROM alumnos WHERE matricula = ?');
    $stmt->execute([$matricula]);
    $alumno = $stmt->fetch();

    if (!$alumno) {
        send_error('Alumno no encontrado', 404);
    }

    $idUsuario = $alumno['id_usuario'];
    $nuevaMatricula = trim($data['nueva_matricula'] ?? '') ?: $matricula;
    if ($nuevaMatricula !== $matricula && !preg_match('/^[A-Za-z0-9-]+$/', $nuevaMatricula)) {
        send_error('La matrícula solo puede contener letras, números y guiones, sin espacios');
    }

    foreach (['nombre', 'apellido_paterno', 'edad'] as $requerido) {
        if (array_key_exists($requerido, $data) && !$data[$requerido]) {
            send_error('Nombre, apellido paterno y edad no pueden quedar vacíos');
        }
    }
    if (!empty($data['email']) && !email_valido($data['email'])) {
        send_error('El correo no tiene un formato válido');
    }
    if (!empty($data['telefono']) && !telefono_valido($data['telefono'])) {
        send_error('El teléfono debe tener exactamente 10 dígitos numéricos');
    }

    $pdo->beginTransaction();
    try {
        if ($nuevaMatricula !== $matricula) {
            $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?');
            $stmt->execute([$nuevaMatricula]);
            if ($stmt->fetch()) {
                throw new RuntimeException('Ya existe un usuario registrado con esa matrícula');
            }
            $pdo->prepare('UPDATE usuarios SET id_usuario = ? WHERE id_usuario = ?')->execute([$nuevaMatricula, $idUsuario]);
            $pdo->prepare('UPDATE alumnos SET matricula = ? WHERE matricula = ?')->execute([$nuevaMatricula, $matricula]);
            $idUsuario = $nuevaMatricula;
        }

        $usuarioSets = [];
        $usuarioParams = [];
        foreach (['nombre', 'apellido_paterno', 'apellido_materno', 'sexo', 'edad'] as $field) {
            if (array_key_exists($field, $data)) {
                $usuarioSets[] = "$field = ?";
                $usuarioParams[] = $data[$field];
            }
        }
        if (!empty($data['password'])) {
            $usuarioSets[] = 'password_hash = ?';
            $usuarioParams[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        if ($usuarioSets) {
            $usuarioParams[] = $idUsuario;
            $pdo->prepare('UPDATE usuarios SET ' . implode(', ', $usuarioSets) . ' WHERE id_usuario = ?')->execute($usuarioParams);
        }

        $alumnoSets = [];
        $alumnoParams = [];
        foreach (['email', 'telefono', 'id_periodo', 'id_ciclo'] as $field) {
            if (array_key_exists($field, $data)) {
                $alumnoSets[] = "$field = ?";
                $alumnoParams[] = $data[$field];
            }
        }
        if ($alumnoSets) {
            $alumnoParams[] = $nuevaMatricula;
            $pdo->prepare('UPDATE alumnos SET ' . implode(', ', $alumnoSets) . ' WHERE matricula = ?')->execute($alumnoParams);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo actualizar el alumno: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true, 'matricula' => $nuevaMatricula]);
    exit;
}

send_error('Método no permitido', 405);
