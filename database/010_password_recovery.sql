-- Migración: recuperación de contraseña para docentes y administradores.
-- Los alumnos no tienen acceso a este flujo (se filtra por rol en el backend).
-- 1) usuarios no tenía columna de correo; se agrega aquí porque cubre tanto a
--    docentes como a administradores desde una sola columna (no existe tabla
--    "administradores": esas cuentas viven únicamente como filas en usuarios).
-- 2) password_resets guarda tokens de un solo uso con expiración. El token en
--    sí NUNCA se guarda en claro: se guarda su hash SHA-256 (defensa en
--    profundidad si la BD llegara a filtrarse).

ALTER TABLE usuarios
  ADD COLUMN email VARCHAR(120) NULL AFTER apellido_materno;

ALTER TABLE usuarios
  ADD UNIQUE KEY uq_usuarios_email (email);

CREATE TABLE password_resets (
  id_reset VARCHAR(20) NOT NULL,
  id_usuario VARCHAR(20) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reset),
  UNIQUE KEY uq_password_resets_token_hash (token_hash),
  KEY idx_password_resets_usuario (id_usuario),
  CONSTRAINT fk_password_resets_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
