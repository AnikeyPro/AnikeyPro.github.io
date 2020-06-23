
const app = new Vue({
    el: '#app',
    data: {
        users: [],
        messages: ['Game Log']
    },
    methods: {
        resetUsers: function (arr) {
            this.users = arr;
        },
        updateMessage: function (msg) {
            this.messages.push(msg);
        },
        sendInv: function (target) {
            const sender = $('#username').text();
            console.log([target,sender]);
            //отправляем приглос
            sock.emit('sendRequest', [target,sender]);

        }
    }

});
//конектимся к серверу
const sock = io({ transports: ['websocket'], upgrade: false });


sock.on("connect", () => {
    var user = $('#username').text();

    console.log('connected!');

    sock.emit('login', user);

    //юзеры - онлайн
    sock.on('data', (data) => {
        app.resetUsers(data);
    });

    //лог игры
    sock.on('message', (msg) => {
        app.updateMessage(msg);
    });


    //получаем приглос
    sock.on('invitation', (arr) => {
        console.log(arr[0] + 'priglos');
        if (arr[0] === user) {
            alert("You are invited to play by  "+ arr[1]);
        }
    });


});





$(document).ready(function () {
    //обработчик игры 
    const addButtonListeners = () => {
        ['rock', 'paper', 'scissors', 'lizard', 'spok'].forEach((id) => {
            const button = document.getElementById(id);
            button.addEventListener('click', () => {
                console.log("Clicked" + id)
                sock.emit('turn', id);
            });
        });
    };

    addButtonListeners();



});



