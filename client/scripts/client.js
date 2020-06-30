const app = new Vue({
    el: '#app',
    data: {
        user: userName.toString(),
        opponent: "",
        usersOnline: {},
        messages: ['Game Log'],
        showInv: false,
        roomName: '',
        gameOn: false,
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
        sendInv: function (target) {
            this.roomName = target + '&' + this.user;
            //отправляем приглашение
            this.opponent = target;
            socket.emit('send-request', { 'from': this.user, 'to': target, });
        },
        createInvitation: function (opponent) {
            this.roomName = this.user + '&' + opponent;
            this.opponent = opponent;
            this.showInv = true;
            this.messages = ['Game Log'];
        },
        declineInv: function () {
            this.showInv = false;
        },
        startGame: function () {
            this.gameOn = true;
            $('#game').removeAttr('hidden');
            if (this.showInv) {
                this.showInv = false;
                socket.emit('agreed-to-play', this.roomName, { 'from': this.opponent, 'to': this.user });
            }
            this.messages = ['Game Log'];
        },
        leaveGame: function () {
            this.gameOn = false;
            $('#game').attr('hidden', true);
            //если вышел раньше конца игры то - проигрыш
            if (this.winnerWindow == 'hidden') {
                socket.emit('message', this.roomName, this.user + " left the game... shame on him..", true);
            }
            socket.emit('game-end');
            socket.emit('left-and-ready', this.room);
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
            socket.emit('message', this.roomName, this.user + " : " + this.msg);
            this.msg = '';
        },
        turn: function (event) {
            this.turnID = event.currentTarget.id
            socket.emit('turn', event.currentTarget.id);
            this.turnClass = 'disabled';
        }

    }

});










