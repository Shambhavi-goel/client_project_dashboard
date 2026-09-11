import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { TaskStatus } from '../../types';

interface TaskStatusSelectProps {
  taskId: string;
  currentStatus: TaskStatus;
  disabled?: boolean;
}

export const TaskStatusSelect: React.FC<TaskStatusSelectProps> = ({
  taskId,
  currentStatus,
  disabled = false,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      const res = await apiClient.patch(`/tasks/${taskId}/status`, {
        status: newStatus,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
  });

  const getBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'IN_REVIEW':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DONE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentStatus}
        disabled={disabled || mutation.isPending}
        onChange={(e) => mutation.mutate(e.target.value as TaskStatus)}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer appearance-none pr-6 focus:outline-none transition-all ${getBadgeClass(
          currentStatus
        )} ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.35rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.1em 1.1em',
        }}
      >
        <option value="TODO" className="bg-surface-800 text-white">Todo</option>
        <option value="IN_PROGRESS" className="bg-surface-800 text-white">In Progress</option>
        <option value="IN_REVIEW" className="bg-surface-800 text-white">In Review</option>
        <option value="DONE" className="bg-surface-800 text-white">Done</option>
      </select>
    </div>
  );
};
