# API de SIGENIBA

Esta carpeta contiene los endpoints PHP para conectar la app Ionic con la base de datos MySQL.

## Endpoints disponibles
- `POST /api/auth.php` para iniciar sesión
- `GET /api/grupos.php`
- `GET /api/materias.php`
- `GET /api/alumnos.php?id_grupo=...`
- `GET /api/calificaciones.php?id_gmd=...&parcial=1`
- `POST /api/calificaciones.php` para actualizar notas
