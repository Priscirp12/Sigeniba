<?php
// Configuración de envío de correo para recuperación de contraseña.
//
// MODO DEV: mientras $mailSmtpHost / $mailSmtpUser / $mailSmtpPass estén
// vacíos, mail_helper.php NO intentará enviar un correo real: en su lugar
// escribe el mensaje (destinatario + enlace) en api/logs/mail.log para poder
// probar el flujo completo en local.
//
// Al contratar el hosting de Hostinger: llenar estos valores con las
// credenciales SMTP reales (Hostinger las provee en hPanel > Correos) y
// $mailAppUrl con la URL pública del frontend. No se requiere ningún cambio
// de código para pasar a producción.

$mailSmtpHost = '';              // p.ej. 'smtp.hostinger.com'
$mailSmtpPort = 465;              // 465 (SSL) o 587 (STARTTLS)
$mailSmtpSecure = 'ssl';          // 'ssl' | 'tls'
$mailSmtpUser = '';               // p.ej. 'no-reply@tudominio.com'
$mailSmtpPass = '';
$mailFromEmail = 'no-reply@sigeniba.local';
$mailFromName = 'SIGENIBA';
$mailAppUrl = 'http://localhost:8100'; // base pública del frontend (Ionic dev server u origen final en Hostinger)
