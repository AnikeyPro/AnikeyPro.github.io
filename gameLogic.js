class Game {
    constructor(p1, p2, room, users) {
        this._players = [p1, p2];
        this._turns = [null, null];
        this._users = users;
        this.room = room;
        this.interval = null;
        this.turnTime = 30;//время на ход

        //чистим листенеры, дабы избежать дублирования
        this._players.forEach((player, idx) => {
            player.removeAllListeners('turn');
            player.removeAllListeners('game-end');
            player.removeAllListeners('round-finished');
        });
        clearInterval(this.interval);

        //приветствие
        this._sendToPlayers('LET THE GAME BEGIN!!!');

        //устанавливаем таймер на ход 30 секк
        this._setTimeOut(this.turnTime);

        // остслеживаем ходы
        this._players.forEach((player, idx) => {
            player.on('turn', (turn) => {
                this._onTurn(idx, turn);
            });
        });

        //Включаем таймер при переходе на новый раунд
        p1.on('round-finished', (state) => {
            if (state) {
                this._setTimeOut(this.turnTime);
            }
        });

        this._players.forEach((player, idx) => {
            player.on('game-end', () => {
                clearInterval(this.interval);
            });
        });
    }

    //настраиваем таймер 
    _setTimeOut(time) {
        let countdown = time;
        this.interval = setInterval(() => {
            this._timerToPlayers(countdown);
            countdown--;
            if (countdown == 0) {
                clearInterval(this.interval);
                //проверяем если кто то пропустил ход
                if (this._turns.includes(null)) {
                    if (this._turns[0] == null && this._turns[1] == null) {
                        this._sendWinMessage(this._players[0], this._players[1], 3);
                        this._turns = [null, null];
                    } else if (this._turns[1] == null) {
                        this._sendWinMessage(this._players[0], this._players[1], -1);
                        this._emitTurns(this._turns.reverse());
                        this._turns = [null, null];
                    } else if (this._turns[0] == null) {
                        this._sendWinMessage(this._players[1], this._players[0], -2);
                        this._emitTurns(this._turns.reverse());
                        this._turns = [null, null];
                    }
                }
            }
        }, 1000);
    }

    //сообщение только игроку
    _sendToPlayer(playerIndex, msg) {
        this._players[playerIndex].emit('message', msg);
    }

    //сообщение всем
    _sendToPlayers(msg) {
        this._players.forEach(player => {
            player.emit('message', msg);
        })
    }

    //отображаем таймер игрокам
    _timerToPlayers(timeout) {
        this._players.forEach(player => {
            player.emit('timer', timeout);
        })
    }

    //отправляем текстовое подтверждение хода
    _onTurn(playerIndex, turn) {
        this._turns[playerIndex] = turn;
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

            //останавливаем таймер
            clearInterval(this.interval);
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
    * p0 - ход первого игрока
    * p1 - ход второго игрока
    * 
    * если 0 - ничья
    * 1,2 - поебеда первого
    * 3,4 - поебеда второго
    * 
    */
    _getGameResult() {
        const p0 = this._decodeTurn(this._turns[0]);
        const p1 = this._decodeTurn(this._turns[1]);

        const difference = (p1 - p0 + 5) % 5;

        switch (difference) {
            case 0:
                this._sendWinMessage(this._players[0], this._players[1], 2);
                break;

            case 1:
            case 2:
                this._sendWinMessage(this._players[0], this._players[1], 0);
                break;

            case 3:
            case 4:
                this._sendWinMessage(this._players[1], this._players[0], 1);
                break;
        }
    }

    /**
     * Приятные победные(но это не точно) сообщения
     * winnerIdx коды:
     * 0 - победа первого
     * 1 - победа второго 
     * 2 - ничья
     * 3 - ничья таймаут у обоих
     * -1 - победа первого в связи с таймаутом второго 
     * -2 - победа второго в связи с таймаутом первого 
     */
    _sendWinMessage(winner, loser, winnerIdx) {
        let winnerName = '';
        switch (winnerIdx) {
            case 2:
                winnerName = 'DRAW';
                winner.emit('end-of-round', 'Draw! There is no winner this time!', winnerName);
                loser.emit('end-of-round', 'Draw! There is no winner this time!', winnerName);
                break;
            case 3:
                winnerName = 'DRAWNOTIME';
                winner.emit('end-of-round', 'Draw! Both players are out of time.', winnerName);
                loser.emit('end-of-round', 'Draw! Both players are out of time.', winnerName);
                break;
            case -1:
                winnerName = this._users[0];
                winner.emit('end-of-round', 'You won this round! Opponent timed out!', winnerName, true);
                loser.emit('end-of-round', 'Time out!', winnerName, true);
                break;
            case -2:
                winnerName = this._users[1];
                winner.emit('end-of-round', 'You won this round!  Opponent timed out!', winnerName, true);
                loser.emit('end-of-round', 'Time out!', winnerName, true);
                break;
            default:
                winnerName = this._users[winnerIdx];
                winner.emit('end-of-round', 'You won this round!', winnerName);
                loser.emit('end-of-round', 'You lost this round!', winnerName);
                break;
        }
    }

    //Заменяем ход цифрой
    _decodeTurn(turn) {
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