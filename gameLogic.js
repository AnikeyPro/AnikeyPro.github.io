class Game {
    constructor(p1, p2, room) {
        this._players = [p1, p2];
        this._turns = [null, null];
        this.room = room;

        this._sendToPlayers('LET THE GAME BEGIN!!!');


        this._players.forEach((player, idx) => {
            player.on('turn', (turn) => {
                this._onTurn(idx, turn);
            });
        });
    }

    _sendToPlayer(playerIndex, msg) {
        console.log(this.room + '2sent li? '+ this._players[playerIndex].id + '  messaga '+  msg);
        this._players[playerIndex].emit('message', msg);
    }

    _sendToPlayers(msg) {
        this._players.forEach(player => {
            player.to(this.room).emit('message', msg);
        })
    }

    _onTurn(playerIndex, turn) {
        this._turns[playerIndex] = turn;
        console.log('1sent li? '+ playerIndex + '  messaga '+  turn);
        this._sendToPlayer(playerIndex, `You selected ${turn}`);
    }

}




module.exports = Game;