const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });
const clients = new Map();
const players = new Map();

wss.on('connection', (ws, req) => {
    console.log(`Client connected: ${req.headers['sec-websocket-key']}`);

    const urlParams = new URLSearchParams(req.url.slice(1));
    const roomId = urlParams.get('roomId');
    if (!roomId) {
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Missing roomId.'
        }));
        ws.close();
        return;
    }

    if (urlParams.get('token') !== process.env.TOKEN) {
        console.log('Invalid token: ' + urlParams.get('token'));
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Invalid token.'
        }));
        ws.close();
        return;
    }

    if (!clients.has(roomId)) {
        clients.set(roomId, new Set());
    }
    clients.get(roomId).add(ws);
    console.log(`Client count in room ${roomId}: ${clients.get(roomId).size}`);

    ws.roomId = roomId;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            if (!message.type) {
                throw new Error('Invalid message format: missing type');
            }

            if (message.type === 'move') {
                const { id, x, y, width, height, color } = message;

                if (!ws.playerId) {
                    ws.playerId = id;
                }

                players.set(id, { id, x: parseInt(x, 10), y: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10), color });

                const payload = JSON.stringify({
                    type: 'move',
                    id,
                    x: parseInt(x, 10),
                    y: parseInt(y, 10),
                    width: parseInt(width, 10),
                    height: parseInt(height, 10),
                    color
                });

                clients.get(ws.roomId).forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });

            } else if (message.type === 'chat') {
                const { id, chatMessage } = message;
                if (!ws.playerId) {
                    ws.playerId = id;
                }

                const payload = JSON.stringify({
                    type: 'chat',
                    id,
                    message: chatMessage
                });

                clients.get(ws.roomId).forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });

            } else {
                console.error('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error.message);
        }
    });

    ws.on('close', () => {
        if (clients.has(ws.roomId)) {
            clients.get(ws.roomId).delete(ws);
            console.log(`Client disconnected from room ${ws.roomId}`);

            if (clients.get(ws.roomId).size === 0) {
                clients.delete(ws.roomId);
            }
        }

        if (ws.playerId) {
            players.delete(ws.playerId);

            const payload = JSON.stringify({
                type: 'move',
                id: ws.playerId,
                left: true
            });
            if (clients.has(ws.roomId)) {
                clients.get(ws.roomId).forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });
            }
        }
    });

    players.forEach(player => {
        if (ws.roomId === player.roomId) {
            ws.send(JSON.stringify({ type: 'move', ...player }));
        }
    });
});
