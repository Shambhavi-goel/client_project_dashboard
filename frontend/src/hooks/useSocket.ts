import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/authStore';

let sharedSocket: Socket | null = null;
let currentToken: string | null = null;
const stateSubscribers = new Set<(s: Socket | null, connected: boolean) => void>();

export function getSharedSocket(): Socket | null {
  return sharedSocket;
}

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(sharedSocket);
  const [isConnected, setIsConnected] = useState(sharedSocket?.connected || false);

  useEffect(() => {
    const subscriber = (s: Socket | null, connected: boolean) => {
      setSocket(s);
      setIsConnected(connected);
    };
    stateSubscribers.add(subscriber);

    // If not authenticated, disconnect shared socket if active
    if (!isAuthenticated || !accessToken) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        currentToken = null;
        stateSubscribers.forEach((sub) => sub(null, false));
      }
      return () => {
        stateSubscribers.delete(subscriber);
      };
    }

    // If socket exists and token has not changed, keep it
    if (sharedSocket && currentToken === accessToken) {
      setSocket(sharedSocket);
      setIsConnected(sharedSocket.connected);
      return () => {
        stateSubscribers.delete(subscriber);
      };
    }

    // If token changed or socket not created yet, create new connection
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
    }

    currentToken = accessToken;
    const rawApi = import.meta.env.VITE_API_URL;
    const socketUrl = rawApi ? rawApi.replace(/\/api\/?$/, '') : '/';

    const s = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    sharedSocket = s;
    stateSubscribers.forEach((sub) => sub(s, s.connected));

    s.on('connect', () => {
      stateSubscribers.forEach((sub) => sub(s, true));
    });

    s.on('disconnect', () => {
      stateSubscribers.forEach((sub) => sub(s, false));
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      stateSubscribers.forEach((sub) => sub(s, false));
    });

    return () => {
      stateSubscribers.delete(subscriber);
    };
  }, [accessToken, isAuthenticated]);

  return {
    socket,
    isConnected,
  };
}
