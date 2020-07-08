//класс для инфы о пользователях
class UsersOnline {
    constructor() {
        this.users = {};
        this.statuses = {};
        this.rooms = {}
    }

    newUserOnline(sid, name) {
        if (name) {
            this.users[sid] = name
            this.statuses[name] = 'ready'
        }
    }

    getUserName(sid) {
        return this.users[sid]
    }

    getSidByName(name) {
        return Object.keys(this.users).find(sid => this.users[sid] === name);
    }


    deleteUser(sid) {
        delete this.statuses[this.users[sid]]; 
        delete this.users[sid];
    }

    setStatusBySid(sid, status) {
        this.statuses[this.users[sid]] = status;
    }

    setStatusByName(name, status) {
        if (name) {
            this.statuses[name] = status;
        }
    }

    getStatusByName(name) {
        return this.statuses[name]
    }


    getUsersAndStatuses() {
        return this.statuses
    }

    getUsersAndSids() {
        return this.users
    }

    createNewRoom(roomName) {
        this.rooms[roomName] = { users: {} }
    }

    joinRoom(sid, roomName) {
        this.rooms[roomName].users[sid] = this.getUserName(sid);
    }

    deleteFromRoom(socket) {
        this._getUsersFroomRooms(socket.id).forEach(room => {
            socket.to(room).broadcast.emit('user-disconnected', this.rooms[room].users[socket.id])
            delete this.rooms[room].users[socket.id];
        })
    }

    _getUsersFroomRooms(sid) {
        return Object.entries(this.rooms).reduce((names, [name, room]) => {
            if (room.users[sid] != null) names.push(name)
            return names
        }, [])
    }

}


module.exports = UsersOnline;