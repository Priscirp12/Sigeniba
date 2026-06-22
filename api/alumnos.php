<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $idGrupo = $_GET['id_grupo'] ?? null;

    if ($idGrupo) {
        $stmt = $pdo->prepare('SELECT a.id_alumno, a.matricula, u.nombre, u.apellidos, a.id_grupo FROM alumnos a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE a.id_grupo = ? ORDER BY u.apellidos, u.nombre');
        $stmt->execute([$idGrupo]);
        echo json_encode($stmt->fetchAll());
    } else {
        $stmt = $pdo->query('SELECT a.id_alumno, a.matricula, u.nombre, u.apellidos, a.id_grupo FROM alumnos a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario ORDER BY u.apellidos, u.nombre');
        echo json_encode($stmt->fetchAll());
    }
}
