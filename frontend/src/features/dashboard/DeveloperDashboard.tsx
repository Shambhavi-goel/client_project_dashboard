import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Task } from '../../types';
import { TaskCard } from '../tasks/TaskCard';
import { ActivityFeed } from '../activity/ActivityFeed';
import { CheckSquare, Flame, CheckCircle2 } from 'lucide-react';

export const DeveloperDashboard: React.FC = () => {
  // Fetch developer's assigned tasks (sorted by priority then due date)
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['myTasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks/my');
      return res.data.data;
    },
  });

  const myTasks = tasks || [];
  const inProgressTasks = myTasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = myTasks.filter((t) => t.status === 'DONE');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Developer Workspace
        </h1>
        <p className="text-surface-200 text-sm mt-1">
          Your assigned tasks, sorted by priority and urgency. Update statuses in real time.
        </p>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Assigned Tasks
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">{myTasks.length}</div>
          <span className="text-[11px] text-surface-200 mt-3 block">Total active work items</span>
        </div>

        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-400 mt-3">{inProgressTasks.length}</div>
          <span className="text-[11px] text-surface-200 mt-3 block">Currently being coded</span>
        </div>

        <div className="glass-card p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-200 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-3">{doneTasks.length}</div>
          <span className="text-[11px] text-emerald-300 font-medium mt-3 block">
            Successfully shipped
          </span>
        </div>
      </div>

      {/* Main Grid: Priority-sorted tasks + Developer activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Assigned Tasks Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-400" />
              Prioritized Task Queue
            </h2>
            <span className="text-xs text-surface-200">Sorted: Priority → Due Date</span>
          </div>

          {isLoading ? (
            <div className="glass-card p-12 text-center text-surface-200 text-sm">
              Loading your tasks...
            </div>
          ) : myTasks.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">All caught up!</h3>
              <p className="text-sm text-surface-200 mt-1">
                You have no pending tasks assigned at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Developer-Scoped Live Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed title="My Tasks Activity" limit={15} />
        </div>
      </div>
    </div>
  );
};
