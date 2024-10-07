const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

const players = new Map();

wss.on('connection', (ws, req) => {
    console.log(`Client connected: ${req.headers['sec-websocket-key']}`);

    const urlParams = new URLSearchParams(req.url.slice(1));
    if (urlParams.get('token') !== process.env.TOKEN) {
        console.log('Invalid token: ' + urlParams.get('token'));
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Invalid token.'
        }));
        ws.close();
        return;
    }

    clients.add(ws);
    console.log(`Client count: ${clients.size}`);

    ws.on('message', (data) => {
        const message = String(data);
        console.log(`Received: ${message}`);

        const [id, x, y, color] = message.split(':');

        if (!ws.playerId) {
            ws.playerId = id;
        }

        players.set(id, { id, x: parseInt(x), y: parseInt(y), color, width: parseInt(width), height: parseInt(height) });

        const payload = JSON.stringify({
            id,
            x: parseInt(x),
            y: parseInt(y),
            color,
            width: parseInt(width),
            height: parseInt(height)
        });

        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');

        if (ws.playerId) {
            players.delete(ws.playerId);

            const payload = JSON.stringify({
                id: ws.playerId,
                left: true
            });
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            });
        }
    });

    players.forEach(player => {
        ws.send(JSON.stringify(player));
    });
});
