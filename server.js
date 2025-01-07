const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080",  // Allow the frontend (Vue) running on port 8080
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "http://localhost:8080",  // This should allow your Vue app to connect
  methods: ["GET", "POST"]
}));

app.get('/', (req, res) => {
  res.send('Telemedicine Chat Server is running!');
});

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for incoming messages
  socket.on('send_message', (data) => {
    console.log('Message received:', data);

    // Broadcast the message to all other connected clients
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});
