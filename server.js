const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const fs = require('fs');

const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const BOT_NAME = 'BOT';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(BOT_NAME, 'Welcome to the chat room!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(BOT_NAME, `${user.username} has joined the chat`)
      );

   /*  socket.on('image', async image => {
      const buffer = Buffer.from(image, 'base64');
      await fs.writeFile('/tmp/image', buffer).catch(console.error); // fs.promises
    });
    socket.emit('image', image.toString('base64')); */

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(BOT_NAME, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
