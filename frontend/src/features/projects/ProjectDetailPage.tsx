import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Project, Task } from '../../types';
import { useAuthStore } from '../../auth/authStore';
import { TaskCard } from '../tasks/TaskCard';
import { TaskFilters } from '../tasks/TaskFilters';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { ActivityFeed } from '../activity/ActivityFeed';
import { useSocket } from '../../hooks/useSocket';
import {
  ArrowLeft,
  Building,
  User,
  Plus,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Join project room for real-time live updates while viewing this project
  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('project:join', projectId);

    return () => {
      socket.emit('project:leave', projectId);
    };
  }, [socket, projectId]);

  // Fetch Project Details (scoped, returns 404 if unauthorized)
  const { data: project, isLoading: isProjectLoading, error: projectError } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Fetch Project Tasks with URL query filters
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['projectTasks', projectId, searchParams.toString()],
    queryFn: async () => {
      const queryString = searchParams.toString();
      const url = `/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  if (isProjectLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-surface-200">
        Loading project details...
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="max-w-md mx-auto my-16 glass-card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="text-sm text-surface-200 mt-2">
          This project does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const canAddTask = user?.role === 'ADMIN' || (user?.role === 'PM' && project.createdById === user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back button */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-xs font-medium text-surface-200 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* Project Header Card */}
      <div className="glass-card p-6 mb-8 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {project.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-surface-200">
            {project.client && (
              <span className="flex items-center gap-1.5 text-surface-100">
                <Building className="w-4 h-4 text-brand-400" />
                {project.client.name}
              </span>
            )}
            {project.createdBy && (
              <span className="flex items-center gap-1.5 text-surface-100">
                <User className="w-4 h-4 text-amber-400" />
                PM: {project.createdBy.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-surface-100">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              {tasks?.length || 0} visible tasks
            </span>
          </div>
        </div>

        {canAddTask && (
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Main Content Layout: Tasks + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Task Filters + Tasks Grid */}
        <div className="lg:col-span-2">
          {/* Shareable URL Filters */}
          <TaskFilters />

          {/* Tasks List */}
          {isTasksLoading ? (
            <div className="p-12 text-center text-surface-200 text-sm glass-card">
              Loading project tasks...
            </div>
          ) : tasks?.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckSquare className="w-10 h-10 text-surface-200/50 mx-auto mb-2" />
              <p className="text-sm text-surface-200">No tasks match the active filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks?.map((task) => (
                <TaskCard key={task.id} task={task} showProject={false} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Project-Scoped Live Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed
            projectId={projectId}
            title={`${project.name} Activity`}
            limit={15}
          />
        </div>
      </div>

      {/* Create Task Modal */}
      {projectId && (
        <CreateTaskModal
          projectId={projectId}
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
        />
      )}
    </div>
  );
};
