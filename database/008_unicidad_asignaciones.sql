-- Migración: una materia no puede asignarse dos veces al mismo grupo dentro
-- del mismo periodo escolar (protección a nivel de base de datos, además de
-- la validación que ya hace api/asignaciones.php).

ALTER TABLE asignaciones_academicas
  ADD UNIQUE KEY uq_grupo_materia_periodo (id_grupo, id_materia, id_periodo);
