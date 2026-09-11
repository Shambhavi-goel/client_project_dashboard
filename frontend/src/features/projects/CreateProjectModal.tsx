import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Client, User } from '../../types';
import { useAuthStore } from '../../auth/authStore';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [createdById, setCreatedById] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch clients
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await apiClient.get('/clients');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // If Admin, fetch PMs
  const { data: pms } = useQuery<User[]>({
    queryKey: ['pms'],
    queryFn: async () => {
      const res = await apiClient.get('/users?role=PM');
      return res.data.data;
    },
    enabled: isOpen && user?.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { name, clientId };
      if (user?.role === 'ADMIN' && createdById) {
        payload.createdById = createdById;
      }
      const res = await apiClient.post('/projects', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setName('');
      setClientId('');
      setCreatedById('');
      setErrorMsg('');
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create project');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Project name is required');
      return;
    }
    if (!clientId) {
      setErrorMsg('Please select a client');
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
            <FolderPlus className="w-5 h-5 text-brand-400" />
            Create New Project
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
          <div>
            <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NextGen Mobile Portal"
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
              Client *
            </label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="">Select Client</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.contactEmail})
                </option>
              ))}
            </select>
          </div>

          {user?.role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                Assign Project Manager
              </label>
              <select
                value={createdById}
                onChange={(e) => setCreatedById(e.target.value)}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
              >
                <option value="">Assign to Myself (Admin)</option>
                {pms?.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name} ({pm.email})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
