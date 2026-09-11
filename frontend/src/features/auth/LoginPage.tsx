import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/authStore';
import { apiClient } from '../../api/client';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Code } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (loginEmail?: string, loginPass?: string) => {
    const targetEmail = loginEmail || email;
    const targetPass = loginPass || password;

    if (!targetEmail || !targetPass) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient.post('/auth/login', {
        email: targetEmail,
        password: targetPass,
      });

      if (res.data?.success && res.data?.data) {
        const { user, accessToken } = res.data.data;
        setAuth(user, accessToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const seedUsers = [
    { label: 'Admin', name: 'Anika Sharma', email: 'admin@cpd.dev', role: 'ADMIN', icon: ShieldCheck, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { label: 'PM 1', name: 'Ravi Mehta', email: 'ravi.pm@cpd.dev', role: 'PM', icon: UserCheck, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { label: 'PM 2', name: 'Priya Nair', email: 'priya.pm@cpd.dev', role: 'PM', icon: UserCheck, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { label: 'Dev 1', name: 'Kiran Patel', email: 'kiran@cpd.dev', role: 'DEV', icon: Code, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { label: 'Dev 2', name: 'Sara Malik', email: 'sara@cpd.dev', role: 'DEV', icon: Code, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { label: 'Dev 3', name: 'Arjun Das', email: 'arjun@cpd.dev', role: 'DEV', icon: Code, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { label: 'Dev 4', name: 'Meera Iyer', email: 'meera@cpd.dev', role: 'DEV', icon: Code, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  ];

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Password123!');
    handleLogin(userEmail, 'Password123!');
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center shadow-xl shadow-brand-500/30 mb-4 animate-slide-down">
          <Activity className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Client Project Dashboard
        </h2>
        <p className="mt-2 text-sm text-surface-200">
          Real-time role-scoped operations, activity feed &amp; live sync
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="glass-card p-8 border border-white/10 shadow-2xl animate-fade-in">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-200">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cpd.dev"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-200">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Role Switcher */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-surface-200 text-center mb-3">
              One-Click Role Switcher (Pre-Seeded Accounts)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {seedUsers.map((u) => {
                const Icon = u.icon;
                return (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => quickLogin(u.email)}
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-2 ${u.color}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold block leading-tight truncate">
                        {u.label}
                      </span>
                      <span className="text-[10px] opacity-75 truncate block">
                        {u.name.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
