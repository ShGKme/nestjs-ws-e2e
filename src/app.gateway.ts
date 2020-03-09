import { SubscribeMessage, WebSocketGateway, WsResponse, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class AppGateway {
  @WebSocketServer()
  private server: Server;

  // Return payload in an acknowledgement
  @SubscribeMessage('echo')
  handleEcho(client: any, payload: any): string {
    return payload;
  }

  // Emit message back with payload
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): WsResponse<any> {
    return { event: 'message', data: payload };
  }

  // Emit message back with payload after 2 seconds
  @SubscribeMessage('async-message')
  async handleAsyncMessage(client: any, payload: any): Promise<WsResponse<any>> {
    await new Promise((resolve) => { setTimeout(resolve, 2000); });
    return { event: 'message', data: payload };
  }
  
  // Broadcast payload
  @SubscribeMessage('broadcast')
  handleBroascast(client: any, payload: any) {
    this.server.emit('broadcast', payload);
  }
}
