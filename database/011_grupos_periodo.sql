-- Migración: los grupos (ej. "1A") no estaban ligados a ningún periodo escolar,
-- así que un mismo nombre de grupo se reutilizaría para siempre entre ciclos
-- distintos sin forma de distinguirlos. Se agrega id_periodo para que cada
-- grupo nuevo quede asociado a un ciclo escolar concreto. Se deja NULL en
-- grupos ya existentes (creados antes de este cambio) para no romper nada.

ALTER TABLE grupos
  ADD COLUMN id_periodo VARCHAR(20) NULL AFTER semestre;

ALTER TABLE grupos
  ADD CONSTRAINT fk_grupos_periodo FOREIGN KEY (id_periodo)
    REFERENCES periodos_escolares (id_periodo) ON UPDATE CASCADE;
