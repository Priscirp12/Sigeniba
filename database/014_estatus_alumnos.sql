-- Migración: baja temporal de alumnos. Un alumno que pausa sus estudios pasa
-- de "activo" a "inactivo"; mientras esté inactivo no se le pueden registrar
-- calificaciones ni moverlo de grupo. Al reincorporarse vuelve a "activo" y se
-- le asigna un grupo nuevo. Las calificaciones ya capturadas se conservan.

ALTER TABLE alumnos
  ADD COLUMN estatus ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo' AFTER telefono,
  ADD COLUMN fecha_baja DATE NULL AFTER estatus,
  ADD COLUMN motivo_baja VARCHAR(255) NULL AFTER fecha_baja;
