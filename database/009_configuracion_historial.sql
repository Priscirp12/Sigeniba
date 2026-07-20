-- Migración: plantilla de texto editable por el administrador para la leyenda
-- del Historial Académico (nombre de institución, CCT, carrera, etc. varían
-- por institución, así que el texto ya no queda fijo en el código).

CREATE TABLE configuracion_historial (
  id TINYINT NOT NULL PRIMARY KEY,
  plantilla_legenda TEXT NOT NULL
);

INSERT INTO configuracion_historial (id, plantilla_legenda) VALUES (
  1,
  'QUE EL ALUMNO {NOMBRE} SE ENCUENTRA INSCRITO EN EL BACHILLERATO GENERAL DEL COLEGIO DE BACHILLERES DEL ESTADO DE MEXICO (COBACH MEXICO), CON NÚMERO DE MATRÍCULA {MATRICULA}, CON UN PROMEDIO GENERAL DE {PROMEDIO}, OBTENIENDO LAS CALIFICACIONES QUE A CONTINUACIÓN SE ANOTAN:'
);
