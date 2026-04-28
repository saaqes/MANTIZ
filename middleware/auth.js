const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  // Si es petición AJAX/JSON, devolver JSON en vez de redirigir
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json') ||
      req.headers['accept'] && req.headers['accept'].includes('application/json') ||
      req.xhr) {
    return res.status(401).json({ error: 'No autenticado', code: 401 });
  }
  req.flash('error', 'Debes iniciar sesión para acceder');
  res.redirect('/login');
};
const requireLogin = isAuthenticated;

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  req.flash('error', 'No tienes permisos de administrador');
  res.redirect('/');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.user) return res.redirect('/');
  next();
};

module.exports = { isAuthenticated, requireLogin, isAdmin, isGuest };
