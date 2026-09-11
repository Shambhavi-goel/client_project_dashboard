export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGE'
  | 'TASK_OVERDUE'
  | 'TASK_IN_REVIEW';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  createdAt: string;
  _count?: {
    projects: number;
  };
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  createdById: string;
  createdAt: string;
  client?: Client;
  createdBy?: User;
  tasks?: Array<{
    id: string;
    status: TaskStatus;
    isOverdue: boolean;
    dueDate?: string | null;
    priority: TaskPriority;
  }>;
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assignedDeveloperId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  assignedDeveloper?: User;
  project?: Project;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  projectId: string;
  userId?: string | null;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  message: string;
  createdAt: string;
  user?: User | null;
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedDeveloperId: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedTaskId?: string | null;
  isRead: boolean;
  createdAt: string;
  relatedTask?: Task | null;
}
