import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://dream-wedding-production-89ae.up.railway.app';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to The Dream Wedding socket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
  }
  return socket;
};

export const joinConversation = (userId: string, vendorId: string) => {
  const s = connectSocket();
  s.emit('join_conversation', { userId, vendorId });
};

export const sendSocketMessage = (userId: string, vendorId: string, message: string, senderType: 'user' | 'vendor') => {
  const s = connectSocket();
  s.emit('send_message', { userId, vendorId, message, senderType });
};

export const onReceiveMessage = (callback: (message: any) => void) => {
  const s = connectSocket();
  s.on('receive_message', callback);
};

export const offReceiveMessage = () => {
  if (socket) {
    socket.off('receive_message');
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
