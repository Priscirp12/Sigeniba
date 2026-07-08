<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = 'SELECT a.matricula, a.id_usuario, a.id_grupo, a.id_periodo, a.generacion, a.email, a.telefono,
                   u.nombre, u.apellido_paterno, u.apellido_materno, u.sexo, u.edad,
                   g.nombre AS grupo_nombre, g.semestre
            FROM alumnos a
            LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
            LEFT JOIN grupos g ON g.id_grupo = a.id_grupo
            WHERE 1 = 1';
    $params = [];

    if (!empty($_GET['generacion'])) {
        $sql .= ' AND a.generacion = ?';
        $params[] = $_GET['generacion'];
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
    $generacion = $data['generacion'] ?? null;
    $email = $data['email'] ?? null;
    $telefono = $data['telefono'] ?? null;
    $idPeriodo = $data['id_periodo'] ?? null;

    if (!$matricula || !$nombre || !$apellidoPaterno || !$password) {
        send_error('Nombre, apellido paterno, matrícula y contraseña son requeridos');
    }

    $stmt = $pdo->prepare('SELECT matricula FROM alumnos WHERE matricula = ?');
    $stmt->execute([$matricula]);
    if ($stmt->fetch()) {
        send_error('Ya existe un alumno con esa matrícula');
    }

    $pdo->beginTransaction();
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO usuarios (id_usuario, nombre, apellido_paterno, apellido_materno, edad, sexo, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$matricula, $nombre, $apellidoPaterno, $apellidoMaterno, $edad, $sexo, $hash, 'alumno']);

        $stmt = $pdo->prepare('INSERT INTO alumnos (matricula, id_usuario, id_periodo, generacion, email, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$matricula, $matricula, $idPeriodo, $generacion, $email, $telefono]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo registrar el alumno: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true, 'matricula' => $matricula]);
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

    $pdo->beginTransaction();
    try {
        if ($nuevaMatricula !== $matricula) {
            $stmt = $pdo->prepare('SELECT matricula FROM alumnos WHERE matricula = ?');
            $stmt->execute([$nuevaMatricula]);
            if ($stmt->fetch()) {
                throw new RuntimeException('Ya existe un alumno con la nueva matrícula');
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
        foreach (['generacion', 'email', 'telefono', 'id_periodo'] as $field) {
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
