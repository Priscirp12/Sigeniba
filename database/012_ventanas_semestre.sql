-- Migración: se corrige el modelo de periodos escolares. Un "periodo" representa
-- una generación completa (ej. bachillerato de 3 años, 6 semestres), no un solo
-- semestre. ventanas_captura solo tenía UNIQUE(id_periodo, tipo), lo que hacía
-- imposible tener fechas distintas para, por ejemplo, el Parcial 1 del semestre 1
-- y el Parcial 1 del semestre 3 dentro de la misma generación. Se agrega
-- "semestre" para que cada semestre de la generación tenga sus propias fechas.
-- Las filas existentes son todas de datos de prueba del semestre 1 (grupos 1A/1B),
-- por eso se backfillean con semestre=1.

ALTER TABLE ventanas_captura
  ADD COLUMN semestre TINYINT NOT NULL DEFAULT 1 AFTER id_periodo;

ALTER TABLE ventanas_captura
  DROP INDEX uq_periodo_tipo,
  ADD UNIQUE KEY uq_periodo_semestre_tipo (id_periodo, semestre, tipo);
