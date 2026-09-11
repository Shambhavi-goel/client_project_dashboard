import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Project, Task } from '../../types';
import { ActivityFeed } from '../activity/ActivityFeed';
import {
  FolderKanban,
  CheckSquare,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

export const PMDashboard: React.FC = () => {
  // Fetch PM's projects
  const { data: projects, isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data;
    },
  });

  // Fetch PM's tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['myTasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks/my');
      return res.data.data;
    },
  });

  const myProjects = projects || [];
  const myTasks = tasks || [];

  // Priority counts
  const criticalCount = myTasks.filter((t) => t.priority === 'CRITICAL').length;
  const highCount = myTasks.filter((t) => t.priority === 'HIGH').length;
  const mediumCount = myTasks.filter((t) => t.priority === 'MEDIUM').length;
  const lowCount = myTasks.filter((t) => t.priority === 'LOW').length;

  // Upcoming due dates this week
  const upcomingThisWeek = myTasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const due = new Date(t.dueDate);
    const now = new Date();
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return due >= now && due <= oneWeekFromNow;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Project Manager Dashboard
        </h1>
        <p className="text-surface-200 text-sm mt-1">
          Monitor your active projects, team task priorities, and upcoming deliverables
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Managed Projects */}
        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              My Projects
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {isProjectsLoading ? '...' : myProjects.length}
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 font-medium mt-3"
          >
            Explore projects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tasks in Flight */}
        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Total Project Tasks
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {isTasksLoading ? '...' : myTasks.length}
          </div>
          <span className="text-[11px] text-surface-200 mt-3 block">
            Across your project portfolio
          </span>
        </div>

        {/* Deliverables Due This Week */}
        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Due This Week
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {isTasksLoading ? '...' : upcomingThisWeek.length}
          </div>
          <span className="text-[11px] text-rose-300 font-medium mt-3 block">
            Requires milestone review
          </span>
        </div>
      </div>

      {/* Priority Breakdown Row */}
      <div className="glass-card p-6 border border-white/10">
        <h2 className="text-base font-bold text-white mb-4">Tasks by Priority</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-xs font-bold text-rose-300 tracking-wide uppercase">Critical</span>
            <div className="text-2xl font-black text-white mt-1">{criticalCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-xs font-bold text-orange-300 tracking-wide uppercase">High</span>
            <div className="text-2xl font-black text-white mt-1">{highCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-xs font-bold text-blue-300 tracking-wide uppercase">Medium</span>
            <div className="text-2xl font-black text-white mt-1">{mediumCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">Low</span>
            <div className="text-2xl font-black text-white mt-1">{lowCount}</div>
          </div>
        </div>
      </div>

      {/* Main Split: Deliverables Due This Week + Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Upcoming Due Dates This Week */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              Upcoming Due Dates This Week
            </h2>
            <Link
              to="/tasks"
              className="text-xs text-brand-300 hover:text-brand-200 font-medium"
            >
              All tasks →
            </Link>
          </div>

          {upcomingThisWeek.length === 0 ? (
            <div className="glass-card p-8 text-center text-surface-200 text-sm">
              No tasks due in the next 7 days. Your schedule is on track!
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingThisWeek.map((task) => (
                <div
                  key={task.id}
                  className="glass-card p-4 hover:bg-white/[0.08] transition-colors flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{task.title}</h4>
                    <p className="text-xs text-surface-200 mt-0.5">
                      Assignee: {task.assignedDeveloper?.name || 'Unassigned'} •{' '}
                      {task.project?.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-rose-300 block">
                      {format(new Date(task.dueDate!), 'EEE, MMM d')}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-surface-200/80">
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: PM Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed title="Projects Activity Feed" limit={15} />
        </div>
      </div>
    </div>
  );
};
