import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Notification } from '../../types';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, UserCheck, Eye } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Fetch notifications
  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=20');
      return res.data.data;
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Listen for real-time notification:new WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (payload: { notification: Notification; unreadCount: number }) => {
      queryClient.setQueryData(
        ['notifications'],
        (old: { notifications: Notification[]; unreadCount: number } | undefined) => {
          if (!old) {
            return { notifications: [payload.notification], unreadCount: payload.unreadCount };
          }
          const exists = old.notifications.some((n) => n.id === payload.notification.id);
          return {
            notifications: exists ? old.notifications : [payload.notification, ...old.notifications],
            unreadCount: payload.unreadCount,
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, queryClient]);

  // Mark single notification read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserCheck className="w-4 h-4 text-indigo-400" />;
      case 'TASK_IN_REVIEW':
        return <Eye className="w-4 h-4 text-amber-400" />;
      case 'TASK_OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-200 hover:text-white transition-all duration-200 border border-white/10 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-rose-500 rounded-full ring-2 ring-surface-900 animate-pulse-soft">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface-900 border border-surface-700 shadow-2xl rounded-2xl z-50 overflow-hidden animate-slide-down">
          <div className="p-4 bg-surface-800/90 border-b border-surface-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-500/20 text-brand-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-surface-800 bg-surface-900">
            {isLoading ? (
              <div className="p-8 text-center text-surface-200 text-sm">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-surface-200 text-sm">
                No notifications right now
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors ${
                    !notif.isRead
                      ? 'bg-brand-500/15 hover:bg-brand-500/20'
                      : 'hover:bg-surface-800/60 opacity-90'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-surface-800 border border-surface-700 shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-white font-medium leading-snug break-words">
                      {notif.message}
                    </p>
                    <span className="text-[11px] text-surface-200 mt-1 inline-block">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      disabled={markReadMutation.isPending}
                      className="p-1.5 rounded-lg text-surface-200 hover:text-white hover:bg-surface-700 transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
