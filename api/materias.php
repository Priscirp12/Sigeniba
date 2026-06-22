<?php
require_once __DIR__ . '/config.php';

$stmt = $pdo->query('SELECT id_materia, nombre, clave, creditos, horas_semana FROM materias ORDER BY nombre');
echo json_encode($stmt->fetchAll());
