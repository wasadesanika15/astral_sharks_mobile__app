import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.100:3000';

class SocketService {
  private socket: Socket | null = null;
  
  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
      });
      
      this.socket.on('connect', () => {
        console.log('Socket connected');
      });
      
      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }
  
  off(event: string) {
    this.socket?.off(event);
  }
  
  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
