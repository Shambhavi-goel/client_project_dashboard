import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Task } from '../../types';
import { useAuthStore } from '../../auth/authStore';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { CheckSquare } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  // Developers query /api/tasks/my; PMs/Admins can also query /api/tasks/my
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['myTasks', searchParams.toString()],
    queryFn: async () => {
      const queryString = searchParams.toString();
      const url = `/tasks/my${queryString ? `?${queryString}` : ''}`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {user?.role === 'DEVELOPER' ? 'My Assigned Tasks' : 'Tasks'}
        </h1>
        <p className="text-surface-200 text-sm mt-1">
          {user?.role === 'DEVELOPER'
            ? 'Tasks assigned directly to you, prioritized and filterable'
            : 'Explore, filter, and track project tasks across your scope'}
        </p>
      </div>

      {/* Shareable URL Filters */}
      <TaskFilters />

      {/* Task Grid */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-surface-200 text-sm">
          Loading tasks...
        </div>
      ) : tasks?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckSquare className="w-12 h-12 text-surface-200/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No tasks match criteria</h3>
          <p className="text-sm text-surface-200 mt-1 max-w-sm mx-auto">
            Try adjusting your status, priority, or due date filters above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};
