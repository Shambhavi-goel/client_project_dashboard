import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Project, Task } from '../../types';
import { ActivityFeed } from '../activity/ActivityFeed';
import { getSharedSocket } from '../../hooks/useSocket';
import {
  FolderKanban,
  AlertOctagon,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [liveOnlineCount, setLiveOnlineCount] = useState<number>(1);

  // Fetch all projects (admin scope)
  const { data: projects, isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data;
    },
  });

  // Fetch all tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['adminAllTasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks/my');
      return res.data.data;
    },
  });

  // Real-time presence listener
  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    const handlePresence = (data: { onlineCount: number }) => {
      setLiveOnlineCount(data.onlineCount);
    };

    socket.on('presence:count', handlePresence);
    return () => {
      socket.off('presence:count', handlePresence);
    };
  }, []);

  const totalProjects = projects?.length || 0;
  const allTasks = tasks || [];
  const todoCount = allTasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = allTasks.filter((t) => t.status === 'IN_REVIEW').length;
  const doneCount = allTasks.filter((t) => t.status === 'DONE').length;
  const overdueCount = allTasks.filter((t) => t.isOverdue && t.status !== 'DONE').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Admin Control Center
        </h1>
        <p className="text-surface-200 text-sm mt-1">
          Global system health, real-time presence, and cross-project tracking
        </p>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="glass-card p-5 border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Total Projects
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {isProjectsLoading ? '...' : totalProjects}
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 font-medium mt-3"
          >
            Manage projects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total Tasks Breakdown */}
        <div className="glass-card p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {isTasksLoading ? '...' : allTasks.length}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px]">
            <span className="text-slate-300 font-medium">{todoCount} todo</span>
            <span className="text-surface-200">•</span>
            <span className="text-blue-300 font-medium">{inProgressCount} active</span>
            <span className="text-surface-200">•</span>
            <span className="text-amber-300 font-medium">{inReviewCount} review</span>
            <span className="text-surface-200">•</span>
            <span className="text-emerald-300 font-medium">{doneCount} done</span>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="glass-card p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Overdue Tasks
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 mt-3">
            {isTasksLoading ? '...' : overdueCount}
          </div>
          <span className="text-[11px] text-surface-200 mt-3 block">
            Auto-flagged by 5-min cron scanner
          </span>
        </div>

        {/* Live Users Online */}
        <div className="glass-card p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Live Presence
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-3 flex items-center gap-2">
            <span>{liveOnlineCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Online
            </span>
          </div>
          <span className="text-[11px] text-surface-200 mt-3 block">
            Real-time in-memory counter
          </span>
        </div>
      </div>

      {/* Main Grid: Projects Overview + Live Global Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Project Highlights */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-400" />
              All Projects Portfolio
            </h2>
            <Link
              to="/projects"
              className="text-xs text-brand-300 hover:text-brand-200 font-medium"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects?.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="glass-card p-5 hover:bg-white/[0.08] transition-colors border border-white/10 flex flex-col justify-between group"
              >
                <div>
                  <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-surface-200 mt-1">Client: {p.client?.name}</p>
                  {p.createdBy && (
                    <p className="text-xs text-amber-300/90 mt-1">PM: {p.createdBy.name}</p>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-surface-200">
                  <span>{p._count?.tasks || 0} tasks</span>
                  <span className="text-brand-300 font-medium group-hover:translate-x-1 transition-transform">
                    Explore →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Global Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed title="Global Activity Feed" limit={20} />
        </div>
      </div>
    </div>
  );
};
