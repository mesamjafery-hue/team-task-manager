import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const closeToast = () => setToast(null);

  // Check authenticated session on initial mount
  const checkAuth = async () => {
    try {
      const response = await authApi.getMe();
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    if (response.data?.success) {
      setUser(response.data.user);
      showToast(`Welcome back, ${response.data.user.name}!`, 'success');
      return response.data.user;
    }
    throw new Error(response.data?.message || 'Login failed.');
  };

  const register = async (userData) => {
    const response = await authApi.register(userData);
    if (response.data?.success) {
      setUser(response.data.user);
      showToast('Account created successfully!', 'success');
      return response.data.user;
    }
    throw new Error(response.data?.message || 'Registration failed.');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API warning:', err.message);
    } finally {
      setUser(null);
      showToast('Logged out successfully.', 'info');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'error'
                ? 'bg-rose-500'
                : toast.type === 'info'
                ? 'bg-blue-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-slate-800 dark:text-slate-100">{toast.message}</span>
          <button
            onClick={closeToast}
            className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
