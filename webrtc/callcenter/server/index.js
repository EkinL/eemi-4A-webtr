const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const server = createServer();
const wss = new WebSocketServer({ server });

const clients = new Map(); // username -> connection

function broadcastUsers() {
  const users = Array.from(clients.keys());
  const message = JSON.stringify({ type: 'users', payload: users });
  for (const [, ws] of clients) {
    ws.send(message);
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'login': {
        const username = msg.payload.username;
        if (clients.has(username)) {
          ws.send(JSON.stringify({ type: 'login', success: false }));
          return;
        }
        ws.username = username;
        clients.set(username, ws);
        ws.send(
          JSON.stringify({ type: 'login', success: true, username })
        );
        broadcastUsers();
        break;
      }
      case 'offer':
      case 'answer':
      case 'candidate':
      case 'hangup': {
        const target = msg.payload.target;
        const targetWs = clients.get(target);
        if (targetWs) {
          targetWs.send(
            JSON.stringify({
              type: msg.type,
              payload: { ...msg.payload, from: ws.username },
            })
          );
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ws.username) {
      clients.delete(ws.username);
      broadcastUsers();
    }
  });
});

server.listen(3000, () => console.log('Signaling server on port 3000'));
