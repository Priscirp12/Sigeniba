<?php
function read_json_body(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function generate_id(string $prefix): string
{
    return $prefix . strtoupper(bin2hex(random_bytes(4)));
}

function require_method(string $expected): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $expected) {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }
}

function send_error(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function ventana_captura_estado(PDO $pdo, ?string $idPeriodo, string $tipo): array
{
    if (!$idPeriodo) {
        return ['abierta' => false, 'fecha_inicio' => null, 'fecha_fin' => null];
    }

    $stmt = $pdo->prepare('SELECT fecha_inicio, fecha_fin FROM ventanas_captura WHERE id_periodo = ? AND tipo = ?');
    $stmt->execute([$idPeriodo, $tipo]);
    $ventana = $stmt->fetch();

    if (!$ventana) {
        return ['abierta' => false, 'fecha_inicio' => null, 'fecha_fin' => null];
    }

    $hoy = date('Y-m-d');
    $abierta = $hoy >= $ventana['fecha_inicio'] && $hoy <= $ventana['fecha_fin'];

    return ['abierta' => $abierta, 'fecha_inicio' => $ventana['fecha_inicio'], 'fecha_fin' => $ventana['fecha_fin']];
}
