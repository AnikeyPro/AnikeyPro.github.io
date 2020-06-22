if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
  

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

//подклбчаем бд
const sqlite3 = require('sqlite3').verbose();
const dbFile = 'userdata.db';
const fs = require("fs");
const exists = fs.existsSync(dbFile);
var db = new sqlite3.Database(dbFile);

db.serialize(() => {
  console.log(exists);
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
    );
  } else {
    console.log('Database ready to go!');
    
  }
});


//список онлайн
const usersOnline = [];

//работаем с авторизацией через passport
const passport = require('passport');
const initializePassport = require('./passport-config')
initializePassport(passport,db);



//для шифровки паролей использую bcrypt
const bcrypt = require('bcrypt');

//применеяем ejs 
app.set('view-engine','ejs');
app.use(express.urlencoded({ extended: false}));
app.use(express.static(__dirname + '/client'));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


app.get('/', checkAuthenticated, (req,res) => {
    res.render('index.ejs',{username:req.user.username});

});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
  })
  
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req,res) => {
    res.render('registration.ejs');
});

app.post('/register', checkNotAuthenticated, async (req,res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const clearUsername = cleanseString(req.body.username);
        console.log(hashedPassword,clearUsername);  
        db.run(`INSERT INTO Users (username, password) VALUES ("${clearUsername}","${hashedPassword}")`);
        res.redirect('/login');
    } catch  {
        res.redirect('/register');
    }
});


app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
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
  const cleanseString = function(string) {
    return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  




// проверяем на коннект с сервером
io.on('connection',(sock)=>{
    console.log('Someone connected... emmm hi there')
    sock.emit('message', 'You are connected to my server')
});


server.on('error',(err)=>{
    console.log('Server error', err)
})

server.listen(8080,()=>{
    console.log('started on 8080')
})