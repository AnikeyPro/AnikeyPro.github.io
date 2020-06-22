const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport,db){
passport.use(new LocalStrategy(async function(username, password, done) {

      db.get('SELECT username, id, password FROM users WHERE username = ? ', username, async function(err, row) {
        if (!row) {
            return done(null, false, {message: 'Username does not exist.'});
        }
        if(await bcrypt.compare(password,row.password)){
            return done(null, row);
        } else {
            return done(null, false, {message: 'Password incorrect.'});
        }
      });
  }));
  
  passport.serializeUser(function(user, done) {
    return done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    db.get('SELECT id, username FROM users WHERE id = ?', id, function(err, row) {
      if (!row) return done(null, false);
      return done(null, row);
    });
  });

}

module.exports = initialize;