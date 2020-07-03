module.exports = function (app,db) {
  const flash = require('express-flash');
  const session = require('express-session');
  const SQLiteStore = require('connect-sqlite3')(session);
  const methodOverride = require('method-override');
  app.use(methodOverride('_method'));
  //работаем с авторизацией через passport
  const passport = require('passport');
  const initializePassport = require('./passport-config')
  initializePassport(passport, db);
  //для шифровки паролей использую bcrypt
  const bcrypt = require('bcrypt');

  app.use(flash());
  app.use(session({
    store: new SQLiteStore({ dir: './db/', db: 'sessions.db' }),
    secret: process.env["SESSION_SECRET"],
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { username: req.user.username });
    app.locals.username = req.user.username;
  });

  app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
  })

  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('registration.ejs');
  });

  app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const clearUsername = cleanseString(req.body.username);
      db.run(`INSERT INTO Users (username, password) VALUES ("${clearUsername}","${hashedPassword}")`);
      res.redirect('/login?registered');
    } catch  {
      res.redirect('/register');
    }
  });

  app.delete('/logout', (req, res) => {
    req.logOut()
    req.session.destroy(function (err) {
      res.redirect('/login');
    });
  })

  //проверка на аутентификацию
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect('/login')
  }

  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
  }

  //очистка строки от спецсимволов
  const cleanseString = function (string) {
    return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };


}