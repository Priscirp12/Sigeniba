<?php
require_once __DIR__ . '/config.php';

$stmt = $pdo->query('SELECT id_docente, clave_docente, especialidad, telefono FROM docentes ORDER BY id_docente');
echo json_encode($stmt->fetchAll());
