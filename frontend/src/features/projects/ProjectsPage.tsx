import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Project } from '../../types';
import { useAuthStore } from '../../auth/authStore';
import { CreateProjectModal } from './CreateProjectModal';
import { FolderKanban, Plus, CheckSquare, Calendar, Building, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data;
    },
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PM';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Projects
          </h1>
          <p className="text-surface-200 text-sm mt-1">
            {user?.role === 'DEVELOPER'
              ? 'Projects where you have active task assignments'
              : user?.role === 'PM'
              ? 'Projects created and managed by you'
              : 'Global workspace portfolio across all clients'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-surface-200 text-sm glass-card">
          Loading projects...
        </div>
      ) : projects?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-surface-200/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No projects found</h3>
          <p className="text-sm text-surface-200 mt-1 max-w-sm mx-auto">
            {user?.role === 'DEVELOPER'
              ? 'You do not have any tasks assigned to you in any project yet.'
              : 'Create your first project to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="glass-card p-6 hover:bg-white/[0.08] hover:border-brand-500/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="p-2 rounded-xl bg-brand-500/10 text-brand-300 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <FolderKanban className="w-5 h-5" />
                  </span>
                  <span className="flex items-center gap-1 text-xs text-brand-300 font-medium group-hover:translate-x-1 transition-transform">
                    View Tasks <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                  {project.name}
                </h3>

                {project.client && (
                  <p className="text-xs text-surface-200 flex items-center gap-1.5 mt-2">
                    <Building className="w-3.5 h-3.5 text-surface-200" />
                    {project.client.name}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-surface-200">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                  {project._count?.tasks || 0} tasks
                </span>

                <span className="flex items-center gap-1.5 text-surface-200/80">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(project.createdAt), 'MMM yyyy')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
