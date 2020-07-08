//конектимся к серверу
const socket = io.connect();

//получаем список юзеров и их статусы
socket.on('users-update', (usersOnline) => {
    app.usersOnline = usersOnline;
    app.selfStatus = usersOnline[app.user];
});

//проверяем если юзер вышел во время пргиглашение
socket.on('users-left-chek', (opp) => {
    if (app.opponent === opp) {
        app.opponentOnline = false;
        if (!app.showInv) {
            socket.emit('left-and-ready');
            app.sendErrMessage("Your opponent left or refused to play..");
        } else{
            app.sendErrMessage("Your opponent left or refused to play..");
            clearInterval(app.interval);
            app.showInvTimer = 20;
            app.declineInv();
        }
        app.opponent = null;
    }
});

//если отменил пргиглашение
socket.on('declined', () => {
    app.sendErrMessage("Your opponent refused to play..");
    app.opponent = null;
});

//получаем приглашение
socket.on('invitation', (players) => {
    if (players.to === app.user) {
        app.opponent = players.from;
        app.createInvitation(players.from);
    }
});

//получаем согласие от оппонента
socket.on('lets-play', (room, players) => {
    if (players.from === app.user) {
        app.startGame();
        socket.emit('connect-me-too', room, players.from);
    }
});

//получаем сообщения с чата
socket.on('message', (msg, left = false) => {
    if (left) {
        game.winnerWindow = 'winnerWindow';
        game.winMessage = 'Opponent left. Enjoy, you are the WINNER!!!';
        game.turnClass = 'disabled-force';
    }
    game.messages.push(msg);
});


//получаем ход противника
socket.on('opponents-turn', (turn) => {
    if (turn != null) {
        game.turnOponentID = turn;
    }
});

socket.on('timer', (time) => {
    game.timer = time;
});

//получаем инфу что раунд закончен 
socket.on('end-of-round', (msg, winner, oppTimeOut = false) => {
    game.messages.push(msg);
    if (winner == 'DRAW') {
        game.timer = ' IT\'S A DRAW!!!';
    } else if (winner == 'DRAWNOTIME') {
        game.timer = ' IT\'S A DRAW!!! Both players timed out.';
        game.turnSpan = 'Time out...'
        game.turnSpanOpponent = 'Time out...'
        game.turnClass = 'disabled-force';
    } else if (oppTimeOut) {
        game.timer = winner + ' IS WINNER!!!';
        if (app.user == winner) {
            game.scores[0]++;
            game.turnSpanOpponent = 'Time out...'
        } else {
            game.scores[1]++;
            game.turnSpan = 'Time out...'
            game.turnClass = 'disabled-force';
        }
    } else {
        game.timer = winner + ' IS WINNER!!!';
        if (app.user == winner) {
            game.scores[0]++;
        } else {
            game.scores[1]++;
        }
    }
    //показываем результаты хода на 5 сек
    miniTimeout = setTimeout(() => {
        //если есть победитель завершаем игру
        if (game.scores.indexOf(5) != -1) {
            if (game.scores.indexOf(5) == 0) {
                game.winMessage = ' YOU WIN!!! CONGRATULATIONS!!!';
            } else {
                game.winMessage = 'YOU LOSE! BETTER LUCK NEX TIME!!!';
            }
            game.winnerWindow = 'winnerWindow';

        } else if (game.winnerWindow == 'hidden' && app.gameOn) {
            game.roundNum++;
            game.turnClass = ''
            game.turnOponentID = null;
            game.turnSpan = 'Make your choice!'
            game.turnSpanOpponent = 'Thinking...'
            socket.emit('round-finished', true);
        }
    }, 5000);

});