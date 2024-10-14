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
        try {
            const message = JSON.parse(data);

            if (!message.type) {
                throw new Error('Invalid message format: missing type');
            }

            if (message.type === 'move') {
                const { id, x, y, width, height, color  } = message;

                if (!ws.playerId) {
                    ws.playerId = id;
                }

                players.set(id, { id, x: parseInt(x), y: parseInt(y), width: parseInt(width), height: parseInt(height), color });

                const payload = JSON.stringify({
                    type: 'move',
                    id,
                    x: parseInt(x),
                    y: parseInt(y),
                    width: parseInt(width),
                    height: parseInt(height),
                    color

                });

                clients.forEach(client => {
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

                clients.forEach(client => {
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
        clients.delete(ws);
        console.log('Client disconnected');

        if (ws.playerId) {
            players.delete(ws.playerId);

            const payload = JSON.stringify({
                type: 'move', 
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
        ws.send(JSON.stringify({ type: 'move', ...player }));
    });
});
