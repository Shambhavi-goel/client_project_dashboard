import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { NotificationDropdown } from '../features/notifications/NotificationDropdown';
import { useSocket, getSharedSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Users,
  Activity,
  Zap,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const { isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Listen for presence:count event (emitted to global:admin)
  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket || user?.role !== 'ADMIN') return;

    const handlePresence = (data: { onlineCount: number }) => {
      setOnlineCount(data.onlineCount);
    };

    socket.on('presence:count', handlePresence);
    return () => {
      socket.off('presence:count', handlePresence);
    };
  }, [user?.role]);

  const handleLogout = async () => {
    try {
      const fallbackToken =
        sessionStorage.getItem('cpd_fallback_refresh') ||
        localStorage.getItem('cpd_fallback_refresh');
      await apiClient.post('/auth/logout', { refreshToken: fallbackToken || undefined });
    } catch {
      // Proceed even if logout call fails
    }
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'PM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DEVELOPER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight leading-none block">
                TaskPulse
              </span>
              <span className="text-[10px] text-surface-200 uppercase font-semibold tracking-wider">
                Project Hub
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-surface-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Presence + Status + Notifications + User Profile */}
        <div className="flex items-center gap-3">
          {/* Admin Live Presence Indicator */}
          {user?.role === 'ADMIN' && (
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
              title="Active users online right now"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{onlineCount} Online</span>
            </div>
          )}

          {/* Live Socket Sync Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? 'bg-brand-500/10 border-brand-500/20 text-brand-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
            title={isConnected ? 'Live WebSocket connected' : 'Connecting to WebSocket...'}
          >
            <Zap className={`w-3 h-3 ${isConnected ? 'fill-brand-300' : ''}`} />
            <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          </div>

          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-semibold text-white block leading-tight">
                {user?.name}
              </span>
              <span
                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border tracking-wider mt-0.5 ${getRoleBadge(
                  user?.role
                )}`}
              >
                {user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-surface-200 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
