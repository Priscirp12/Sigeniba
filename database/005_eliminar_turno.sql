-- Migración: se elimina el campo "turno" de grupos, ya no se requiere
-- en el módulo de Administrador.

ALTER TABLE grupos DROP COLUMN turno;
