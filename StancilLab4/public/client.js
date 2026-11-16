const boardCanvas = document.getElementById("board");

const ctx = boardCanvas.getContext("2d");

const statusElement = document.getElementById("status");

const roleElement = document.getElementById("role");

const resetBtn = document.getElementById("resetBtn");

const joinBtn = document.getElementById("joinBtn");

const nameInput = document.getElementById("nameInput");

const passwordInput = document.getElementById("passwordInput");

const CELL_SIZE = 200;

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.host}`);

let gameState = null;

let role = "spectator";

// Draw the Tic-Tac-Toe grid

function drawGrid() {

    ctx.strokeStyle = "black";

    ctx.lineWidth = 4;

    for (let i = 1; i < 3; i++) {

        ctx.beginPath();

        ctx.moveTo(i * CELL_SIZE, 0);

        ctx.lineTo(i * CELL_SIZE, 600);

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(0, i * CELL_SIZE);

        ctx.lineTo(600, i * CELL_SIZE);

        ctx.stroke();

    }

}

// Draw X in one cell

function drawX(x, y) {

    const padding = 40;

    ctx.strokeStyle = "red";

    ctx.lineWidth = 8;

    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(x + padding, y + padding);

    ctx.lineTo(

        x + CELL_SIZE - padding,

        y + CELL_SIZE - padding

    );

    ctx.moveTo(x + CELL_SIZE - padding, y + padding);

    ctx.lineTo(x + padding, y + CELL_SIZE - padding);

    ctx.stroke();

}

// Draw O in one cell

function drawO(x, y) {

    ctx.strokeStyle = "blue";

    ctx.lineWidth = 8;

    ctx.beginPath();

    ctx.arc(

        x + CELL_SIZE / 2,

        y + CELL_SIZE / 2,

        CELL_SIZE / 2 - 40,

        0,

        Math.PI * 2

    );

    ctx.stroke();

}

// Draw the complete board

function drawBoard() {

    if (!gameState) {

        return;

    }

    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    drawGrid();

    gameState.board.forEach((value, index) => {

        const row = Math.floor(index / 3);

        const col = index % 3;

        const x = col * CELL_SIZE;

        const y = row * CELL_SIZE;

        if (value === "X") {

            drawX(x, y);

        } else if (value === "O") {

            drawO(x, y);

        }

    });

    if (gameState.winner === "Draw") {

        statusElement.textContent = "It's a draw!";

    } else if (gameState.winner) {

        statusElement.textContent = `Winner: ${gameState.winner}`;

    } else {

        statusElement.textContent = `Turn: ${gameState.currentPlayer}`;

    }

}

// Receive updates from the server

ws.onmessage = event => {

    let data;

    try {

        data = JSON.parse(event.data);

    } catch {

        return;

    }

    if (data.type === "state") {

        gameState = data.gameState;

        drawBoard();

    }

    if (data.type === "role") {

        role = data.role;

        roleElement.textContent =

            `Logged in as ${data.name} (${role})`;

    }

    if (data.type === "error") {

        alert(data.message);

    }

};

ws.onopen = () => {

    statusElement.textContent = "Connected. Join the game to play.";

};

ws.onclose = () => {

    statusElement.textContent = "Disconnected from the server.";

};

ws.onerror = () => {

    statusElement.textContent = "Connection error. Check the server.";

};

// Join the game

joinBtn.addEventListener("click", () => {

    if (ws.readyState !== WebSocket.OPEN) {

        alert("The server connection is not ready.");

        return;

    }

    ws.send(JSON.stringify({

        type: "login",

        name: nameInput.value.trim(),

        password: passwordInput.value

    }));

});

// Place a piece on the board

boardCanvas.addEventListener("click", event => {

    if (role !== "X" && role !== "O") {

        return;

    }

    if (!gameState || gameState.winner) {

        return;

    }

    const rect = boardCanvas.getBoundingClientRect();

    // Account for CSS scaling of the canvas

    const x = (event.clientX - rect.left) *

        (boardCanvas.width / rect.width);

    const y = (event.clientY - rect.top) *

        (boardCanvas.height / rect.height);

    const col = Math.floor(x / CELL_SIZE);

    const row = Math.floor(y / CELL_SIZE);

    const index = row * 3 + col;

    if (index < 0 || index > 8) {

        return;

    }

    ws.send(JSON.stringify({

        type: "place",

        index

    }));

});

// Reset the game

resetBtn.addEventListener("click", () => {

    if (ws.readyState !== WebSocket.OPEN) {

        return;

    }

    ws.send(JSON.stringify({

        type: "reset"

    }));

});
