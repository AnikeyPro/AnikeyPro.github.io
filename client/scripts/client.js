const app = new Vue({
    el: '#app',
    data: {
        user: userName.toString(),
        opponent: "",
        usersOnline: [],
        messages: ['Game Log'],
        showInv: false,
        roomName: '',
        gameOn: false,
        msg: '',
        statuses: {},
        isPVPdisabled: false,
        turnID: '',
        turnOponentID: null,
        turnClass: '',
        roundNum: 1,
        timer: '',
        scores: [0, 0],
        winnerWindow: 'hidden',
        turnSpanOpponent: 'Thinking..',
        turnSpan: 'Make your choice!',
        winMessage: 'The winner is '
    },
    methods: {
        resetUsers: function (arr) {
            this.usersOnline = arr;
        },
        sendInv: function (target) {
            console.log(this.user, target);
            this.roomName = target + '&' + this.user;
            //отправляем приглашение
            this.opponent = target;
            socket.emit('send-request', { 'from': this.user, 'to': target, });
        },
        createInvitation: function (opponent) {
            this.roomName = this.user + '&' + opponent;
            this.opponent = opponent;
            this.showInv = true;
        },
        declineInv: function () {
            this.showInv = false;
        },
        startGame: function () {
            this.gameOn = true;
            if (this.showInv) {
                this.showInv = false;
                socket.emit('agreed-to-play', { 'from': this.user, 'to': this.opponent });
            }
        },
        leaveGame: function () {
            console.log('ЖМИ');
            this.gameOn = false;
            //если вышел раньше конца игры то - проигрыш
            if (app.winnerWindow == 'hidden') {
                socket.emit('message', this.roomName, this.user + " left the game... shame on him..", true);
            }
            socket.emit('left-and-ready', true);
        },
        sendToChat: function (e) {
            e.preventDefault();
            this.messages.push('You : ' + this.msg);
            socket.emit('message', this.roomName, this.user + " : " + this.msg);
            this.msg = '';
        },
        turn: function (event) {
            console.log("Clicked" + event.currentTarget.id)
            this.turnID = event.currentTarget.id
            socket.emit('turn', event.currentTarget.id);
            this.turnClass = 'disabled';
        }

    }

});

//конектимся к серверу
const socket = io.connect();

socket.on("connect", () => {

    //юзеры - онлайн
    socket.on('users-online', (usersOnline) => {
        app.resetUsers(usersOnline);
    });

    //получаем приглашение
    socket.on('invitation', (players) => {
        app.opponent = players.from;
        if (players.to === app.user) {
            app.createInvitation(players.from);
        }
    });

    //получаем согласие от оппонента
    socket.on('lets-play', (players, room) => {
        if (players.to === app.user) {
            app.startGame();
            socket.emit('connect-me-too', room, app.user);
        }
    });

    //получаем сообщения с чата
    socket.on('message', (msg, left = false) => {
        if (left) {
            app.globalWinner = app.user;
            app.winnerWindow = 'winnerWindow';
            app.winMessage = 'Opponent left. Enjoy, you are the WINNER!!!'
        }
        app.messages.push(msg);
    });

    //обновляем статусы
    socket.on('status-update', (statuses) => {
        app.statuses = statuses;
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
            app.timer = winner + ' IS WINNER!!! ';
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


        setTimeout(() => {
            if (app.scores.indexOf(5) != -1) {
                if (app.scores.indexOf(5) == 0) {
                    app.winMessage = ' YOU WIN !!! CONGRATULATIONNS!!!';
                } else {
                    app.winMessage = 'YOU LOST! THE WINNER IS ' + app.opponent + ' !!!';
                }
                app.winnerWindow = 'winnerWindow';

            } else {
                app.roundNum++;
                app.turnClass = ''
                app.turnOponentID = null;
                app.turnSpan = 'Make your choice!'
                app.turnSpanOpponent = 'Thinking...'
                socket.emit('round-finished', true);
            }
        }, 5000);

    });

});







