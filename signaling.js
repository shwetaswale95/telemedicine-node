const mongoose = require("mongoose");

// Define schema for call data
const callDataSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  offer: Object,
  answer: Object,
  timestamp: { type: Date, default: Date.now },
});

const CallData = mongoose.model("CallData", callDataSchema);

// A dictionary to store active users and their socket IDs
const users = {};

module.exports = (io, socket) => {
  // Register user with their unique userId and map it to their socket ID
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log(`User registered: ${userId} (Socket: ${socket.id})`);
  });

  // Handle incoming call offer
  socket.on("call-offer", async (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      // Emit call offer to the recipient user
      io.to(recipientSocket).emit("call-offer", {
        offer: data.offer,
        from: data.from,
      });

      // Save call offer to the database
      try {
        const call = new CallData({
          from: data.from,
          to: data.to,
          offer: data.offer,
        });
        await call.save();
        console.log("Call offer saved in the database.");
      } catch (err) {
        console.error("Error saving call offer to the database:", err);
      }
    } else {
      console.log(`Recipient with ID ${data.to} not found.`);
    }
  });

  // Handle incoming call answer
  socket.on("call-answer", async (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      // Emit the answer to the recipient user
      io.to(recipientSocket).emit("call-answer", {
        answer: data.answer,
      });

      // Update the database with the call answer
      try {
        await CallData.findOneAndUpdate(
          { from: data.to, to: data.from },
          { answer: data.answer },
          { new: true }
        );
        console.log("Call answer updated in the database.");
      } catch (err) {
        console.error("Error updating call answer in the database:", err);
      }
    } else {
      console.log(`Recipient with ID ${data.to} not found.`);
    }
  });

  // Handle incoming ICE candidates
  socket.on("ice-candidate", (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      // Emit the ICE candidate to the recipient user
      io.to(recipientSocket).emit("ice-candidate", {
        candidate: data.candidate,
      });
    } else {
      console.log(`Recipient with ID ${data.to} not found.`);
    }
  });

  // Handle call rejection
  socket.on("call-reject", (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      // Emit call rejection to the recipient user
      io.to(recipientSocket).emit("call-reject");
    } else {
      console.log(`Recipient with ID ${data.to} not found.`);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) {
        // Remove the user from the active users list
        delete users[userId];
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
};
