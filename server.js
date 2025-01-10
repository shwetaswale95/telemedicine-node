const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
// Import video socket logic
const signaling = require("./signaling");

// Initialize Express and create server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files if needed

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Define a schema for chat messages
const chatMessageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create a model for chat messages
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Socket.io setup
io.on('connection', (socket) => {
  console.log('A user connected');

   // Call signaling logic with the socket instance
   signaling(io, socket);  // Ensures signaling logic uses the correct socket object
  // Send all previous chat messages from the database to the connected client
  ChatMessage.find().then((messages) => {
    socket.emit('load_messages', messages);
  });

  // Listen for new messages
  socket.on('send_message', async (data) => {
    console.log('Message received:', data);

    const messageWithTimestamp = {
      ...data, // Use the received data
      timestamp: new Date().toISOString(),
    };
     // Save the message in the database
      const message = new ChatMessage(messageWithTimestamp); // Use your ChatMessage model here
      await message.save(); // Add `await` to ensure the save operation completes

      socket.broadcast.emit('receive_message', messageWithTimestamp);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});
// Start the server
server.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});
