import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ withCredentials: true, autoConnect: false });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}
