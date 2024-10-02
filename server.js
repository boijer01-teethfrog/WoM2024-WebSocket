const WebSocket = require('ws')
const os = require('os')
require('dotenv').config()

const PORT = process.env.PORT || 5000
const wss = new WebSocket.Server({ port: PORT });

// URL example: ws://my-server?token=my-secret-token
wss.on('connection', (ws, req) => {
    console.log('Client connected');

    // Check valid token (set token in .env as TOKEN=my-secret-token )
    const urlParams = new URLSearchParams(req.url.slice(1));
    if (urlParams.get('token') !== process.env.TOKEN) {
        console.log('Invalid token: ' + urlParams.get('token'));
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Invalid token.'
        }));
        ws.close();
    }

    ws.on('message', (message) => {
        console.log('Received message:', message);

        // Send a response back to the client along with some other info
        ws.send(JSON.stringify({
            status: 0,
            msg: String(message).toUpperCase(),
            freemem: Math.round(os.freemem() / 1024 / 1024), // MB
            totalmem: Math.round(os.totalmem() / 1024 / 1024) // MB
        }));
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
