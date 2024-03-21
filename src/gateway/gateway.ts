import { OnModuleInit, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface User {
  id: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
  },
})
export class MyGateWay implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MyGateway');
  private rooms: { [roomName: string]: User[] } = {}; // Object to store users in each room

  onModuleInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { room: string, username: string }, @ConnectedSocket() client: Socket) {
    const { room, username } = data;

    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    
    // Add user to the room
    if (!this.rooms[room]) {
      this.rooms[room] = [{ id: client.id, username }];
    } else {
      this.rooms[room].push({ id: client.id, username });
    }

    // Emit user count and user list to all clients in the room
    this.server.to(room).emit('userCount', this.rooms[room].length);
    this.server.to(room).emit('userList', this.rooms[room]);
    this.server.to(room).emit('userJoined', { id: client.id, username, room });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);

    // Remove user from the room
    if (this.rooms[room]) {
      this.rooms[room] = this.rooms[room].filter(user => user.id !== client.id);

      // Emit updated user count and user list to all clients in the room
      this.server.to(room).emit('userCount', this.rooms[room].length);
      this.server.to(room).emit('userList', this.rooms[room]);
    }
    // Update room participants or notify other members as needed
  }

  @SubscribeMessage('newMessage')
  handleNewMessage(@MessageBody() data: { room: string; message: string }, @ConnectedSocket() client: Socket) {
    const { room, message } = data;
    this.logger.log(`New message in room ${room}: ${message}`);
    this.server.to(room).emit('onMessage', {
      msg: 'New Message',
      content: message,
      senderId: client.id,
    });
  }
}
