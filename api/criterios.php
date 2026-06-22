<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    echo json_encode([]);
    exit;
}

$idGmd = $_GET['id_gmd'] ?? null;

if (!$idGmd) {
    echo json_encode([]);
    exit;
}

$stmt = $pdo->prepare('SELECT id_criterio, id_gmd, nombre, porcentaje, parcial FROM criterios_evaluacion WHERE id_gmd = ? ORDER BY parcial, nombre');
$stmt->execute([$idGmd]);

echo json_encode($stmt->fetchAll());
