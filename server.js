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
const game = require('./gameLogic');

//подключаем бд
const sqlite3 = require('sqlite3').verbose();
const dbFile = 'userdata.db';
const fs = require("fs");
const exists = fs.existsSync(dbFile);
var db = new sqlite3.Database(dbFile);

db.serialize(() => {
  console.log(exists);
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
  store: new SQLiteStore,
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

//комнаты
const rooms = { }


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
    console.log(hashedPassword, clearUsername);
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
  console.log('Someone connected... emmm hi there ')
  //   setTimeout(function () {
  //     console.log("force disconnect");
  //     sock.disconnect();
  // }, 10000);




  //отправляем логин
  if (username != null) {
    if (!Object.values(usersOnline).find(name => name === username)) { usersOnline[socket.id] = username; }
    console.log('i\'m still online ' + usersOnline[socket.id] + "sock "+ socket.id)
    console.log('all users are  ' + Object.values(usersOnline))

    //отправляем список юзеров онлайн
    socket.emit('users-online', Object.values(usersOnline));
    socket.broadcast.emit('users-online', Object.values(usersOnline));
  }


  //логаут - убираем из списка онлайн 
  socket.on('disconnect', (reason) => {
    console.log('reason ' + reason);
    console.log('i\'m loggin out ' + usersOnline[socket.id])
    delete usersOnline[socket.id];
    // getUserRooms(socket).forEach(room => {
    //   console.log('puk ' + room);
    //   socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
    //   console.log('deleting room ' + room);
    //   delete rooms[room];
    // })
    socket.broadcast.emit('users-online', Object.values(usersOnline));
    console.log('users after logout  ' + Object.values(usersOnline))
  });


  // перенаправляем приглос
  socket.on('send-request', (req) => {
    console.log('username' + username);
    console.log(req.from + ' sends to ' + req.to);
    console.log(req.to + ' emmit ' + username);
    if (req.from === usersOnline[socket.id]) {
      socket.broadcast.emit('invitation', req);
    }

  });

  //если согласился->создаем комнату для игры
  socket.on('agreed-to-play', (req) => {
    console.log('username' + username + ' = ' + req.from +' agreed to play with ' + req.to);
    if (req.from === usersOnline[socket.id]) {
      var room =  req.from + '&' + req.to;
      console.log(req.from + 'user to room  ' + room);
      socket.broadcast.emit('lets-play', req, room);
      rooms[room] = { users: {} }
      rooms[room].users[socket.id] = usersOnline[socket.id];
      socket.join(room);
    }
  });

  //коннектим пригласившего к комнате 
  socket.on('connect-me-too', (room,username) => {
    if (username === usersOnline[socket.id]) {
      
      console.log(username +' user to room ' + room);
      rooms[room].users[socket.id] = usersOnline[socket.id];
      socket.join(room);
    }
  });
  

  //чат
  socket.on('message', (room,message) => {
    console.log(JSON.stringify(socket.adapter.rooms) + 'aaa');
    //console.log('users in room' + Object.entries(rooms[room].users));
    socket.to(room).broadcast.emit('message', message);
  })


  var today = new Date();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  console.log('==================' + time);

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
  console.log('come on delete this  ' + socket.id);
  return Object.entries(rooms).reduce((names, [name, room]) => {
    console.log('rooms are before' + names);
    if (room.users[socket.id] != null) names.push(name)
    console.log('rooms are ' + names);
    return names
  }, [])
}