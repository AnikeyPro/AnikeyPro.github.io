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
        isPVPdisabled: false
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
            localStorage.gameOn = true;
            if (this.showInv) {
                this.showInv = false;
                socket.emit('agreed-to-play', { 'from': this.user, 'to': this.opponent });
            }
        },
        leaveGame: function () {
            console.log('ЖМИ');
            this.gameOn = false;
            localStorage.gameOn = false;
        },
        sendToChat: function (e) {
            e.preventDefault();
            this.messages.push('You : ' + this.msg);
            socket.emit('message', this.roomName, this.user + " : " + this.msg);
            this.msg = '';
        },
        turn: function (event) {
            console.log("Clicked" + event.currentTarget.id)
            socket.emit('turn', event.currentTarget.id);
        }

    },
    mounted() {
        if (localStorage.gameOn) {
            this.gameOn = JSON.parse(localStorage.gameOn);
        }
    }

});

//конектимся к серверу
const socket = io.connect();

socket.on("connect", () => {
    console.log('connected!');

    //если в режиме меню
    if (!app.gameOn) {
        //юзеры - онлайн
        socket.on('users-online', (usersOnline) => {
            app.resetUsers(usersOnline);
        });

        //получаем приглошение
        socket.on('invitation', (players) => {
            console.log(players.from + ' kinul priglos' + app.user);
            app.opponent = players.from;
            if (players.to === app.user) {
                app.createInvitation(players.from);
            }
        });

        //получаем согласие от оппонента
        socket.on('lets-play', (players, room) => {
            console.log(players.from + ' agreed lets play' + app.user);
            if (players.to === app.user) {
                app.startGame();
                socket.emit('connect-me-too', room, app.user);
            }
        });
    }
    //если в игре 
    //получаем сообщения с чата
    socket.on('message', (msg) => {
        app.messages.push(msg);
    });

    //обновляем статусы
    socket.on('statuse-update', (statuses) => {
        app.statuses = statuses;
    });


    // socket.on('disconnect', function () {
    //     socket.disconnect();
    //     console.log('disconnected');
    //     location.reload();

    // });

});







