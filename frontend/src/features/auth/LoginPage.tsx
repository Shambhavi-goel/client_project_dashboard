import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/authStore';
import { apiClient } from '../../api/client';
import {
  Activity,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Code,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DEVELOPER' | 'PM' | 'ADMIN'>('DEVELOPER');
  const [showPassword, setShowPassword] = useState(false);
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
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.error?.message;
      if (serverMessage) {
        setErrorMsg(serverMessage);
      } else if (!err.response) {
        setErrorMsg('Cannot reach backend server. Check your connection or Railway backend URL.');
      } else {
        setErrorMsg(`Server returned error (${err.response.status}). Please check backend logs.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient.post('/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      if (res.data?.success && res.data?.data) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.error?.message;
      if (serverMessage) {
        setErrorMsg(serverMessage);
      } else if (!err.response) {
        setErrorMsg('Cannot reach backend server. Check your connection or Railway backend URL.');
      } else {
        setErrorMsg(`Signup failed (${err.response?.status || 'network error'}). Please check details.`);
      }
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
    setIsSignUp(false);
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
          {/* Sign In vs Create Account Tab Switcher */}
          <div className="flex bg-surface-800/90 p-1 rounded-xl mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                !isSignUp
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-surface-200 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                isSignUp
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-surface-200 hover:text-white'
              }`}
            >
              Create an Account
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isSignUp) {
                handleSignup();
              } else {
                handleLogin();
              }
            }}
            className="space-y-4"
          >
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-200">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            )}

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

            {/* Password Field with Eye Veil / Unveil */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider">
                  Password
                </label>
                {isSignUp && (
                  <span className="text-[11px] text-surface-200">Min. 8 chars</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-200">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Choose secure password (8+ chars)' : '••••••••••••'}
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-200 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-surface-200 uppercase tracking-wider mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'DEVELOPER', label: 'Developer', icon: Code },
                      { value: 'PM', label: 'Project Mgr', icon: UserCheck },
                      { value: 'ADMIN', label: 'Admin', icon: ShieldCheck },
                    ] as const
                  ).map((r) => {
                    const Icon = r.icon;
                    const selected = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs font-bold ${
                          selected
                            ? 'bg-brand-600/25 border-brand-500 text-brand-300 shadow-sm'
                            : 'bg-surface-800 border-white/10 text-surface-200 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isSignUp ? (
                <>
                  Create Account <UserPlus className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In & Sign Up */}
          <div className="mt-4 text-center">
            {isSignUp ? (
              <p className="text-xs text-surface-200">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg('');
                  }}
                  className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p className="text-xs text-surface-200">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg('');
                  }}
                  className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>

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
                    className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer ${u.color}`}
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
