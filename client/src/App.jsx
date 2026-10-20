import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import { teamsApi } from './services/api';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamDetails from './pages/TeamDetails';
import Tasks from './pages/Tasks';
import NotFound from './pages/NotFound';

// Layout wrapper for authenticated dashboard routes
const AuthenticatedLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalTaskModalOpen, setGlobalTaskModalOpen] = useState(false);
  const [teams, setTeams] = useState([]);

  // Fetch teams for quick task modal
  const handleOpenQuickTask = async () => {
    try {
      const res = await teamsApi.list();
      if (res.data?.success) {
        setTeams(res.data.teams || []);
      }
    } catch (err) {
      console.error(err);
    }
    setGlobalTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenCreateTask={handleOpenQuickTask}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Task Creation Modal */}
      <TaskModal
        isOpen={globalTaskModalOpen}
        onClose={() => setGlobalTaskModalOpen(false)}
        onSuccess={() => {
          // Trigger reload by dispatching custom event or standard navigation
          window.dispatchEvent(new Event('taskCreated'));
        }}
        teams={teams}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected App Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetails />} />
            <Route path="/tasks" element={<Tasks />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
