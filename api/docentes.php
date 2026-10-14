<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT d.id_docente, d.id_usuario, d.especialidad, d.email, d.telefono,
                                 u.nombre, u.apellido_paterno, u.apellido_materno, u.sexo, u.edad
                          FROM docentes d
                          LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
                          ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre');
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = read_json_body();

    $idDocente = trim($data['id_docente'] ?? '');
    $nombre = trim($data['nombre'] ?? '');
    $apellidoPaterno = trim($data['apellido_paterno'] ?? '');
    $apellidoMaterno = trim($data['apellido_materno'] ?? '');
    $sexo = $data['sexo'] ?? null;
    $edad = $data['edad'] ?? null;
    $password = $data['password'] ?? '';
    $especialidad = $data['especialidad'] ?? null;
    $email = $data['email'] ?? null;
    $telefono = $data['telefono'] ?? null;

    if (!$idDocente || !$nombre || !$apellidoPaterno || !$edad || !$password || !$especialidad) {
        send_error('Nombre, apellido paterno, clave de docente, edad, especialidad y contraseña son requeridos');
    }
    if ($email && !email_valido($email)) {
        send_error('El correo no tiene un formato válido');
    }
    if ($telefono && !telefono_valido($telefono)) {
        send_error('El teléfono debe tener exactamente 10 dígitos numéricos');
    }

    $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?');
    $stmt->execute([$idDocente]);
    if ($stmt->fetch()) {
        send_error('Ya existe un usuario registrado con esa clave');
    }

    $pdo->beginTransaction();
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO usuarios (id_usuario, nombre, apellido_paterno, apellido_materno, edad, sexo, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$idDocente, $nombre, $apellidoPaterno, $apellidoMaterno, $edad, $sexo, $hash, 'docente']);

        $stmt = $pdo->prepare('INSERT INTO docentes (id_docente, id_usuario, especialidad, email, telefono) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$idDocente, $idDocente, $especialidad, $email, $telefono]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo registrar el docente: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true, 'id_docente' => $idDocente]);
    exit;
}

if ($method === 'PUT') {
    $data = read_json_body();
    $idDocente = trim($data['id_docente'] ?? '');

    if (!$idDocente) {
        send_error('Clave de docente requerida');
    }

    $stmt = $pdo->prepare('SELECT id_usuario FROM docentes WHERE id_docente = ?');
    $stmt->execute([$idDocente]);
    $docente = $stmt->fetch();

    if (!$docente) {
        send_error('Docente no encontrado', 404);
    }

    $idUsuario = $docente['id_usuario'];
    $nuevaClave = trim($data['nueva_clave'] ?? '') ?: $idDocente;

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
        if ($nuevaClave !== $idDocente) {
            $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = ?');
            $stmt->execute([$nuevaClave]);
            if ($stmt->fetch()) {
                throw new RuntimeException('Ya existe un usuario registrado con esa clave');
            }
            $pdo->prepare('UPDATE usuarios SET id_usuario = ? WHERE id_usuario = ?')->execute([$nuevaClave, $idUsuario]);
            $pdo->prepare('UPDATE docentes SET id_docente = ? WHERE id_docente = ?')->execute([$nuevaClave, $idDocente]);
            $idUsuario = $nuevaClave;
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

        $docenteSets = [];
        $docenteParams = [];
        foreach (['especialidad', 'email', 'telefono'] as $field) {
            if (array_key_exists($field, $data)) {
                $docenteSets[] = "$field = ?";
                $docenteParams[] = $data[$field];
            }
        }
        if ($docenteSets) {
            $docenteParams[] = $nuevaClave;
            $pdo->prepare('UPDATE docentes SET ' . implode(', ', $docenteSets) . ' WHERE id_docente = ?')->execute($docenteParams);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_error('No se pudo actualizar el docente: ' . $e->getMessage(), 500);
    }

    echo json_encode(['success' => true, 'id_docente' => $nuevaClave]);
    exit;
}

send_error('Método no permitido', 405);
