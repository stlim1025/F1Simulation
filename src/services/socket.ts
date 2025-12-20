import { io, Socket } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;

export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    transports: ['polling', 'websocket'],
});
