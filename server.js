if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

//применеяем ejs 
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/client'));

//подключаем бд
const sqlite3 = require('sqlite3').verbose();
const dbFile = './db/userdata.db';
const fs = require("fs");
const exists = fs.existsSync(dbFile);
let db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the userdata database.');
});

db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
    );
  } else {
    console.log('Database ready to go!');

  }
});
app.locals.username = null;


//подключаем роуты
require('./server/routes')(app,db);

// коннект с клиентом
require('./server/sockets')(io,app);

server.on('error', (err) => {
  console.log('Server error', err)
})

server.listen(8080, () => {
  console.log('started on 8080')
})

