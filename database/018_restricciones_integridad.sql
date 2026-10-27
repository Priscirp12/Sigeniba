-- Restricciones de integridad en la propia base de datos. La API ya valida
-- estas reglas; esto es una segunda barrera para que ni una edición directa en
-- phpMyAdmin pueda dejar datos imposibles (ej. una calificación de 12).
-- Ejecutar DESPUÉS de 017_correccion_datos.sql.

-- ---------------------------------------------------------------------------
-- Parte 1: rangos (CHECK). Requiere MySQL 8.0.16+ o MariaDB 10.2+.
-- ---------------------------------------------------------------------------
ALTER TABLE calificaciones_criterios
  ADD CONSTRAINT chk_calificacion_rango CHECK (valor IS NULL OR (valor >= 0 AND valor <= 10));

ALTER TABLE criterios_evaluacion
  ADD CONSTRAINT chk_criterio_puntos CHECK (valor_puntos > 0 AND valor_puntos <= 10),
  ADD CONSTRAINT chk_criterio_examen CHECK (es_examen = 0 OR valor_puntos <= 5);

ALTER TABLE historial_academico
  ADD CONSTRAINT chk_historial_rango CHECK (calificacion_final IS NULL OR (calificacion_final >= 0 AND calificacion_final <= 10));

ALTER TABLE grupos
  ADD CONSTRAINT chk_grupo_semestre CHECK (semestre BETWEEN 1 AND 6);

ALTER TABLE actas_calificaciones
  ADD CONSTRAINT chk_acta_totales CHECK (inscritos >= 0 AND acreditados >= 0 AND no_acreditados >= 0 AND acreditados + no_acreditados = inscritos),
  ADD CONSTRAINT chk_acta_promedio CHECK (promedio_grupo IS NULL OR (promedio_grupo >= 0 AND promedio_grupo <= 10));

ALTER TABLE ventanas_captura
  ADD CONSTRAINT chk_ventana_fechas CHECK (fecha_fin >= fecha_inicio);

-- ---------------------------------------------------------------------------
-- Parte 2: reglas entre tablas (TRIGGERS).
-- En un hosting compartido sin permiso para crear triggers, esta parte puede
-- omitirse: la API aplica las mismas reglas.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_calificacion_valida_ins;
DROP TRIGGER IF EXISTS trg_calificacion_valida_upd;
DROP TRIGGER IF EXISTS trg_criterio_suma_ins;
DROP TRIGGER IF EXISTS trg_criterio_suma_upd;

DELIMITER $$

-- Una calificación no puede exceder el valor de su criterio, y no se pueden
-- registrar calificaciones a un alumno en baja temporal.
CREATE TRIGGER trg_calificacion_valida_ins BEFORE INSERT ON calificaciones_criterios
FOR EACH ROW
BEGIN
  DECLARE maximo DECIMAL(5,2);
  SELECT valor_puntos INTO maximo FROM criterios_evaluacion WHERE id_criterio = NEW.id_criterio;
  IF NEW.valor IS NOT NULL AND (NEW.valor < 0 OR NEW.valor > maximo) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La calificación excede el valor del criterio';
  END IF;
  IF (SELECT estatus FROM alumnos WHERE matricula = NEW.matricula) = 'inactivo' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El alumno está dado de baja temporal';
  END IF;
END$$

CREATE TRIGGER trg_calificacion_valida_upd BEFORE UPDATE ON calificaciones_criterios
FOR EACH ROW
BEGIN
  DECLARE maximo DECIMAL(5,2);
  SELECT valor_puntos INTO maximo FROM criterios_evaluacion WHERE id_criterio = NEW.id_criterio;
  IF NEW.valor IS NOT NULL AND (NEW.valor < 0 OR NEW.valor > maximo) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La calificación excede el valor del criterio';
  END IF;
  IF (SELECT estatus FROM alumnos WHERE matricula = NEW.matricula) = 'inactivo' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El alumno está dado de baja temporal';
  END IF;
END$$

-- Los criterios de una misma evaluación no pueden sumar más de 10 puntos.
CREATE TRIGGER trg_criterio_suma_ins BEFORE INSERT ON criterios_evaluacion
FOR EACH ROW
BEGIN
  IF (SELECT COALESCE(SUM(valor_puntos), 0) FROM criterios_evaluacion
      WHERE id_asignacion = NEW.id_asignacion AND tipo = NEW.tipo) + NEW.valor_puntos > 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los criterios de esta evaluación sumarían más de 10 puntos';
  END IF;
END$$

CREATE TRIGGER trg_criterio_suma_upd BEFORE UPDATE ON criterios_evaluacion
FOR EACH ROW
BEGIN
  IF (SELECT COALESCE(SUM(valor_puntos), 0) FROM criterios_evaluacion
      WHERE id_asignacion = NEW.id_asignacion AND tipo = NEW.tipo AND id_criterio <> OLD.id_criterio) + NEW.valor_puntos > 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los criterios de esta evaluación sumarían más de 10 puntos';
  END IF;
END$$

DELIMITER ;
