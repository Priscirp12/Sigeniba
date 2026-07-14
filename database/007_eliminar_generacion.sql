-- Migración: se elimina el campo "generación" de alumnos. El filtro
-- correspondiente en Grupos → Asignar Alumnos se reemplaza por "Periodo"
-- (columna alumnos.id_periodo, que ya existía).

ALTER TABLE alumnos DROP COLUMN generacion;
