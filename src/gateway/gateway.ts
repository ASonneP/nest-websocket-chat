import { OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
  },
})
export class MyGateWay implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  userCount = 0;

  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log(socket.id);
      console.log('connected');

      this.userCount++; // Increment user count when a new user connects
      this.emitUserCount();
      socket.on('disconnect', () => {
        this.userCount--; // Decrement user count when a user disconnects
        this.emitUserCount(); // Emit updated user count to all clients
      });
    });
  }
  emitUserCount() {
    this.server.emit('userCount', this.userCount); // Emit user count to all clients
  }

  @SubscribeMessage('newMessage')
  onNewMessage(@MessageBody() body: any) {
    console.log(body);
    this.server.emit('onMessage', {
      msg: 'New Message',
      content: body,
      onlineUser: this.userCount,
    });
  }
}
