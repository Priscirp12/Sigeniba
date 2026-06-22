<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    echo json_encode([]);
    exit;
}

$idGrupo = $_GET['id_grupo'] ?? null;

if (!$idGrupo) {
    echo json_encode([]);
    exit;
}

$stmt = $pdo->prepare('SELECT gmd.id_gmd, gmd.id_grupo, gmd.id_materia, gmd.id_docente, gmd.ciclo_escolar, m.nombre AS materia_nombre FROM grupo_materia_docente gmd LEFT JOIN materias m ON m.id_materia = gmd.id_materia WHERE gmd.id_grupo = ? ORDER BY m.nombre');
$stmt->execute([$idGrupo]);

echo json_encode($stmt->fetchAll());
