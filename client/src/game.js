const game = new Vue({
    el: '#game',
    data: {
        messages: ['Game Log'],
        msg: '',
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
        winMessage: null,
        miniTimeout: null
    },
    methods: {
        leaveGame: function () {
            //если вышел раньше конца игры то - проигрыш
            if (this.winnerWindow == 'hidden') {
                socket.emit('message', app.roomName, app.user + " left the game... shame on him..", true);
            }
            app.gameOn = false;
            socket.emit('game-end');
            socket.emit('left-and-ready');
            //обнуляем результаты
            this.winnerWindow = 'hidden';
            this.roundNum = 1;
            this.scores = [0, 0];
            this.timer = '';
            this.turnClass = '';
            this.turnOponentID = null;
            this.turnSpanOpponent = 'Thinking..';
            this.turnSpan = 'Make your choice!';
        },
        sendToChat: function (e) {
            e.preventDefault();
            this.messages.push('You : ' + this.msg);
            socket.emit('message', app.roomName, app.user + " : " + this.msg);
            this.msg = '';
        },
        turn: function (event) {
            this.turnID = event.currentTarget.id
            socket.emit('turn', event.currentTarget.id);
            this.turnClass = 'disabled';
        }

    }

});










