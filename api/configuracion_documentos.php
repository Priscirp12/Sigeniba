<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

// Configuración de los documentos generados (actas e historial académico):
// nombres para las firmas y logos de la SEP y del plantel.

const CAMPOS_NOMBRE = ['nombre_director', 'nombre_control_escolar'];
const CAMPOS_LOGO = ['logo_sep', 'logo_plantel'];
const TAMANO_MAXIMO_LOGO = 1500000; // caracteres del data URL (~1.1 MB de imagen)

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT nombre_director, nombre_control_escolar, logo_sep, logo_plantel FROM configuracion_documentos WHERE id = 1');
    $fila = $stmt->fetch() ?: [];

    echo json_encode([
        'nombre_director' => $fila['nombre_director'] ?? null,
        'nombre_control_escolar' => $fila['nombre_control_escolar'] ?? null,
        'logo_sep' => $fila['logo_sep'] ?? null,
        'logo_plantel' => $fila['logo_plantel'] ?? null,
    ]);
    exit;
}

if ($method === 'PUT') {
    $data = read_json_body();
    $sets = [];
    $params = [];

    foreach (CAMPOS_NOMBRE as $campo) {
        if (!array_key_exists($campo, $data)) {
            continue;
        }
        $valor = trim((string) ($data[$campo] ?? ''));
        if (mb_strlen($valor) > 150) {
            send_error('Los nombres no pueden tener más de 150 caracteres');
        }
        $sets[] = "$campo = ?";
        $params[] = $valor !== '' ? $valor : null;
    }

    foreach (CAMPOS_LOGO as $campo) {
        if (!array_key_exists($campo, $data)) {
            continue;
        }
        $valor = $data[$campo];
        if ($valor !== null) {
            if (!is_string($valor) || !preg_match('#^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$#', $valor)) {
                send_error('El logo debe ser una imagen PNG o JPG válida');
            }
            if (strlen($valor) > TAMANO_MAXIMO_LOGO) {
                send_error('El logo es demasiado grande');
            }
        }
        $sets[] = "$campo = ?";
        $params[] = $valor;
    }

    if (!$sets) {
        send_error('No hay cambios que guardar');
    }

    $pdo->exec('INSERT IGNORE INTO configuracion_documentos (id) VALUES (1)');
    $stmt = $pdo->prepare('UPDATE configuracion_documentos SET ' . implode(', ', $sets) . ' WHERE id = 1');
    $stmt->execute($params);

    echo json_encode(['success' => true]);
    exit;
}

send_error('Método no permitido', 405);
