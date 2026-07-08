-- Migración: se elimina el campo "créditos" de materias, ya no es relevante
-- para ningún perfil del sistema.

ALTER TABLE materias DROP COLUMN creditos;
