// server.js

const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

const players = new Map(); 

wss.on('connection', (ws, req) => {
    console.log(`Client connected: ${req.headers['sec-websocket-key']}`);

    const urlParams = new URLSearchParams(req.url.slice(1)); 
    const token = urlParams.get('token');
    const roomId = urlParams.get('roomId'); 

    if (token !== process.env.TOKEN) {
        console.log('Invalid token: ' + token);
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Invalid token.'
        }));
        ws.close();
        return;
    }

    if (!roomId) {
        console.log('Room ID missing');
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Room ID missing.'
        }));
        ws.close();
        return;
    }

    clients.add(ws);
    ws.roomId = roomId; 
    console.log(`Client count: ${clients.size} in room: ${roomId}`);


    if (!players.has(roomId)) {
        players.set(roomId, new Map());
    }
    const roomPlayers = players.get(roomId);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            if (!message.type) {
                throw new Error('Invalid message format: missing type');
            }

            if (message.type === 'move') {
                const { id, x, y, color, roomId: msgRoomId } = message;

                if (msgRoomId !== ws.roomId) {
                    console.warn(`Meddelande från fel rum: ${msgRoomId}`);
                    return; 
                }

                if (!ws.playerId) {
                    ws.playerId = id;
                }

                roomPlayers.set(id, { id, x: parseInt(x), y: parseInt(y), color, width: 50, height: 50 });

                const payload = JSON.stringify({
                    type: 'move',
                    id,
                    x: parseInt(x),
                    y: parseInt(y),
                    color,
                    roomId: ws.roomId 
                });


                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.roomId === ws.roomId) {
                        client.send(payload);
                    }
                });

            } else if (message.type === 'chat') {
                const { id, message: chatMessage, roomId: msgRoomId } = message;

                if (msgRoomId !== ws.roomId) {
                    console.warn(`Chat-meddelande från fel rum: ${msgRoomId}`);
                    return;
                }

                if (!ws.playerId) {
                    ws.playerId = id;
                }

                const payload = JSON.stringify({
                    type: 'chat',
                    id,
                    message: chatMessage,
                    roomId: ws.roomId 
                });


                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.roomId === ws.roomId) {
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

        if (ws.playerId && players.has(ws.roomId)) {
            const roomPlayers = players.get(ws.roomId);
            roomPlayers.delete(ws.playerId);

            const payload = JSON.stringify({
                type: 'move',
                id: ws.playerId,
                left: true,
                roomId: ws.roomId 
            });

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client.roomId === ws.roomId) {
                    client.send(payload);
                }
            });


            if (roomPlayers.size === 0) {
                players.delete(ws.roomId);
            }
        }
    });

    roomPlayers.forEach(player => {
        ws.send(JSON.stringify({ type: 'move', ...player, roomId: ws.roomId }));
    });
});
