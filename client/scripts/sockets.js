
//конектимся к серверу
const socket = io.connect();

//получаем список юзеров и их статусы
socket.on('users-update', (usersOnline) => {
    app.usersOnline = usersOnline;
});

//получаем приглашение
socket.on('invitation', (players) => {
    console.log("players", players)

    app.opponent = players.from;
    if (players.to === app.user) {
        app.createInvitation(players.from);
    }
});

//получаем согласие от оппонента
socket.on('lets-play', (room, players) => {
    console.log('pp ' + players)
    if (players.from === app.user) {
        app.startGame();
        socket.emit('connect-me-too', room, players.from);
    }
});

//получаем сообщения с чата
socket.on('message', (msg, left = false) => {
    if (left) {
        app.winnerWindow = 'winnerWindow';
        app.winMessage = 'Opponent left. Enjoy, you are the WINNER!!!';
        app.turnClass = 'disabled-force';
    }
    app.messages.push(msg);
});


//получаем ход противника
socket.on('opponents-turn', (turn) => {
    if (turn != null) {
        app.turnOponentID = turn;
    }
});

socket.on('timer', (time) => {
    app.timer = time;
});

//получаем инфу что раунд закончен 
socket.on('end-of-round', (msg, winner, oppTimeOut = false) => {
    app.messages.push(msg);
    if (winner == 'DRAW') {
        app.timer = ' IT\'S A DRAW!!!';
    } else if (winner == 'DRAWNOTIME') {
        app.timer = ' IT\'S A DRAW!!! Both players timed out';
        app.turnSpan = 'Time out...'
        app.turnSpanOpponent = 'Time out...'
        app.turnClass = 'disabled-force';
    } else if (oppTimeOut) {
        app.timer = winner + ' IS WINNER!!!';
        if (app.user == winner) {
            app.scores[0]++;
            app.turnSpanOpponent = 'Time out...'
        } else {
            app.scores[1]++;
            app.turnSpan = 'Time out...'
            app.turnClass = 'disabled-force';
        }
    } else {
        app.timer = winner + ' IS WINNER!!!';
        if (app.user == winner) {
            app.scores[0]++;
        } else {
            app.scores[1]++;
        }
    }
    //показываем результаты хода на 5 сек
    miniTimeout = setTimeout(() => {
        //если есть победитель завершаем игру
        if (app.scores.indexOf(5) != -1) {
            if (app.scores.indexOf(5) == 0) {
                app.winMessage = ' YOU WIN !!! CONGRATULATIONNS!!!';
            } else {
                app.winMessage = 'YOU LOST! BETTER LUCK NEX TIME!!!';
            }
            app.winnerWindow = 'winnerWindow';

        } else if (app.winnerWindow == 'hidden' && app.gameOn) {
            app.roundNum++;
            app.turnClass = ''
            app.turnOponentID = null;
            app.turnSpan = 'Make your choice!'
            app.turnSpanOpponent = 'Thinking...'
            socket.emit('round-finished', true);
        }
    }, 5000);

});