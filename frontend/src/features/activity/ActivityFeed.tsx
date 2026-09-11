import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { TaskActivityLog } from '../../types';
import { getSharedSocket } from '../../hooks/useSocket';
import { Activity, ArrowRight, Clock, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  projectId?: string;
  title?: string;
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  title = 'Live Activity Feed',
  limit = 20,
}) => {
  const [liveLogs, setLiveLogs] = useState<TaskActivityLog[]>([]);

  // 1. Catch-up: fetch initial feed from PostgreSQL REST endpoint
  const { data: initialLogs, isLoading } = useQuery<TaskActivityLog[]>({
    queryKey: ['activityFeed', projectId, limit],
    queryFn: async () => {
      const url = projectId
        ? `/activity/feed?limit=${limit}&projectId=${projectId}`
        : `/activity/feed?limit=${limit}`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  // Sync initial logs
  useEffect(() => {
    if (initialLogs) {
      setLiveLogs(initialLogs);
    }
  }, [initialLogs]);

  // 2. Real-time subscription: listen for activity:new on Socket.io
  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    const handleNewActivity = (activity: TaskActivityLog) => {
      // If scoped to a specific project, ensure event belongs to that project
      if (projectId && activity.projectId !== projectId) {
        return;
      }

      setLiveLogs((prev) => {
        // Avoid duplicate if already exists
        if (prev.some((l) => l.id === activity.id)) return prev;
        return [activity, ...prev.slice(0, limit - 1)];
      });
    };

    socket.on('activity:new', handleNewActivity);
    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [projectId, limit]);

  const formatStatusPill = (status?: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'TODO':
        return <span className="badge badge-todo text-[10px]">Todo</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-in-progress text-[10px]">In Progress</span>;
      case 'IN_REVIEW':
        return <span className="badge badge-in-review text-[10px]">In Review</span>;
      case 'DONE':
        return <span className="badge badge-done text-[10px]">Done</span>;
      default:
        return <span className="badge text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="glass-card overflow-hidden flex flex-col h-full border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Sync
        </span>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[460px]">
        {isLoading ? (
          <div className="p-8 text-center text-surface-200 text-sm">
            Catching up on latest activity...
          </div>
        ) : liveLogs.length === 0 ? (
          <div className="p-8 text-center text-surface-200 text-sm">
            No activity recorded yet
          </div>
        ) : (
          liveLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 hover:bg-white/5 transition-all duration-200 animate-slide-down flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-surface-800 border border-white/5 mt-0.5 text-surface-200">
                <UserIcon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-surface-100 font-medium leading-relaxed">
                  {log.message}
                </p>

                {/* Status Transition Pills if available */}
                {log.fromStatus && log.toStatus && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {formatStatusPill(log.fromStatus)}
                    <ArrowRight className="w-3 h-3 text-surface-200/60" />
                    {formatStatusPill(log.toStatus)}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-surface-200/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>

                  {log.project?.name && (
                    <span className="truncate text-brand-300/80 max-w-[150px]">
                      • {log.project.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
