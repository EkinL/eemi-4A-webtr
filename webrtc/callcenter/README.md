# Simple WebRTC Call Center

This example demonstrates a minimal WebRTC call center using a WebSocket signaling server.

## Server

```
cd server
npm install
npm start
```

The server listens on `ws://localhost:3000`.

## Client

Open `client/index.html` in a modern browser. You can serve the directory using any static HTTP server.

1. Enter a unique username.
2. Click another username to initiate a call.
3. Accept incoming calls when prompted.

Both audio and video are shared between peers.
