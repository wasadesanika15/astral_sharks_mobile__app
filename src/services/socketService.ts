import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_IO_PATH } from '../config/api';

const MAX_RECONNECT_ATTEMPTS = 8;
const CONNECT_TIMEOUT_MS = 20_000;
const MAX_CONNECT_ERROR_LOGS = 5;

/**
 * Socket.IO over HTTP(S). Never use ws:// in env — pass http(s)://; `io()` performs the upgrade.
 */
class SocketService {
  private socket: Socket | null = null;
  private connectErrorLogs = 0;

  connect() {
    if (this.socket?.connected) {
      return;
    }

    if (!this.socket) {
      if (!/^https?:\/\//i.test(API_BASE_URL)) {
        console.error(
          '[socket] API_BASE_URL must be http:// or https:// (got:',
          API_BASE_URL,
          ')'
        );
        return;
      }

      this.socket = io(API_BASE_URL, {
        path: SOCKET_IO_PATH,
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: CONNECT_TIMEOUT_MS,
        autoConnect: true,
        withCredentials: false,
      });

      this.socket.on('connect', () => {
        this.connectErrorLogs = 0;
        if (__DEV__) {
          console.log('[socket] connected', this.socket?.id, '→', API_BASE_URL);
        }
      });

      this.socket.on('disconnect', (reason) => {
        if (__DEV__) {
          console.log('[socket] disconnect:', reason);
        }
      });

      this.socket.on('connect_error', (err) => {
        if (this.connectErrorLogs < MAX_CONNECT_ERROR_LOGS) {
          this.connectErrorLogs += 1;
          console.warn(
            `[socket] connect_error [${this.connectErrorLogs}/${MAX_CONNECT_ERROR_LOGS}]`,
            err.message,
            '|',
            API_BASE_URL,
            SOCKET_IO_PATH
          );
        }
      });

      this.socket.io.on('reconnect_attempt', (attempt) => {
        if (__DEV__) {
          console.log(`[socket] reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
        }
      });

      this.socket.io.on('reconnect_failed', () => {
        console.warn(
          '[socket] reconnect_failed — gave up after',
          MAX_RECONNECT_ATTEMPTS,
          'attempts. Start the API on',
          API_BASE_URL,
          'or fix EXPO_PUBLIC_API_URL, then reload.'
        );
      });

      this.socket.io.on('reconnect', (attempt) => {
        if (__DEV__) {
          console.log('[socket] reconnected after', attempt, 'attempt(s)');
        }
      });
    } else {
      this.socket.connect();
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  emit(event: string, data: any) {
    if (!this.socket?.connected) {
      if (__DEV__) {
        console.warn('[socket] emit skipped (not connected):', event);
      }
      return;
    }
    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
