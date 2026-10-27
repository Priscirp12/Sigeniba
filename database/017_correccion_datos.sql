-- Corrección de datos capturados antes de que el sistema validara estas reglas.
-- Es idempotente: si no hay datos que corregir, no hace nada.
--
-- 1) El criterio "Examen" vale como máximo 5 puntos. Los que valían más se
--    dividen en Examen (5 pts) + "Trabajo" (el resto), y cada calificación ya
--    capturada se reparte en la misma proporción, así que la calificación de
--    cada alumno en esa evaluación NO cambia.
-- 2) Una materia solo puede asignarse a un grupo de su mismo semestre. Las
--    asignaciones que no cumplen se eliminan junto con sus criterios,
--    calificaciones, acta e historial oficial.

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) Examen > 5 puntos
-- ---------------------------------------------------------------------------
CREATE TEMPORARY TABLE tmp_examen_excedido AS
SELECT id_criterio,
       id_asignacion,
       tipo,
       valor_puntos,
       CONCAT('CRI', UPPER(LEFT(MD5(CONCAT(id_criterio, '-trabajo')), 10))) AS id_criterio_trabajo
FROM criterios_evaluacion
WHERE es_examen = 1 AND valor_puntos > 5;

INSERT INTO criterios_evaluacion (id_criterio, id_asignacion, nombre, valor_puntos, tipo, es_examen)
SELECT id_criterio_trabajo, id_asignacion, 'Trabajo', valor_puntos - 5, tipo, 0
FROM tmp_examen_excedido;

-- Parte proporcional de cada calificación que corresponde al nuevo criterio "Trabajo".
INSERT INTO calificaciones_criterios (id_calificacion, matricula, id_criterio, valor, fecha_registro)
SELECT CONCAT('CAL', UPPER(LEFT(MD5(CONCAT(cc.id_calificacion, '-trabajo')), 10))),
       cc.matricula,
       t.id_criterio_trabajo,
       ROUND(cc.valor - ROUND(cc.valor * 5 / t.valor_puntos, 2), 2),
       cc.fecha_registro
FROM calificaciones_criterios cc
JOIN tmp_examen_excedido t ON t.id_criterio = cc.id_criterio;

UPDATE calificaciones_criterios cc
JOIN tmp_examen_excedido t ON t.id_criterio = cc.id_criterio
SET cc.valor = ROUND(cc.valor * 5 / t.valor_puntos, 2);

UPDATE criterios_evaluacion c
JOIN tmp_examen_excedido t ON t.id_criterio = c.id_criterio
SET c.valor_puntos = 5;

DROP TEMPORARY TABLE tmp_examen_excedido;

-- ---------------------------------------------------------------------------
-- 2) Asignaciones con materia de otro semestre
-- ---------------------------------------------------------------------------
CREATE TEMPORARY TABLE tmp_asignacion_invalida AS
SELECT a.id_asignacion, a.id_materia, a.id_periodo, g.semestre
FROM asignaciones_academicas a
JOIN grupos g ON g.id_grupo = a.id_grupo
JOIN materias m ON m.id_materia = a.id_materia
WHERE m.semestre IS NOT NULL AND m.semestre <> g.semestre;

DELETE cc FROM calificaciones_criterios cc
JOIN criterios_evaluacion c ON c.id_criterio = cc.id_criterio
JOIN tmp_asignacion_invalida t ON t.id_asignacion = c.id_asignacion;

DELETE c FROM criterios_evaluacion c
JOIN tmp_asignacion_invalida t ON t.id_asignacion = c.id_asignacion;

DELETE h FROM historial_academico h
JOIN tmp_asignacion_invalida t
  ON t.id_materia = h.id_materia AND t.id_periodo = h.id_periodo AND t.semestre = h.semestre;

DELETE x FROM actas_calificaciones x
JOIN tmp_asignacion_invalida t ON t.id_asignacion = x.id_asignacion;

DELETE a FROM asignaciones_academicas a
JOIN tmp_asignacion_invalida t ON t.id_asignacion = a.id_asignacion;

DROP TEMPORARY TABLE tmp_asignacion_invalida;

COMMIT;
