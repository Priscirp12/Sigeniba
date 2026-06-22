<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $idGmd = $_GET['id_gmd'] ?? null;
    $parcial = $_GET['parcial'] ?? 1;

    if (!$idGmd) {
        echo json_encode([]);
        exit;
    }

    $stmt = $pdo->prepare('SELECT c.id_criterio, c.nombre, c.porcentaje, c.parcial FROM criterios_evaluacion c WHERE c.id_gmd = ? AND c.parcial = ? ORDER BY c.id_criterio');
    $stmt->execute([$idGmd, $parcial]);
    $criterios = $stmt->fetchAll();

    $stmt = $pdo->prepare('SELECT a.id_alumno, a.id_grupo, u.nombre, u.apellidos, a.matricula FROM alumnos a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE a.id_grupo = (SELECT id_grupo FROM grupo_materia_docente WHERE id_gmd = ?) ORDER BY u.apellidos, u.nombre');
    $stmt->execute([$idGmd]);
    $alumnos = $stmt->fetchAll();

    $stmt = $pdo->prepare('SELECT id_alumno, id_criterio, valor, parcial FROM calificaciones WHERE id_gmd = ? AND parcial = ?');
    $stmt->execute([$idGmd, $parcial]);
    $calificaciones = $stmt->fetchAll();

    $calificacionesMap = [];
    foreach ($calificaciones as $row) {
        $calificacionesMap[$row['id_alumno']][$row['id_criterio']] = (float)$row['valor'];
    }

    $result = [];
    foreach ($alumnos as $alumno) {
        $promedio = 0;
        $sumaPesada = 0;
        $totalPorcentaje = 0;

        foreach ($criterios as $criterio) {
            $nota = $calificacionesMap[$alumno['id_alumno']][$criterio['id_criterio']] ?? null;
            if ($nota !== null) {
                $sumaPesada += $nota * (float)$criterio['porcentaje'];
                $totalPorcentaje += (float)$criterio['porcentaje'];
            }
        }

        if ($totalPorcentaje > 0) {
            $promedio = round($sumaPesada / $totalPorcentaje, 2);
        }

        $result[] = [
            'alumno' => $alumno,
            'criterios' => $criterios,
            'calificaciones' => $calificacionesMap[$alumno['id_alumno']] ?? [],
            'promedio' => $promedio,
        ];
    }

    echo json_encode($result);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $idAlumno = $data['id_alumno'] ?? null;
    $idGmd = $data['id_gmd'] ?? null;
    $idCriterio = $data['id_criterio'] ?? null;
    $valor = $data['valor'] ?? null;
    $parcial = $data['parcial'] ?? 1;
    $idDocente = $data['id_docente'] ?? 'D1';

    if (!$idAlumno || !$idGmd || !$idCriterio || $valor === null) {
        echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id_calificacion FROM calificaciones WHERE id_alumno = ? AND id_criterio = ? AND parcial = ? LIMIT 1');
    $stmt->execute([$idAlumno, $idCriterio, $parcial]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('UPDATE calificaciones SET valor = ?, id_gmd = ?, id_docente = ? WHERE id_calificacion = ?');
        $stmt->execute([$valor, $idGmd, $idDocente, $existing['id_calificacion']]);
    } else {
        $idCalificacion = 'CAL' . bin2hex(random_bytes(4));
        $stmt = $pdo->prepare('INSERT INTO calificaciones (id_calificacion, id_alumno, id_gmd, id_criterio, valor, parcial, fecha_registro, id_docente) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)');
        $stmt->execute([$idCalificacion, $idAlumno, $idGmd, $idCriterio, $valor, $parcial, $idDocente]);
    }

    echo json_encode(['success' => true]);
}
