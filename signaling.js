module.exports = (io, socket) => {
  socket.on('call-offer', (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-offer', {
        offer: data.offer,
        from: socket.id,
      });
    }
  });

  socket.on('call-answer', (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-answer', {
        answer: data.answer,
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const recipientSocket = users[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('ice-candidate', {
        candidate: data.candidate,
      });
    }
  });
};
