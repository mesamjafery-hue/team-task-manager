import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckSquare, Shield, Crown, ArrowRight, MoreHorizontal, Trash2, Edit } from 'lucide-react';

const TeamCard = ({ team, onEdit, onDelete }) => {
  const isOwner = team.user_role === 'owner';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
              isOwner
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {isOwner ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <Shield className="w-3.5 h-3.5 text-slate-400" />}
            <span className="capitalize">{team.user_role || 'member'}</span>
          </span>

          {isOwner && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(team);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit Team"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(team.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Team"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Team Title */}
        <Link to={`/teams/${team.id}`} className="block group-hover:text-primary-600 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
            {team.name}
          </h3>
        </Link>

        {/* Team Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-5 leading-relaxed">
          {team.description || 'No description provided for this team.'}
        </p>
      </div>

      <div>
        {/* Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-100 mb-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-900 font-semibold">{team.member_count || 1}</strong> {team.member_count === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-900 font-semibold">{team.task_count || 0}</strong> {team.task_count === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* View Details Link */}
        <Link
          to={`/teams/${team.id}`}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 hover:bg-primary-50 text-slate-700 hover:text-primary-700 text-xs font-semibold border border-slate-200 hover:border-primary-200 transition-all"
        >
          <span>Open Team Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default TeamCard;
