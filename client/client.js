const app = new Vue({
    el: '#app',
    data: {
        user: "",
        opponent: "",
        usersOnline: [],
        messages: ['Game Log'],
        showInv: false
    },
    methods: {
        resetUsers: function (arr) {
            this.usersOnline = arr;
        },
        updateMessage: function (msg) {
            this.messages.push(msg);
        },
        sendInv: function (target) {
            console.log(this.user, target);
            //отправляем приглос
            socket.emit('sendRequest', { 'from': this.user, 'to': target, });
        },
        createInvitation: function (opponent) {
            this.opponent = opponent;
            this.showInv = true;
        },
        declineInv: function () {
            this.showInv = false;
        }
    }

});
//конектимся к серверу
const socket = io.connect();

socket.on("connect", () => {
    console.log('connected!');

    //получаем юзера
    socket.on('username', (username) => {
        app.user = username;
    })

    //юзеры - онлайн
    socket.on('data', (data) => {
        app.resetUsers(data);
    });

    //лог игры
    socket.on('message', (msg) => {
        app.updateMessage(msg);
    });

    //получаем приглос
    socket.on('invitation', (req) => {
        console.log(req.from + ' kinul priglos' + app.user);
        if (req.to === app.user) {
            app.createInvitation(req.from);
        }
    });


    // socket.on('disconnect', function () {
    //     socket.disconnect();
    //     setTimeout(function () {
    //         console.log("client trying reconnect");
    //         io.connect('localhost:8080'{'forceNew':true });
    //     }, 2000);
    // });

});




$(document).ready(function () {


    //обработчик игры 
    const addButtonListeners = () => {
        ['rock', 'paper', 'scissors', 'lizard', 'spok'].forEach((id) => {
            const button = document.getElementById(id);
            button.addEventListener('click', () => {
                console.log("Clicked" + id)
                socket.emit('turn', id);
            });
        });
    };

    addButtonListeners();



});



