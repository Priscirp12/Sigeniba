<?php
require_once __DIR__ . '/config.php';

$stmt = $pdo->query('SELECT id_grupo, nombre, grado, semestre, turno, ciclo_escolar, id_tutor FROM grupos ORDER BY grado, nombre');
echo json_encode($stmt->fetchAll());
