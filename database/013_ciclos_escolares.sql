-- Migración: se agrega el concepto de Ciclo Escolar (un año calendario, ej.
-- "2024-2025"), distinto de la Generación (periodos_escolares, que abarca los
-- 3 años/6 semestres de una cohorte). Varias generaciones avanzan en paralelo
-- dentro de un mismo ciclo escolar (ej. alumnos de 1°, 3° y 6° semestre, de
-- generaciones distintas, todos activos en el ciclo 2024-2025). Se agrega a
-- grupos y alumnos porque cada instancia de grupo y cada alumno están activos
-- en un ciclo escolar concreto en un momento dado.

CREATE TABLE ciclos_escolares (
  id_ciclo VARCHAR(20) NOT NULL,
  nombre VARCHAR(20) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  PRIMARY KEY (id_ciclo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE grupos
  ADD COLUMN id_ciclo VARCHAR(20) NULL AFTER id_periodo,
  ADD CONSTRAINT fk_grupos_ciclo FOREIGN KEY (id_ciclo) REFERENCES ciclos_escolares(id_ciclo) ON UPDATE CASCADE;

ALTER TABLE alumnos
  ADD COLUMN id_ciclo VARCHAR(20) NULL AFTER id_periodo,
  ADD CONSTRAINT fk_alumnos_ciclo FOREIGN KEY (id_ciclo) REFERENCES ciclos_escolares(id_ciclo) ON UPDATE CASCADE;
