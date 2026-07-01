const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { enviarCorreoRecuperacion } = require('../config/mailer');

// El token se envía en texto plano por correo pero solo se guarda su HASH
// en la base de datos (igual que una contraseña) — así, si alguien accede a
// la tabla password_resets, no puede usar esos datos para tomar cuentas.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

// LOGIN GET
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Iniciar Sesion' });
});

// LOGIN POST — acepta username o email
router.post('/login', isGuest, async (req, res) => {
  const identifier = (req.body.username || req.body.email || '').trim();
  const password   = req.body.password || '';

  if (!identifier || !password) {
    req.flash('error', 'Por favor completa todos los campos');
    return res.redirect('/auth/login');
  }

  try {
    // Busca por email O por username
    const [[user]] = await db.query(
      'SELECT * FROM usuarios WHERE (email = ? OR username = ?) AND activo = 1',
      [identifier, identifier]
    );

    if (!user) {
      req.flash('error', 'Correo o contrasena incorrectos');
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error', 'Correo o contrasena incorrectos');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      nombre_visible: user.nombre_visible,
      email: user.email,
      rol: user.rol,
      foto_perfil: user.foto_perfil,
      foto_perfil_tipo: user.foto_perfil_tipo,
      foto_perfil_preset: user.foto_perfil_preset
    };

    req.flash('success', 'Bienvenido, ' + user.nombre_visible + '!');
    res.redirect(user.rol === 'admin' ? '/admin' : '/');
  } catch(e) {
    console.error('Error login:', e);
    req.flash('error', 'Error al iniciar sesion');
    res.redirect('/auth/login');
  }
});

// REGISTRO GET
router.get('/registro', isGuest, (req, res) => {
  res.render('auth/registro', { title: 'Crear Cuenta' });
});

// REGISTRO POST
router.post('/registro', isGuest, async (req, res) => {
  const { username, nombre_visible, email, password, confirm_password } = req.body;

  if (!username || !nombre_visible || !email || !password) {
    req.flash('error', 'Todos los campos son obligatorios');
    return res.redirect('/auth/registro');
  }
  if (password !== confirm_password) {
    req.flash('error', 'Las contrasenas no coinciden');
    return res.redirect('/auth/registro');
  }
  if (password.length < 6) {
    req.flash('error', 'La contrasena debe tener al menos 6 caracteres');
    return res.redirect('/auth/registro');
  }

  try {
    const [[exists]] = await db.query(
      'SELECT id FROM usuarios WHERE email = ? OR username = ?',
      [email, username]
    );
    if (exists) {
      req.flash('error', 'El correo o nombre de usuario ya esta registrado');
      return res.redirect('/auth/registro');
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO usuarios (username, nombre_visible, email, password, rol) VALUES (?,?,?,?,?)',
      [username, nombre_visible, email, hash, 'cliente']
    );

    req.flash('success', 'Cuenta creada exitosamente! Ahora puedes iniciar sesion.');
    res.redirect('/auth/login');
  } catch(e) {
    console.error('Error registro:', e);
    req.flash('error', 'Error al crear la cuenta');
    res.redirect('/auth/registro');
  }
});

// OLVIDE CONTRASEÑA — GET (formulario para pedir el correo)
router.get('/olvide-password', isGuest, (req, res) => {
  res.render('auth/olvide_password', { title: 'Recuperar Contraseña' });
});

// OLVIDE CONTRASEÑA — POST (genera token y envía el correo)
router.post('/olvide-password', isGuest, async (req, res) => {
  const email = (req.body.email || '').trim();

  if (!email) {
    req.flash('error', 'Por favor ingresa tu correo electronico');
    return res.redirect('/auth/olvide-password');
  }

  try {
    const [[user]] = await db.query(
      'SELECT id, email, nombre_visible FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );

    // Mensaje siempre igual exista o no el correo — evita que alguien pueda
    // usar este formulario para averiguar qué correos están registrados.
    req.flash('success', 'Si el correo esta registrado, te enviamos un enlace de recuperacion. Revisa tu bandeja de entrada (y spam).');

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      // Invalida cualquier enlace anterior que el usuario haya pedido antes.
      await db.query('DELETE FROM password_resets WHERE usuario_id = ?', [user.id]);
      await db.query(
        'INSERT INTO password_resets (usuario_id, token_hash, expires_at) VALUES (?,?,?)',
        [user.id, tokenHash, expiresAt]
      );

      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;

      // No se espera (await) el envío para no retrasar la respuesta al usuario;
      // si falla, solo se registra en el log del servidor.
      enviarCorreoRecuperacion(user.email, user.nombre_visible, resetUrl)
        .catch(e => console.error('Error enviando correo de recuperacion:', e.message));
    }

    return res.redirect('/auth/olvide-password');
  } catch (e) {
    console.error('Error en /auth/olvide-password:', e);
    req.flash('error', 'Ocurrio un error. Intenta de nuevo.');
    return res.redirect('/auth/olvide-password');
  }
});

// RESET PASSWORD — GET (valida el token y muestra el formulario de nueva contrasena)
router.get('/reset-password/:token', isGuest, async (req, res) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const [[reset]] = await db.query(
      'SELECT id FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );

    if (!reset) {
      req.flash('error', 'El enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo.');
      return res.redirect('/auth/olvide-password');
    }

    res.render('auth/reset_password', { title: 'Nueva Contrasena', token: req.params.token });
  } catch (e) {
    console.error('Error en GET /auth/reset-password/:token:', e);
    req.flash('error', 'Ocurrio un error. Intenta de nuevo.');
    res.redirect('/auth/olvide-password');
  }
});

// RESET PASSWORD — POST (valida el token y guarda la nueva contrasena)
router.post('/reset-password/:token', isGuest, async (req, res) => {
  const token = req.params.token;
  const { password, confirm_password } = req.body;

  if (!password || !confirm_password) {
    req.flash('error', 'Completa todos los campos');
    return res.redirect('/auth/reset-password/' + token);
  }
  if (password !== confirm_password) {
    req.flash('error', 'Las contrasenas no coinciden');
    return res.redirect('/auth/reset-password/' + token);
  }
  if (password.length < 6) {
    req.flash('error', 'La contrasena debe tener al menos 6 caracteres');
    return res.redirect('/auth/reset-password/' + token);
  }

  try {
    const tokenHash = hashToken(token);
    const [[reset]] = await db.query(
      'SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );

    if (!reset) {
      req.flash('error', 'El enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo.');
      return res.redirect('/auth/olvide-password');
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, reset.usuario_id]);

    // El token (y cualquier otro pendiente del mismo usuario) queda invalidado
    // despues de usarse, para que no pueda reutilizarse.
    await db.query('DELETE FROM password_resets WHERE usuario_id = ?', [reset.usuario_id]);

    req.flash('success', 'Tu contrasena fue actualizada. Ya puedes iniciar sesion.');
    res.redirect('/auth/login');
  } catch (e) {
    console.error('Error en POST /auth/reset-password/:token:', e);
    req.flash('error', 'Ocurrio un error. Intenta de nuevo.');
    res.redirect('/auth/reset-password/' + token);
  }
});

// LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;