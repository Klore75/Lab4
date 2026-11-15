const express = require("express");

const http = require("http");

const WebSocket = require("ws");

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const GAME_PASSWORD = "secret123";

// Shared game state

let gameState = {

    board: Array(9).fill(""),

    currentPlayer: "X",

    winner: null

};

// Track the two active players

const players = {

    X: null,

    O: null

};

// Send the current game state to every connected browser

function broadcastState() {

    const payload = JSON.stringify({

        type: "state",

        gameState

    });

    wss.clients.forEach(client => {

        if (client.readyState === WebSocket.OPEN) {

            client.send(payload);

        }

    });

}

// Check whether a player has won

function checkWinner(board) {

    const lines = [

        [0, 1, 2],

        [3, 4, 5],

        [6, 7, 8],

        [0, 3, 6],

        [1, 4, 7],

        [2, 5, 8],

        [0, 4, 8],

        [2, 4, 6]

    ];

    for (const [a, b, c] of lines) {

        if (

            board[a] !== "" &&

            board[a] === board[b] &&

            board[a] === board[c]

        ) {

            return board[a];

        }

    }

    return null;

}

// Handle each WebSocket connection

wss.on("connection", ws => {

    ws.playerName = "";

    ws.role = "spectator";

    ws.authenticated = false;

    // Send the existing game state to the new connection

    ws.send(JSON.stringify({

        type: "state",

        gameState

    }));

    // Process messages from this browser

    ws.on("message", message => {

        let data;

        try {

            data = JSON.parse(message);

        } catch {

            ws.send(JSON.stringify({

                type: "error",

                message: "Invalid message format."

            }));

            return;

        }

        // LOGIN

        if (data.type === "login") {

            if (ws.authenticated) {

                return;

            }

            if (data.password !== GAME_PASSWORD) {

                ws.send(JSON.stringify({

                    type: "error",

                    message: "Invalid password."

                }));

                return;

            }

            const name = String(data.name || "").trim();

            if (!name) {

                ws.send(JSON.stringify({

                    type: "error",

                    message: "Please enter your first name."

                }));

                return;

            }

            ws.playerName = name;

            ws.authenticated = true;

            if (!players.X) {

                players.X = ws;

                ws.role = "X";

            } else if (!players.O) {

                players.O = ws;

                ws.role = "O";

            } else {

                ws.role = "spectator";

            }

            ws.send(JSON.stringify({

                type: "role",

                role: ws.role,

                name: ws.playerName

            }));

            return;

        }

        // All other actions require a successful login

        if (!ws.authenticated) {

            ws.send(JSON.stringify({

                type: "error",

                message: "Please join the game first."

            }));

            return;

        }

        // PLACE A PIECE

        if (data.type === "place") {

            const index = data.index;

            // Only the two assigned players can make moves

            if (ws.role !== "X" && ws.role !== "O") {

                return;

            }

            // Check that the cell index is valid

            if (

                !Number.isInteger(index) ||

                index < 0 ||

                index > 8

            ) {

                return;

            }

            // Only the current player may move

            if (ws.role !== gameState.currentPlayer) {

                return;

            }

            // Do not allow moves after the game ends

            if (gameState.winner) {

                return;

            }

            // Do not overwrite an occupied cell

            if (gameState.board[index] !== "") {

                return;

            }

            gameState.board[index] = ws.role;

            const winner = checkWinner(gameState.board);

            if (winner) {

                gameState.winner = winner;

            } else if (gameState.board.every(cell => cell !== "")) {

                gameState.winner = "Draw";

            } else {

                gameState.currentPlayer =

                    gameState.currentPlayer === "X" ? "O" : "X";

            }

            broadcastState();

            return;

        }

        // RESET THE GAME

        if (data.type === "reset") {

            // Only an assigned player can reset the game

            if (ws.role !== "X" && ws.role !== "O") {

                return;

            }

            gameState = {

                board: Array(9).fill(""),

                currentPlayer: "X",

                winner: null

            };

            broadcastState();

        }

    });

    // Free the player's slot when they disconnect

    ws.on("close", () => {

        if (players.X === ws) {

            players.X = null;

        }

        if (players.O === ws) {

            players.O = null;

        }

    });

});

// Start the server

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
