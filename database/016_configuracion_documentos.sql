-- Migración: datos que el administrador configura para los documentos que
-- genera el sistema (actas de calificaciones e historial académico):
-- nombres para las firmas del acta y logos de la SEP y del plantel.
-- Los logos se guardan como data URL (PNG ya redimensionado por el frontend)
-- para no depender de carpetas con permisos de escritura en el servidor.

CREATE TABLE configuracion_documentos (
  id TINYINT NOT NULL PRIMARY KEY,
  nombre_director VARCHAR(150) NULL,
  nombre_control_escolar VARCHAR(150) NULL,
  logo_sep MEDIUMTEXT NULL,
  logo_plantel MEDIUMTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracion_documentos (id) VALUES (1);
