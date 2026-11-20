import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authApi, tasksApi } from '../services/api';

// Bonus: due-date reminder shown once, right after login
const fetchReminderCount = async () => {
  try {
    const res = await tasksApi.getReminders();
    return res.data?.count || 0;
  } catch {
    return 0;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, type = 'success') => {
    // Restart the timer so an older toast's timeout can't dismiss a newer one early
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
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
      const loggedInUser = response.data.user;
      setUser(loggedInUser);

      const reminderCount = await fetchReminderCount();
      if (reminderCount > 0) {
        showToast(
          `Welcome back, ${loggedInUser.name}! You have ${reminderCount} ${
            reminderCount === 1 ? 'task' : 'tasks'
          } overdue or due soon.`,
          'info'
        );
      } else {
        showToast(`Welcome back, ${loggedInUser.name}!`, 'success');
      }
      return loggedInUser;
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
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in transition-all bg-white border-slate-200 max-w-[calc(100vw-2.5rem)]">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'error'
                ? 'bg-rose-500'
                : toast.type === 'info'
                ? 'bg-blue-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-slate-800">{toast.message}</span>
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
