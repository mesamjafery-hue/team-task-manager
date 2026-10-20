import React, { useState } from 'react';
import {
  Calendar,
  User,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  Building
} from 'lucide-react';

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status configuration
  const statusConfig = {
    'To Do': {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Circle,
      color: 'text-slate-400',
    },
    'In Progress': {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: PlayCircle,
      color: 'text-indigo-600',
    },
    'Completed': {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
  };

  // Priority configuration
  const priorityConfig = {
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  const status = statusConfig[task.status] || statusConfig['To Do'];
  const StatusIcon = status.icon;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header: Team Badge & Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium max-w-[70%] truncate">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{task.team_name || `Team #${task.team_id}`}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Task Title */}
        <h3 className={`text-base font-semibold text-slate-800 leading-snug mb-1.5 ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
          {task.title}
        </h3>

        {/* Task Description Preview */}
        {task.description ? (
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {task.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-4">No description provided.</p>
        )}
      </div>

      <div>
        {/* Badges: Status & Priority */}
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          {/* Status Dropdown/Badge */}
          <div className="relative">
            <select
              value={task.status}
              onChange={(e) => onStatusChange && onStatusChange(task.id, e.target.value)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border appearance-none pr-6 cursor-pointer focus:outline-hidden ${status.bg}`}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs">▾</span>
          </div>

          {/* Priority Badge */}
          <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityConfig[task.priority] || priorityConfig.Medium}`}>
            {task.priority}
          </span>
        </div>

        {/* Footer: Assignee & Due Date */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          {/* Assignee */}
          <div className="flex items-center gap-2 max-w-[50%] truncate">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-[10px] flex items-center justify-center shrink-0">
              {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-slate-600 truncate font-medium">
              {task.assignee_name || 'Unassigned'}
            </span>
          </div>

          {/* Due Date with Overdue Indicator */}
          {task.due_date ? (
            <div
              className={`flex items-center gap-1 font-medium ${
                task.is_overdue
                  ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200'
                  : 'text-slate-500'
              }`}
            >
              {task.is_overdue ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              )}
              <span>{task.due_date}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">No due date</span>
          )}
        </div>
      </div>

      {/* Confirmation Dialog Modal for Delete */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h4 className="text-base font-bold text-slate-900 mb-2">Delete this task?</h4>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{task.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
