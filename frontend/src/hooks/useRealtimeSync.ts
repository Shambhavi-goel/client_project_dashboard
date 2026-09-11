import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';

/**
 * Global hook to keep React Query caches in sync with incoming WebSocket events.
 * When a task status change, creation, deletion, or activity occurs, relevant
 * queries are immediately invalidated so the UI updates in real time without page refresh.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      // Invalidate all task lists, project views, dashboards, and feeds
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['adminAllTasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('activity:new', handleSync);
    socket.on('task:updated', handleSync);
    socket.on('task:created', handleSync);
    socket.on('task:deleted', handleSync);
    socket.on('project:created', handleSync);
    socket.on('notification:new', handleSync);

    return () => {
      socket.off('activity:new', handleSync);
      socket.off('task:updated', handleSync);
      socket.off('task:created', handleSync);
      socket.off('task:deleted', handleSync);
      socket.off('project:created', handleSync);
      socket.off('notification:new', handleSync);
    };
  }, [socket, queryClient]);
}
