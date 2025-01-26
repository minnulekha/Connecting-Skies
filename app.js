const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3002;

let players = {};
let scores = [0, 0];
let turn = 0;
let waitingForPlayers = true;
let previousGuess = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public/index.html')); });
app.get('/games', (req, res) => { res.sendFile(path.join(__dirname, 'public/games.html')); });
app.get('/movies', (req, res) => { res.sendFile(path.join(__dirname, 'public/movies.html')); });
app.get('/playlist', (req, res) => { res.sendFile(path.join(__dirname, 'public/songs.html')); });
app.get('/advice', (req, res) => { res.sendFile(path.join(__dirname, 'public/advice.html')); });
app.get('/about', (req, res) => { res.sendFile(path.join(__dirname, 'public/about.html')); });
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'public/login.html')); });

// Catch-all route for undefined paths
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGame', () => {
        if (players[socket.id]) {
            socket.emit('message', 'You have already joined the game.');
            return;
        }

        if (Object.keys(players).length < 2) {
            players[socket.id] = Object.keys(players).length + 1;
            socket.emit('playerNumber', players[socket.id]);

            if (Object.keys(players).length === 2) {
                waitingForPlayers = false;
                io.emit('message', "Both players connected. Player 1's turn to guess a number.");
                io.emit('gameReady', true);
            } else {
                socket.emit('message', 'Waiting for another player to join...');
            }
        } else {
            socket.emit('message', 'Game is full.');
            socket.disconnect();
        }
    });

    socket.on('playerChoice', (number) => {
        if (waitingForPlayers || Object.keys(players).length < 2) {
            socket.emit('message', 'Waiting for both players to connect...');
            return;
        }

        let currentPlayer = Object.keys(players)[turn % 2];
        if (socket.id !== currentPlayer) {
            socket.emit('message', "It's not your turn!");
            return;
        }

        if (previousGuess === null) {
            previousGuess = number;
            io.to(Object.keys(players).find(id => id !== socket.id)).emit('message', 'Your turn to guess the number.');
        } else {
            let opponent = Object.keys(players).find(id => id !== socket.id);
            if (number === previousGuess) {
                scores[players[socket.id] - 1] += 2;
            } else {
                scores[players[opponent] - 1] += 1;
            }

            previousGuess = null;
            turn++;
            io.emit('updateScore', scores);
            io.emit('message', `Player ${turn % 2 + 1}'s turn to guess.`);

            if (scores.includes(20)) {
                let winner = scores[0] === 20 ? 'Player 1' : 'Player 2';
                io.emit('gameOver', winner);
                resetGame();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (players[socket.id]) {
            delete players[socket.id];
            scores = [0, 0];
            turn = 0;
            waitingForPlayers = true;
            previousGuess = null;
            io.emit('message', 'A player has disconnected. Waiting for a new player...');
        }
    });
});

function resetGame() {
    scores = [0, 0];
    turn = 0;
    players = {};
    waitingForPlayers = true;
    previousGuess = null;
}

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});



