if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const flash = require('express-flash');
const session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
const methodOverride = require('method-override');

//наш класс игры
const Game = require('./gameLogic');

//подключаем бд
const sqlite3 = require('sqlite3').verbose();
const dbFile = './db/userdata.db';
const fs = require("fs");
const exists = fs.existsSync(dbFile);
var db = new sqlite3.Database(dbFile);

db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, password TEXT)"
    );
  } else {
    console.log('Database ready to go!');

  }
});

//работаем с авторизацией через passport
const passport = require('passport');
const initializePassport = require('./passport-config')
initializePassport(passport, db);

//для шифровки паролей использую bcrypt
const bcrypt = require('bcrypt');

//применеяем ejs 
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/client'));
app.use(flash());
app.use(session({
  store: new SQLiteStore({dir:'./db/', db: 'sessions.db'}),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

//список онлайн
const usersOnline = {};
var username = null;

//статусы пользователей
const statuses = {};

//игроки для класса Game
let player1 = null;
let player2 = null;

//комнаты
const rooms = {}

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { username: req.user.username });
  username = req.user.username;
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

// проверяем на коннект с клиентом
io.on('connection', (socket) => {
  console.log('Someone connected. Socket.id = ' + socket.id)

  //отправляем логин
  if (username != null) {
    if (!Object.values(usersOnline).find(name => name === username)) { usersOnline[socket.id] = username; }
    //присваеваем статус готов к игре
    if (usersOnline[socket.id]) {
      statuses[usersOnline[socket.id]] = 'ready';
    }
    socket.emit('status-update', statuses);
    socket.broadcast.emit('status-update', statuses);
    //отправляем список юзеров онлайн
    socket.emit('users-online', Object.values(usersOnline));
    socket.broadcast.emit('users-online', Object.values(usersOnline));
  }

  // перенаправляем приглос
  socket.on('send-request', (players) => {
    if (players.from === usersOnline[socket.id]) {
      socket.broadcast.emit('invitation', players);
    }

  });

  //если согласился->создаем комнату для игры
  socket.on('agreed-to-play', (players) => {
    if (players.from === usersOnline[socket.id]) {
      //обновляем статус на "в игре"
      statuses[usersOnline[socket.id]] = 'playing';
      socket.emit('status-update', statuses);
      socket.broadcast.emit('status-update', statuses);

      var room = players.from + '&' + players.to;
      socket.broadcast.emit('lets-play', players, room);
      rooms[room] = { users: {} }
      rooms[room].users[socket.id] = usersOnline[socket.id];
      socket.join(room);
      player2 = socket;
    }
  });

  //коннектим пригласившего к комнате 
  socket.on('connect-me-too', (room, username) => {
    if (username === usersOnline[socket.id]) {
      //обновляем статус на "в игре"
      statuses[usersOnline[socket.id]] = 'playing';
      socket.emit('status-update', statuses);
      socket.broadcast.emit('status-update', statuses);
      rooms[room].users[socket.id] = usersOnline[socket.id];
      socket.join(room);

      player1 = socket;
      //подключаем gamelogic
      new Game(player1, player2, room, [usersOnline[player1.id], usersOnline[player2.id]]);
      player1 = null;
      player2 = null;
    }
  });

  //чат
  socket.on('message', (room, message, left = false) => {
    socket.to(room).broadcast.emit('message', message, left);
  })

  //если вышел из игровой комнты и свободен к новым приглашениям
  socket.on('left-and-ready', (room) => {
    if (usersOnline[socket.id]) {
      statuses[usersOnline[socket.id]] = 'ready';
    }
    //покидаем комнату
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
    socket.emit('status-update', statuses);
    socket.broadcast.emit('status-update', statuses);
  })

  //логаут - убираем из списка онлайн 
  socket.on('disconnect', (reason) => {
    console.log('Disconnected! Reason: ' + reason);
    //если у игрока незаконченные игры заканчиваем
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      socket.to(room).emit('message',  usersOnline[socket.id] + " left the game... shame on him..", true);
      delete rooms[room].users[socket.id]
    })
    //удаляем из онлайна
    delete usersOnline[socket.id];
    delete statuses[usersOnline[socket.id]];
    //оповещаем о логауте
    socket.broadcast.emit('status-update', statuses);
    socket.broadcast.emit('users-online', Object.values(usersOnline));
  });


});

server.on('error', (err) => {
  console.log('Server error', err)
})

server.listen(8080, () => {
  console.log('started on 8080')
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

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
      if (room.users[socket.id] != null) names.push(name)
      return names
    }, [])
  }