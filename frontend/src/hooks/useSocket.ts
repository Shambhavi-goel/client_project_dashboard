import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/authStore';

let sharedSocket: Socket | null = null;

export function getSharedSocket(): Socket | null {
  return sharedSocket;
}

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL || '/';

    // Connect socket with Bearer token
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    sharedSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      sharedSocket = null;
      setIsConnected(false);
    };
  }, [accessToken, isAuthenticated]);

  return {
    socket: socketRef.current || sharedSocket,
    isConnected,
  };
}
