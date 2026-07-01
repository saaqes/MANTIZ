/**
 * config/mailer.js — Envío de correos transaccionales (MANTIZ)
 *
 * Variables de entorno requeridas en tu .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false          // true si usas el puerto 465
 *   SMTP_USER=tucorreo@gmail.com
 *   SMTP_PASS=tu_contraseña_de_aplicacion   // NO tu contraseña normal de Gmail
 *   MAIL_FROM="MANTIZ" <tucorreo@gmail.com>
 *
 * Si usas Gmail: activa la verificación en 2 pasos en tu cuenta y genera una
 * "contraseña de aplicación" en https://myaccount.google.com/apppasswords —
 * Gmail ya NO permite usar la contraseña normal de la cuenta para SMTP.
 *
 * Si usas otro proveedor (Outlook, SendGrid, Mailgun, Resend, etc.) solo
 * cambia SMTP_HOST/SMTP_PORT/usuario/clave según su documentación; el resto
 * del código no cambia.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verifica la conexión SMTP al arrancar el servidor (no bloquea el arranque).
transporter.verify((err) => {
  if (err) {
    console.error('❌ [mailer] No se pudo conectar al servidor SMTP:', err.message);
  } else {
    console.log('✅ [mailer] Servidor de correo listo para enviar mensajes');
  }
});

/**
 * Envía el correo de recuperación de contraseña con el diseño Y2K de MANTIZ.
 * @param {string} destinatario - Email del usuario
 * @param {string} nombreUsuario - Nombre visible del usuario
 * @param {string} resetUrl - Enlace completo de recuperación (con token)
 */
async function enviarCorreoRecuperacion(destinatario, nombreUsuario, resetUrl) {
  const from = process.env.MAIL_FROM || `"MANTIZ" <${process.env.SMTP_USER}>`;

  const html = `
  <div style="background:#0a000f;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:460px;margin:0 auto;background:rgba(20,5,30,0.95);border:1.5px solid rgba(233,30,140,0.5);border-radius:4px;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#9d00ff,#e91e8c,#00f5ff);"></div>
      <div style="padding:36px 32px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:#e91e8c;letter-spacing:2px;margin-bottom:4px;">MANTIZ</div>
        <div style="font-size:13px;letter-spacing:4px;color:#cfcfcf;text-transform:uppercase;margin-bottom:28px;">Recuperación de contraseña</div>

        <p style="color:#e6e6e6;font-size:15px;line-height:1.6;text-align:left;margin:0 0 8px;">
          Hola${nombreUsuario ? ', ' + nombreUsuario : ''}:
        </p>
        <p style="color:#c9c9c9;font-size:14px;line-height:1.6;text-align:left;margin:0 0 28px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en MANTIZ.
          Si fuiste tú, haz clic en el siguiente botón para crear una nueva contraseña.
          Este enlace es válido durante <strong style="color:#00f5ff;">1 hora</strong>.
        </p>

        <a href="${resetUrl}"
           style="display:inline-block;background:#e91e8c;color:#fff;text-decoration:none;
                  font-weight:700;letter-spacing:2px;font-size:14px;padding:14px 32px;
                  border-radius:2px;box-shadow:0 0 20px rgba(233,30,140,0.4);">
          RESTABLECER CONTRASEÑA
        </a>

        <p style="color:#888;font-size:12px;line-height:1.6;text-align:left;margin:28px 0 0;">
          Si tú no solicitaste este cambio, puedes ignorar este correo — tu contraseña
          seguirá siendo la misma.
        </p>
        <p style="color:#666;font-size:11px;line-height:1.6;text-align:left;margin:16px 0 0;word-break:break-all;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${resetUrl}" style="color:#00f5ff;">${resetUrl}</a>
        </p>
      </div>
    </div>
  </div>`;

  return transporter.sendMail({
    from,
    to: destinatario,
    subject: 'Recupera tu contraseña — MANTIZ',
    html
  });
}

module.exports = { transporter, enviarCorreoRecuperacion };
