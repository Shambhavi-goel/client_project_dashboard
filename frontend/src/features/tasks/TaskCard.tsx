import React from 'react';
import { Task } from '../../types';
import { TaskStatusSelect } from './TaskStatusSelect';
import { Calendar, AlertCircle, User, Folder } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, showProject = true }) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold';
      default:
        return 'bg-slate-500/10 text-slate-300';
    }
  };

  return (
    <div className="glass-card p-5 hover:bg-white/[0.07] transition-all duration-200 border border-white/10 flex flex-col justify-between gap-4">
      {/* Top row: Priority badge + Status Select */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md border tracking-wider font-semibold uppercase ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        <TaskStatusSelect taskId={task.id} currentStatus={task.status} />
      </div>

      {/* Center: Title & Description */}
      <div>
        <h4 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-surface-200 mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom row: Project, Due Date, Assignee */}
      <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-200">
        <div className="flex items-center gap-3">
          {showProject && task.project && (
            <span className="flex items-center gap-1 text-surface-200 hover:text-white transition-colors truncate max-w-[140px]">
              <Folder className="w-3.5 h-3.5 text-brand-400" />
              {task.project.name}
            </span>
          )}

          {task.assignedDeveloper && (
            <span className="flex items-center gap-1 text-surface-200">
              <User className="w-3.5 h-3.5 text-surface-200" />
              {task.assignedDeveloper.name}
            </span>
          )}
        </div>

        {/* Due Date & Overdue flag */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
              task.isOverdue && task.status !== 'DONE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-surface-200'
            }`}
          >
            {task.isOverdue && task.status !== 'DONE' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
