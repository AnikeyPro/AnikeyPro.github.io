class Game {
    constructor(p1, p2, room, users) {
        this._players = [p1, p2];
        this._turns = [null, null];
        this._users = users;
        this.room = room;

        this._sendToPlayers('LET THE GAME BEGIN!!!');

        this._players.forEach((player, idx) => {
            player.on('turn', (turn) => {
                
        console.log('When??/ ' + this._turns);
                this._onTurn(idx, turn);
            });
        });


        // var countdown = 15;
        // setInterval(function() {
        //   countdown--;
        //   this._timerToPlayers(countdown);

        // }, 1000);
    }
    //сообщение только игроку
    _sendToPlayer(playerIndex, msg) {
        console.log(this.room + '2sent li? ' + this._players[playerIndex].id + '  messaga ' + msg);
        this._players[playerIndex].emit('message', msg);
    }

    //сообщение всем
    _sendToPlayers(msg) {
        this._players.forEach(player => {
            player.emit('message', msg);
        })
    }

    _timerToPlayers(timeout) {
        this._players.forEach(player => {
            player.emit('timer', timeout);
        })
    }

    //отправляем текстовое подтверждение хода
    _onTurn(playerIndex, turn) {
        this._turns[playerIndex] = turn;
        console.log('1sent li? ' + playerIndex + '  messaga ' + turn);
        this._sendToPlayer(playerIndex, `You selected ${turn}`);


        this._checkTurnOver();
    }

    //если оба игрок сделали ход
    _checkTurnOver() {
        const turns = this._turns;

        if (turns[0] && turns[1]) {
            this._players.forEach((player, idx) => {
                this._sendToPlayer(idx, 'Turn is over with  ' + turns.join(' : '));
                turns.reverse();
            });
            this._emitTurns(turns.reverse());
            this._getGameResult();
            this._turns = [null, null];
            this._sendToPlayers('Next Round!');

        }
    }

    //показываем ход противника
    _emitTurns(turns) {
        this._players.forEach((player, idx) => {
            player.emit('opponents-turn', turns[idx]);
        })
    }


    /**
    * Tут вся логика, по формуле (p0-p1 + 5)%5 где 
    * p0 - первый игрок
    * p1 - второй игрок
    * 
    * если 0 - ничья
    * 1,2 - поебеда первого
    * 3,4 - поебеда второго
    * 
    */
    _getGameResult() {
        const p0 = this._decodeTurn(this._turns[0]);
        const p1 = this._decodeTurn(this._turns[1]);

        console.log(this._turns + ' turns');
        console.log(p1+ ' - ' + p0 );
        console.log(p1+ ' - ' + p0 + '=' + (p1 - p0));
        const difference = (p1 - p0 + 5) % 5;

        console.log('diff ' + difference)
        switch (difference) {
            case 0:
                this._sendWinMessage(this._players[0], this._players[1],2);
                break;

            case 1:
            case 2:
                this._sendWinMessage(this._players[0], this._players[1],0);
                console.log('are we here?')
                break;

            case 3:
            case 4:
                this._sendWinMessage(this._players[1], this._players[0],1);
                console.log('or here?')
                break;
        }
    }


    //приятные победные сообщения
    _sendWinMessage(winner, loser , winnerIdx) {
        let winnerName = this._users[winnerIdx];
        //проверка на ничью
        if(winnerIdx == 2){
            winnerName = 'DRAW';
            winner.emit('end-of-round', 'Draw! There is no winner this time!', winnerName);
            loser.emit('end-of-round', 'Draw! There is no winner this time!', winnerName);
        }else{
            winner.emit('end-of-round', 'You won this round!', winnerName);
            loser.emit('end-of-round', 'You lost this round!', winnerName);
        }
    }


    //Заменяем ход цифрой
    _decodeTurn(turn) {
        console.log(turn);
        switch (turn) {
            case 'rock':
                return 1;
            case 'spock':
                return 2;
            case 'paper':
                return 3;
            case 'lizard':
                return 4;
            case 'scissors':
                return 5;
            default:
                throw new Error(`Could not decode turn ${turn}`);
        }
    }


}


module.exports = Game;