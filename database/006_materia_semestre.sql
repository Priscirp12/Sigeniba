-- Migración: en "Gestión de Materias" ya no se selecciona un periodo escolar,
-- ahora se indica directamente el semestre (1-6) en el que se imparte la materia.

ALTER TABLE materias DROP FOREIGN KEY materias_ibfk_1;
ALTER TABLE materias DROP COLUMN id_periodo;
ALTER TABLE materias ADD COLUMN semestre TINYINT NULL AFTER horas_semana;
