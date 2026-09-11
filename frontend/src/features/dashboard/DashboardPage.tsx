import React from 'react';
import { useAuthStore } from '../../auth/authStore';
import { AdminDashboard } from './AdminDashboard';
import { PMDashboard } from './PMDashboard';
import { DeveloperDashboard } from './DeveloperDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {user?.role === 'ADMIN' && <AdminDashboard />}
      {user?.role === 'PM' && <PMDashboard />}
      {user?.role === 'DEVELOPER' && <DeveloperDashboard />}
    </div>
  );
};
