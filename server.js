const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

async function getNames(){
  const sockets = await io.fetchSockets();

  //console.log(sockets);
  // Initialize an empty array to store names
  let names = [];

  console.log("sockets length: " + sockets.length);

  // Loop through all connected sockets
  for (const socketId in sockets) {
    // Check if socket has a 'name' property and push it to the array
    if (sockets[socketId].name) {
      names.push(sockets[socketId].name);
    } else {
      console.log("Failed to get name for socket: " + socketId);
    }
  }

  console.log(names);
  return names;
}

// Returns 0 if the name is not in use else returns the index where it is used + 1
function checkIfNameInUse(names, name) {
  console.log('names: ' + names);

  var index = names.indexOf(name);
  console.log('index: ' + index);
  if (index === -1) {
    return 0;
  }
  else {
    return index + 1;
  }
}

async function sendToUser(recipient, value) {
  const sockets = await io.fetchSockets();
  for (const socketId in sockets) {
    // Check if socket has a 'name' property and push it to the array
    if (sockets[socketId].name == recipient) {
      sockets[socketId].emit('receive message', value);
      break;
    }
  }
}
  

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('send message', (value) => {
    // When the client emits 'send message', this listens and executes
    console.log('send message event received with value: ', value);

    // Send the message to everyone if no recipient was specified
    if(!value.recipient){
      console.log('sending message to everyone');
      socket.broadcast.emit('receive message', value); // Echo the event to everyone else, as they receive
    }
    else{
      if(!value.sender)
      value.sender = socket.name;
    
      console.log('sending message to ' + value.recipient);
      sendToUser(value.recipient, value);
    } // Send the message to the specified recipient
  });

  socket.on('set name', async (value) => {
    console.log('set name event received with value: ', value);

    var names = await getNames(value);
    var ret = checkIfNameInUse(names, value);

    console.log('ret: ' + ret);
    if (!ret) {
      var old = socket.name;
      socket.name = value;

      // Approve Socket Name
      socket.emit('get approval', socket.name);

      // socket.broadcast.emit('user joined', value); For future use

      // Send message to everyone that someone has joined
      
      if(!socket.listed){
        socket.broadcast.emit('receive server message', socket.name + ' joined');

        // Send welcome message
        socket.emit('receive server message', 'Welcome ' + socket.name);
        // Send list of users to new user
        names.forEach((name) => {
          if (name !== socket.name)
            socket.emit(
              'receive server message',
              name + ' is already in the chat'
            );
        });
        socket.listed = true;
      } else {
        socket.broadcast.emit('receive server message', old + ' has changed their name to ' + socket.name);
        socket.emit('receive server message', 'Your name has changed to ' + socket.name);
      }

    } else {
      // Reject Socket Name
      if(socket.name === value) 
      socket.emit('get rejection', { message: 'This is your name already', isFirst: !socket.listed });
      else 
      socket.emit('get rejection', { message: 'Name already in use', isFirst: !socket.listed }); // socket.emit('get rejection', 'Name already in use');
    }
  });

  socket.on('requesting users', async () => {
    console.log('sending users');
    socket.emit('get users', await getNames());
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('receive server message', socket.name + ' left');
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
