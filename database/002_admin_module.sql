-- Migración: soporte de esquema para el módulo de Administrador
-- 1) Vínculo alumno -> grupo (hoy no existía forma de asignar un alumno a un grupo)
ALTER TABLE alumnos
  ADD COLUMN id_grupo VARCHAR(20) NULL AFTER id_usuario;

ALTER TABLE alumnos
  ADD CONSTRAINT fk_alumnos_grupo FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON UPDATE CASCADE;

-- 2) Ventanas de fecha de captura de calificaciones (parciales, extraordinario, intersemestral) por periodo
CREATE TABLE ventanas_captura (
  id_ventana VARCHAR(20) NOT NULL,
  id_periodo VARCHAR(20) NOT NULL,
  tipo ENUM('parcial1','parcial2','parcial3','extraordinario','intersemestral') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  PRIMARY KEY (id_ventana),
  UNIQUE KEY uq_periodo_tipo (id_periodo, tipo),
  CONSTRAINT fk_ventanas_periodo FOREIGN KEY (id_periodo) REFERENCES periodos_escolares(id_periodo) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Permitir renombrar llaves primarias editables desde el admin (matrícula, id_docente, id_usuario)
--    sin romper las referencias existentes.
ALTER TABLE alumnos DROP FOREIGN KEY alumnos_ibfk_1;
ALTER TABLE alumnos ADD CONSTRAINT alumnos_ibfk_1 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE;

ALTER TABLE docentes DROP FOREIGN KEY docentes_ibfk_1;
ALTER TABLE docentes ADD CONSTRAINT docentes_ibfk_1 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE;

ALTER TABLE calificaciones_criterios DROP FOREIGN KEY calificaciones_criterios_ibfk_1;
ALTER TABLE calificaciones_criterios ADD CONSTRAINT calificaciones_criterios_ibfk_1 FOREIGN KEY (matricula) REFERENCES alumnos(matricula) ON UPDATE CASCADE;

ALTER TABLE historial_academico DROP FOREIGN KEY historial_academico_ibfk_1;
ALTER TABLE historial_academico ADD CONSTRAINT historial_academico_ibfk_1 FOREIGN KEY (matricula) REFERENCES alumnos(matricula) ON UPDATE CASCADE;

ALTER TABLE grupos DROP FOREIGN KEY grupos_ibfk_1;
ALTER TABLE grupos ADD CONSTRAINT grupos_ibfk_1 FOREIGN KEY (clave_tutor) REFERENCES docentes(id_docente) ON UPDATE CASCADE;

ALTER TABLE asignaciones_academicas DROP FOREIGN KEY asignaciones_academicas_ibfk_3;
ALTER TABLE asignaciones_academicas ADD CONSTRAINT asignaciones_academicas_ibfk_3 FOREIGN KEY (id_docente) REFERENCES docentes(id_docente) ON UPDATE CASCADE;
