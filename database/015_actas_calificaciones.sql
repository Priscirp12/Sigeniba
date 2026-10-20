-- Migración: actas de calificaciones. El docente genera el acta de una
-- asignación (materia + grupo) desde "Mis Grupos" una vez que capturó todas
-- las calificaciones de los 3 parciales. Cada asignación tiene una sola acta;
-- el folio (ACT-0001, ACT-0002, ...) sale de id_acta y la fecha de cierre es
-- la de la primera generación. Si se vuelve a generar (ej. después de un
-- extraordinario) se conserva el folio y se actualizan los totales.
--
-- Al generar el acta también se guarda en historial_academico la calificación
-- final oficial de cada alumno en esa materia.

CREATE TABLE actas_calificaciones (
  id_acta INT NOT NULL AUTO_INCREMENT,
  id_asignacion VARCHAR(20) NOT NULL,
  id_docente VARCHAR(20) NOT NULL,
  fecha_cierre DATE NOT NULL,
  fecha_actualizacion DATETIME NOT NULL,
  inscritos INT NOT NULL,
  acreditados INT NOT NULL,
  no_acreditados INT NOT NULL,
  promedio_grupo DECIMAL(4,2) NULL,
  PRIMARY KEY (id_acta),
  UNIQUE KEY uq_actas_asignacion (id_asignacion),
  CONSTRAINT fk_actas_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignaciones_academicas(id_asignacion) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
