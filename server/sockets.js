module.exports = function (io, app) {
    //наш класс игры
    const Game = require('./gameLogic');
    //класс с информацией о пользователях (статусы и тд)
    const UsersOnline = require('./users');
    const usersOnline = new UsersOnline();

    //игроки для класса Game
    let player1 = null;
    let player2 = null;

    io.on('connection', (socket) => {
        if (app.locals.username) {
            usersOnline.newUserOnline(socket.id, app.locals.username)
            //обновляем список юзеров и их статусы
            io.sockets.emit('users-update', usersOnline.getUsersAndStatuses());
            
            // перенаправляем приглос
            socket.on('send-request', (players) => {
                if (players.from === usersOnline.getUserName(socket.id)) {
                    socket.broadcast.emit('invitation', players);
                    usersOnline.setStatusByName(players.from, 'busy');
                    usersOnline.setStatusByName(players.to, 'busy');
                }
                io.sockets.emit('users-update', usersOnline.getUsersAndStatuses());

            });

            //если согласился->создаем комнату для игры
            socket.on('agreed-to-play', (room, players) => {
                if (players.to === usersOnline.getUserName(socket.id)) {
                    //обновляем статус на "в игре"
                    usersOnline.setStatusBySid(socket.id, 'playing')
                    usersOnline.createNewRoom(room);
                    usersOnline.joinRoom(socket.id, room)
                    socket.broadcast.emit('users-update', usersOnline.getUsersAndStatuses());
                    socket.broadcast.emit('lets-play', room, players);
                    socket.join(room);
                    player2 = socket;
                }
            });

            //коннектим пригласившего к комнате 
            socket.on('connect-me-too', (room, name) => {
                if (usersOnline.getUserName(socket.id) === name) {
                    //обновляем статус на "в игре"
                    usersOnline.setStatusBySid(socket.id, 'playing')
                    socket.broadcast.emit('users-update', usersOnline.getUsersAndStatuses());
                    usersOnline.joinRoom(socket.id, room)
                    socket.join(room);

                    player1 = socket;
                    //подключаем gamelogic
                    new Game(player1, player2, room, [usersOnline.getUserName(player1.id), usersOnline.getUserName(player2.id)]);
                    player1 = null;
                    player2 = null;
                }
            });

            //чат
            socket.on('message', (room, message, left = false) => {
                socket.to(room).broadcast.emit('message', message, left);
            })

            //если вышел из игровой комнты и свободен к новым приглашениям
            socket.on('left-and-ready', (opp = null) => {
                usersOnline.setStatusBySid(socket.id, 'ready')
                usersOnline.setStatusByName(opp, 'ready')
                io.sockets.emit('users-update', usersOnline.getUsersAndStatuses());
                //покидаем комнату
                usersOnline.deleteFromRoom(socket);
            })

            //логаут - убираем из списка онлайн 
            socket.on('disconnect', (reason) => {
                console.log(socket.id + ' disconnected! Reason: ' + reason);
                //Выходим из комнаты
                usersOnline.deleteFromRoom(socket);
                //удаляем из онлайна
                usersOnline.deleteUser(socket.id);
                //оповещаем о логауте
                socket.broadcast.emit('users-update', usersOnline.getUsersAndStatuses());
            });

        }
    });
}