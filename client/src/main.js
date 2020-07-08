const app = new Vue({
    el: '#app',
    data: {
        user: '',
        opponent: "",
        opponentOnline: false,
        usersOnline: {},
        selfStatus: '',
        showErr: false,
        errMessage: '',
        messages: ['Game Log'],
        showInv: false,
        showInvTimer: 20,
        roomName: '',
        gameOn: false,
        interval:null
    },
    methods: {
        sendInv: function (target) {
            if (this.selfStatus != 'busy') {
                this.roomName = target + '&' + this.user;
                //отправляем приглашение
                this.opponent = target;
                this.opponentOnline = true;
                socket.emit('send-request', { 'from': this.user, 'to': target, });
            } else if (this.showInv) {
                this.sendErrMessage("Respond to incoming invitation first.");
            } else {
                this.sendErrMessage("You have already invited another player.");
            }
        },
        createInvitation: function (opponent) {
            this.roomName = this.user + '&' + opponent;
            this.opponent = opponent;
            this.opponentOnline = true;
            this.showInv = true;
            this.messages = ['Game Log'];
            this.showInvTimer = 20;
            this.interval = setInterval(() => {
                this.showInvTimer--;
                if (!this.showInv) {
                    this.showInvTimer = 20;
                    clearInterval(this.interval);
                } else if (this.showInvTimer == 0) {
                    this.showInvTimer = 20;
                    this.declineInv();
                    clearInterval(this.interval);
                }
            }, 1000);
        },
        declineInv: function () {
            this.showInv = false;
            socket.emit('left-and-ready', this.opponent);
        },
        startGame: function () {
            this.showErr = false;
            if (this.showInv) {
                if (!this.opponentOnline) {
                    this.showInv = false;
                    this.sendErrMessage("Your opponent refused to play or left..");
                    socket.emit('left-and-ready');
                }
                else {
                    this.showInv = false;
                    this.gameOn = true;
                    socket.emit('agreed-to-play', this.roomName, { 'from': this.opponent, 'to': this.user });
                    game.messages = ['Game Log'];
                }
            }else{
                this.gameOn = true;
            }
        },
        sendErrMessage: function (msg) {
            this.errMessage = msg
            this.showErr = true;
            setTimeout(() => {
                this.showErr = false;
            }, 1800);
        }

    }

});







