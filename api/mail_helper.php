<?php
function mail_esta_configurado(): bool
{
    global $mailSmtpHost, $mailSmtpUser, $mailSmtpPass;
    return $mailSmtpHost !== '' && $mailSmtpUser !== '' && $mailSmtpPass !== '';
}

function mail_log_dev(string $destinatario, string $asunto, string $cuerpo): void
{
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    $linea = sprintf(
        "[%s] Para: %s | Asunto: %s\n%s\n%s\n\n",
        date('Y-m-d H:i:s'),
        $destinatario,
        $asunto,
        $cuerpo,
        str_repeat('-', 60)
    );
    file_put_contents($logDir . '/mail.log', $linea, FILE_APPEND);
}

function enviar_correo_recuperacion(string $destinatario, string $nombre, string $link): bool
{
    global $mailFromEmail, $mailFromName;

    $asunto = 'Recuperación de contraseña - SIGENIBA';
    $cuerpo = "Hola $nombre,\n\nSolicitaste restablecer tu contraseña en SIGENIBA. "
        . "Este enlace es válido por 45 minutos y solo puede usarse una vez:\n\n$link\n\n"
        . "Si tú no solicitaste este cambio, puedes ignorar este mensaje.";

    if (!mail_esta_configurado()) {
        mail_log_dev($destinatario, $asunto, $cuerpo);
        return true;
    }

    require_once __DIR__ . '/lib/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/lib/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/lib/PHPMailer/src/SMTP.php';

    global $mailSmtpHost, $mailSmtpPort, $mailSmtpSecure, $mailSmtpUser, $mailSmtpPass;

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $mailSmtpHost;
        $mail->SMTPAuth = true;
        $mail->Username = $mailSmtpUser;
        $mail->Password = $mailSmtpPass;
        $mail->SMTPSecure = $mailSmtpSecure;
        $mail->Port = $mailSmtpPort;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom($mailFromEmail, $mailFromName);
        $mail->addAddress($destinatario, $nombre);
        $mail->Subject = $asunto;
        $mail->Body = $cuerpo;

        $mail->send();
        return true;
    } catch (Throwable $e) {
        mail_log_dev($destinatario, $asunto . ' (FALLÓ EL ENVÍO: ' . $e->getMessage() . ')', $cuerpo);
        return false;
    }
}
