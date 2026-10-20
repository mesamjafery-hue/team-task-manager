import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  FolderPlus,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tasksApi, teamsApi } from '../services/api';
import TaskCard from '../components/TaskCard';
import TeamCard from '../components/TeamCard';
import SearchFilter from '../components/SearchFilter';
import TaskModal from '../components/TaskModal';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isOverdueFilter, setIsOverdueFilter] = useState(false);

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // New Team Modal quick state
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Fetch dashboard stats and teams
  const loadDashboardData = async () => {
    try {
      const [statsRes, teamsRes] = await Promise.all([
        tasksApi.getStats(),
        teamsApi.list(),
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.stats);
      }
      if (teamsRes.data?.success) {
        setTeams(teamsRes.data.teams || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    }
  };

  // Fetch filtered tasks
  const loadTasks = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (teamFilter) params.teamId = teamFilter;
      if (assigneeFilter) params.assigneeId = assigneeFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (isOverdueFilter) params.isOverdue = true;

      const res = await tasksApi.list(params);
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [search, teamFilter, assigneeFilter, statusFilter, priorityFilter, isOverdueFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setTeamFilter('');
    setAssigneeFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setIsOverdueFilter(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      loadTasks();
      loadDashboardData();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.delete(taskId);
      loadTasks();
      loadDashboardData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setTeamError('');
    if (!newTeamName.trim()) {
      setTeamError('Team name is required.');
      return;
    }

    setCreatingTeam(true);
    try {
      await teamsApi.create({
        name: newTeamName.trim(),
        description: newTeamDescription.trim(),
      });
      setNewTeamName('');
      setNewTeamDescription('');
      setCreateTeamModalOpen(false);
      loadDashboardData();
      loadTasks();
    } catch (err) {
      setTeamError(err.formattedMessage || 'Failed to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  if (loading && !stats) {
    return <LoadingSpinner text="Loading dashboard metrics..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hi, {user?.name || 'Developer'}!
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Here is what's happening across your teams and tasks today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCreateTeamModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs md:text-sm font-semibold rounded-xl transition-all"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
            <span>New Team</span>
          </button>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setTaskModalOpen(true);
            }}
            disabled={teams.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs md:text-sm font-semibold rounded-xl shadow-md shadow-primary-500/20 transition-all disabled:opacity-50"
            title={teams.length === 0 ? 'Create a team first to add tasks' : 'Create a new task'}
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning Notification Banner */}
      {stats && stats.overdueTasks > 0 && !isOverdueFilter && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3 text-xs md:text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              You have <strong className="font-bold">{stats.overdueTasks}</strong> overdue{' '}
              {stats.overdueTasks === 1 ? 'task' : 'tasks'} requiring attention.
            </span>
          </div>
          <button
            onClick={() => setIsOverdueFilter(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Due Soon Reminder Banner (Bonus: Task Due Date Reminders on login) */}
      {stats && stats.dueSoonTasks > 0 && stats.overdueTasks === 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3 text-xs md:text-sm font-medium">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              ⏰ <strong className="font-bold">{stats.dueSoonTasks}</strong>{' '}
              {stats.dueSoonTasks === 1 ? 'task is' : 'tasks are'} due within the next 2 days — stay on track!
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('In Progress')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
          >
            View Active
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Teams */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teams</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.totalTeams ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Active memberships</span>
        </div>

        {/* Total Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.totalTasks ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Across all teams</span>
        </div>

        {/* My Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned To Me</span>
            <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.myTasks ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Your work items</span>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.inProgressTasks ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Currently underway</span>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.completedTasks ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Done items</span>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-extrabold ${stats?.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats?.overdueTasks ?? 0}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Past due date</span>
        </div>
      </div>

      {/* Your Teams Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Teams</h2>
            <p className="text-xs text-slate-500">Collaborative workspaces you belong to</p>
          </div>
          <Link
            to="/teams"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Teams Created Yet</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Teams are where you organize tasks and invite coworkers. Create your very first team to get started!
            </p>
            <button
              onClick={() => setCreateTeamModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create First Team</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.slice(0, 3).map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>

      {/* Tasks Section with Filter & Search Controls */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Task Overview</h2>
            <p className="text-xs text-slate-500">Search and filter tasks across your workspace</p>
          </div>
          <Link
            to="/tasks"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            <span>Task Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Integrated Search and Filter Bar */}
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          teamId={teamFilter}
          onTeamChange={setTeamFilter}
          assigneeId={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          priority={priorityFilter}
          onPriorityChange={setPriorityFilter}
          isOverdue={isOverdueFilter}
          onOverdueToggle={setIsOverdueFilter}
          onReset={handleResetFilters}
          teams={teams}
          showTeamFilter={true}
        />

        {/* Tasks Grid */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || teamFilter || assigneeFilter || statusFilter || priorityFilter || isOverdueFilter
                ? 'No tasks match your current filter parameters. Try clearing or broadening your search.'
                : 'No tasks have been created in your teams yet.'}
            </p>
            {teams.length > 0 && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create a Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => {
                  setTaskToEdit(t);
                  setTaskModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={() => {
          loadTasks();
          loadDashboardData();
        }}
        taskToEdit={taskToEdit}
        teams={teams}
      />

      {/* Create Team Quick Modal */}
      {createTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Team</h3>
            <p className="text-xs text-slate-500 mb-4">
              Set up a shared workspace for your group or project.
            </p>

            {teamError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {teamError}
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Systems"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  disabled={creatingTeam}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this team responsible for?"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  disabled={creatingTeam}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateTeamModalOpen(false)}
                  disabled={creatingTeam}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors"
                >
                  {creatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
