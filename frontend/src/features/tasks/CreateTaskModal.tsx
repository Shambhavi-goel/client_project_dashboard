import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { User, TaskPriority } from '../../types';
import { X, Plus, Calendar, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDeveloperId, setAssignedDeveloperId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch developers list for assignment dropdown
  const { data: developers } = useQuery<User[]>({
    queryKey: ['developers'],
    queryFn: async () => {
      const res = await apiClient.get('/users?role=DEVELOPER');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/projects/${projectId}/tasks`, {
        title,
        description: description || undefined,
        assignedDeveloperId,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
      // Reset form & close
      setTitle('');
      setDescription('');
      setAssignedDeveloperId('');
      setPriority('MEDIUM');
      setDueDate('');
      setErrorMsg('');
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create task');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task title is required');
      return;
    }
    if (!assignedDeveloperId) {
      setErrorMsg('Please select an assigned developer');
      return;
    }
    setErrorMsg('');
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-lg w-full p-6 border border-white/15 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-400" />
            Create New Task
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Payment Gateway"
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and requirements..."
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Assignee & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Developer Select */}
            <div>
              <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                Assignee *
              </label>
              <select
                required
                value={assignedDeveloperId}
                onChange={(e) => setAssignedDeveloperId(e.target.value)}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
              >
                <option value="">Select Developer</option>
                {developers?.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-200 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
