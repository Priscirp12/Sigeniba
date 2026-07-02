<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=sigeniba4;charset=utf8mb4', 'root', 'prisci');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$hash = password_hash('admin123456', PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO usuarios (id_usuario, nombre, apellido_paterno, apellido_materno, edad, sexo, password_hash, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), apellido_paterno = VALUES(apellido_paterno), apellido_materno = VALUES(apellido_materno), password_hash = VALUES(password_hash), rol = VALUES(rol)');
$stmt->execute(['admin@gmail.com', 'Administrador', 'Sistema', '', 30, 'M', $hash, 'administrador']);
$check = $pdo->prepare('SELECT id_usuario, rol FROM usuarios WHERE id_usuario = ?');
$check->execute(['admin@gmail.com']);
$row = $check->fetch(PDO::FETCH_ASSOC);
echo json_encode(['ok' => (bool) $row, 'row' => $row], JSON_UNESCAPED_UNICODE);
