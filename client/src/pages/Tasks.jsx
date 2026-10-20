import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ListTodo, LayoutGrid, Table as TableIcon, Inbox } from 'lucide-react';
import { tasksApi, teamsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import SearchFilter from '../components/SearchFilter';
import TaskModal from '../components/TaskModal';
import LoadingSpinner from '../components/LoadingSpinner';

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, showToast } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Layout mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Filter states (initialized from URL search parameters)
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [teamFilter, setTeamFilter] = useState(searchParams.get('teamId') || '');
  const [assigneeFilter, setAssigneeFilter] = useState(
    searchParams.get('myTasks') === 'true' && user ? String(user.id) : (searchParams.get('assigneeId') || '')
  );
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [isOverdueFilter, setIsOverdueFilter] = useState(searchParams.get('isOverdue') === 'true');

  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Sync if myTasks param changes
  useEffect(() => {
    if (searchParams.get('myTasks') === 'true' && user) {
      setAssigneeFilter(String(user.id));
    }
  }, [searchParams, user]);

  const loadTeams = async () => {
    try {
      const res = await teamsApi.list();
      if (res.data?.success) {
        setTeams(res.data.teams || []);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

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
    loadTeams();
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
    setSearchParams({});
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      loadTasks();
    } catch (err) {
      showToast(err.formattedMessage || 'Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.delete(taskId);
      showToast('Task deleted successfully.', 'info');
      loadTasks();
    } catch (err) {
      showToast(err.formattedMessage || 'Failed to delete task.', 'error');
    }
  };

  const isMyTasksActive = assigneeFilter === String(user?.id);

  if (loading) {
    return <LoadingSpinner text="Loading tasks..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isMyTasksActive ? 'My Assigned Tasks' : 'All Tasks'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {isMyTasksActive
              ? 'Tasks currently assigned to you across all authorized teams.'
              : 'Complete listing of team tasks with multi-dimensional filtering.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-primary-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-primary-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setTaskModalOpen(true);
            }}
            disabled={teams.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs md:text-sm font-semibold rounded-xl shadow-md shadow-primary-500/20 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
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

      {/* Task Content */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No tasks match your filter</h3>
          <p className="text-xs text-slate-500 mb-5">
            Try adjusting your search criteria or reset your filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
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
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Title</th>
                  <th className="py-3.5 px-4 font-semibold">Team</th>
                  <th className="py-3.5 px-4 font-semibold">Assignee</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Priority</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{task.team_name}</td>
                    <td className="py-3 px-4">{task.assignee_name || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold">{task.priority}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={task.is_overdue ? 'text-rose-600 font-semibold' : ''}>
                        {task.due_date || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setTaskToEdit(task);
                          setTaskModalOpen(true);
                        }}
                        className="text-slate-500 hover:text-primary-600 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-rose-500 hover:text-rose-700 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={loadTasks}
        taskToEdit={taskToEdit}
        teams={teams}
      />
    </div>
  );
};

export default Tasks;
