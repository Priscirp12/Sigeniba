-- Migración: soporte de esquema para el módulo de Docente

-- 1) Materias: campos que muestran los mockups de docente
ALTER TABLE materias
  ADD COLUMN clave VARCHAR(20) NULL AFTER nombre,
  ADD COLUMN creditos INT NULL AFTER clave,
  ADD COLUMN horas_semana INT NULL AFTER creditos;

-- 2) Grupos: turno
ALTER TABLE grupos
  ADD COLUMN turno ENUM('Matutino','Vespertino') NULL AFTER semestre;

-- 3) Criterios de evaluación: puntos (no %) que suman 10, unificados con los
--    5 tipos de ventana de captura (parcial1/2/3/extraordinario/intersemestral),
--    y bandera para el criterio fijo "Examen" (máximo 5 puntos).
ALTER TABLE criterios_evaluacion
  CHANGE COLUMN parcial tipo ENUM('parcial1','parcial2','parcial3','extraordinario','intersemestral') NOT NULL,
  CHANGE COLUMN porcentaje valor_puntos DECIMAL(4,2) NOT NULL,
  ADD COLUMN es_examen TINYINT(1) NOT NULL DEFAULT 0;

-- 4) Calificaciones: llave única para permitir upsert seguro por alumno+criterio
ALTER TABLE calificaciones_criterios
  ADD UNIQUE KEY uq_alumno_criterio (matricula, id_criterio);
