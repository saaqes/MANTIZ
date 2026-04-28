const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { isGuest, isAuthenticated } = require('../middleware/auth');

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

// LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
