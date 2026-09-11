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
  Building,
  AlertTriangle,
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

      {/* Managed Projects Summary */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-400" />
              My Projects Summary
            </h2>
            <p className="text-surface-200 text-xs mt-0.5">
              Comprehensive overview of deliverables, health, and completion across your managed projects
            </p>
          </div>
          <Link
            to="/projects"
            className="text-xs text-brand-300 hover:text-brand-200 font-medium inline-flex items-center gap-1"
          >
            All Projects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isProjectsLoading ? (
          <div className="py-8 text-center text-surface-200 text-sm">Loading project summaries...</div>
        ) : myProjects.length === 0 ? (
          <div className="py-8 text-center text-surface-200 text-sm">
            You don't have any managed projects yet.{' '}
            <Link to="/projects" className="text-brand-400 hover:underline">
              Create a project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {myProjects.map((project) => {
              const pTasks = project.tasks || [];
              const total = project._count?.tasks ?? pTasks.length;
              const done = pTasks.filter((t) => t.status === 'DONE').length;
              const inReview = pTasks.filter((t) => t.status === 'IN_REVIEW').length;
              const inProgress = pTasks.filter((t) => t.status === 'IN_PROGRESS').length;
              const todo = pTasks.filter((t) => t.status === 'TODO').length;
              const overdue = pTasks.filter(
                (t) =>
                  t.status !== 'DONE' &&
                  (t.isOverdue || (t.dueDate && new Date(t.dueDate).getTime() < Date.now()))
              ).length;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div
                  key={project.id}
                  className="rounded-xl bg-surface-900/60 border border-white/10 p-4 hover:border-brand-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1">{project.name}</h3>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-brand-400 hover:text-brand-300 shrink-0 p-1 rounded-lg hover:bg-brand-500/10 transition-colors"
                        title="Open Project"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {project.client && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-200 mt-1">
                        <Building className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span className="truncate">{project.client.name}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-surface-200">Progress</span>
                        <span className={percent === 100 ? 'text-emerald-400' : 'text-brand-300'}>
                          {percent}% ({done}/{total} done)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            percent === 100
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-brand-500 to-accent-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task Status Breakdown Tags */}
                  <div className="pt-4 mt-4 border-t border-white/5 grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-surface-800/80 rounded-lg p-1.5">
                      <span className="text-[10px] text-surface-400 block font-medium">To Do</span>
                      <span className="text-xs font-bold text-surface-200">{todo}</span>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-1.5">
                      <span className="text-[10px] text-indigo-300 block font-medium">Active</span>
                      <span className="text-xs font-bold text-indigo-200">{inProgress}</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5">
                      <span className="text-[10px] text-amber-300 block font-medium">Review</span>
                      <span className="text-xs font-bold text-amber-200">{inReview}</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                      <span className="text-[10px] text-emerald-300 block font-medium">Done</span>
                      <span className="text-xs font-bold text-emerald-200">{done}</span>
                    </div>
                  </div>

                  {overdue > 0 && (
                    <div className="mt-2.5 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {overdue} Overdue {overdue === 1 ? 'task' : 'tasks'}
                      </span>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-[11px] underline hover:text-rose-200"
                      >
                        Inspect
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
