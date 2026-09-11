import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSharedSocket } from '../hooks/useSocket';

/**
 * Global hook to keep React Query caches in sync with incoming WebSocket events.
 * When a task status change or activity occurs, relevant task and project queries
 * are immediately invalidated so the UI updates in real time without page refresh.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    const handleActivityNew = () => {
      // Invalidate all task lists and project details so UI updates live
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['adminAllTasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    };

    socket.on('activity:new', handleActivityNew);

    return () => {
      socket.off('activity:new', handleActivityNew);
    };
  }, [queryClient]);
}
