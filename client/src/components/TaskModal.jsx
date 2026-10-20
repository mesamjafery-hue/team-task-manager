import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { teamsApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TaskModal = ({
  isOpen,
  onClose,
  onSuccess,
  taskToEdit = null,
  initialTeamId = null,
  teams = [],
}) => {
  const { showToast } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('To Do');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(taskToEdit);

  // Populate form on open or taskToEdit change
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || '');
        setTeamId(String(taskToEdit.team_id || ''));
        setAssignedTo(taskToEdit.assigned_to ? String(taskToEdit.assigned_to) : '');
        setStatus(taskToEdit.status || 'To Do');
        setPriority(taskToEdit.priority || 'Medium');
        setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
      } else {
        setTitle('');
        setDescription('');
        setTeamId(initialTeamId ? String(initialTeamId) : (teams[0] ? String(teams[0].id) : ''));
        setAssignedTo('');
        setStatus('To Do');
        setPriority('Medium');
        setDueDate('');
      }
    }
  }, [isOpen, taskToEdit, initialTeamId, teams]);

  // Fetch team members when teamId changes
  useEffect(() => {
    if (!teamId) {
      setTeamMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const res = await teamsApi.listMembers(teamId);
        if (res.data?.success) {
          setTeamMembers(res.data.members || []);
        }
      } catch (err) {
        console.error('Failed to load team members for modal:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [teamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!teamId) {
      setError('Please select a team for this task.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      teamId: parseInt(teamId, 10),
      assignedTo: assignedTo ? parseInt(assignedTo, 10) : null,
      status,
      priority,
      dueDate: dueDate || null,
    };

    try {
      if (isEditMode) {
        await tasksApi.update(taskToEdit.id, payload);
        showToast('Task updated successfully!', 'success');
      } else {
        await tasksApi.create(payload);
        showToast('Task created successfully!', 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.formattedMessage || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Conduct usability testing on onboarding flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide context, acceptance criteria, or relevant links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Team Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Team <span className="text-rose-500">*</span>
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={isSubmitting || Boolean(initialTeamId && !isEditMode)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                required
              >
                <option value="">Select a Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isSubmitting || loadingMembers || !teamId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 rounded-xl shadow-xs shadow-primary-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Task' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
