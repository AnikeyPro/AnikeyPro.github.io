const app = new Vue({
    el: '#app',
    data: {
        user: '',
        opponent: "",
        usersOnline: {},
        selfStatus: '',
        showErr: false,
        errMessage: '',
        messages: ['Game Log'],
        showInv: false,
        showInvTimer: 20,
        roomName: '',
        gameOn: false,
    },
    methods: {
        sendInv: function (target) {
            if (this.selfStatus != 'busy') {
                this.roomName = target + '&' + this.user;
                //отправляем приглашение
                this.opponent = target;
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
            this.showInv = true;
            this.messages = ['Game Log'];
            this.showInvTimer = 20;
            let interval = setInterval(() => {
                this.showInvTimer--;
                if (!this.showInv) {
                    this.showInvTimer = 20;
                    clearInterval(interval);
                } else if (this.showInvTimer == 0) {
                    this.showInvTimer = 20;
                    this.declineInv();
                    clearInterval(interval);
                }
            }, 1000);
        },
        declineInv: function () {
            this.showInv = false;
            socket.emit('left-and-ready', this.opponent);
        },
        startGame: function () {
            this.showErr = false;
            this.gameOn = true;
            if (this.showInv) {
                this.showInv = false;
                socket.emit('agreed-to-play', this.roomName, { 'from': this.opponent, 'to': this.user });
            }
            game.messages = ['Game Log'];
        },
        sendErrMessage: function (msg) {
            this.errMessage = msg
            this.showErr = true;
            setTimeout(() => {
                this.showErr = false;
            }, 2000);
        }

    }

});







