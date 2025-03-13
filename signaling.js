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
    console.log(`📞 Call offer from ${data.from} to ${data.to}`);
  
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      console.log(`✅ Relaying call offer to ${data.to}`);
      io.to(recipientSocket).emit("call-offer", { from: data.from, offer: data.offer });
  
      // Save call data in DB
      try {
        await CallData.create({ from: data.from, to: data.to, offer: data.offer });
        console.log("Call offer saved to the database.");
      } catch (err) {
        console.error("Error saving call offer:", err);
      }
    } else {
      console.log(`❌ User ${data.to} not found.`);
    }
  });
  

  // Handle incoming call answer
  socket.on("call-answer", async (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit("call-answer", { answer: data.answer });
  
      try {
        const updatedCall = await CallData.findOneAndUpdate(
          { from: data.from, to: data.to },
          { answer: data.answer },
          { new: true }
        );
  
        if (updatedCall) {
          console.log("✅ Call answer updated in DB.");
        } else {
          console.log("⚠️ No matching call found, creating new entry.");
          await CallData.create({ from: data.from, to: data.to, answer: data.answer });
        }
      } catch (err) {
        console.error("Error updating call answer:", err);
      }
    } else {
      console.log(`❌ Recipient ${data.to} not found.`);
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
  socket.on("call-reject", async (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit("call-reject");
      console.log(`🚫 Call rejected by ${data.from} to ${data.to}`);
  
      try {
        await CallData.findOneAndUpdate(
          { from: data.to, to: data.from },
          { answer: "rejected" },
          { new: true }
        );
      } catch (err) {
        console.error("Error logging call rejection:", err);
      }
    } else {
      console.log(`❌ Recipient ${data.to} not found.`);
    }
  });
  

  socket.on("call-ended", (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit("call-ended");
      console.log(`Call ended notification sent to ${data.to}`);
    }
  });
  
  // Handle user disconnection
  socket.on("disconnect", () => {
    let disconnectedUser = null;
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) {
        disconnectedUser = userId;
        delete users[userId];
        console.log(`🔌 User disconnected: ${userId}`);
        break;
      }
    }
  
    if (disconnectedUser) {
      for (const [userId, socketId] of Object.entries(users)) {
        io.to(socketId).emit("user-disconnected", { userId: disconnectedUser });
      }
    }
  });
  
};
