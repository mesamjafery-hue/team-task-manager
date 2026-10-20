import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  Shield,
  Crown,
  Plus,
  Trash2,
  Mail,
  UserPlus,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Search,
  Send
} from 'lucide-react';
import { teamsApi, tasksApi, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import LoadingSpinner from '../components/LoadingSpinner';

const TeamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, showToast } = useAuth();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'tasks' | 'members'
  const [activeTab, setActiveTab] = useState('tasks');

  // Task Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Add Member Modal state
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Simulated Email Invite Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Task Filter state within this team
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  const isOwner = team?.user_role === 'owner';

  const loadTeamData = async () => {
    try {
      const [teamRes, membersRes, tasksRes] = await Promise.all([
        teamsApi.getDetails(id),
        teamsApi.listMembers(id),
        tasksApi.list({ teamId: id }),
      ]);

      if (teamRes.data?.success) {
        setTeam(teamRes.data.team);
      }
      if (membersRes.data?.success) {
        setMembers(membersRes.data.members || []);
      }
      if (tasksRes.data?.success) {
        setTasks(tasksRes.data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
      showToast(err.formattedMessage || 'Access denied or team not found.', 'error');
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [id]);

  // Live user search when typing in add member modal
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await authApi.searchUsers(searchUserQuery, id);
        if (res.data?.success) {
          setSearchResults(res.data.users || []);
        }
      } catch (err) {
        console.error('Search users error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchUserQuery, id]);

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!memberEmail.trim()) {
      setMemberError('Email address is required.');
      return;
    }

    setAddingMember(true);
    try {
      await teamsApi.addMember(id, {
        email: memberEmail.trim(),
        role: memberRole,
      });
      showToast('Member added to team successfully!', 'success');
      setMemberEmail('');
      setSearchUserQuery('');
      setAddMemberModalOpen(false);
      loadTeamData();
    } catch (err) {
      setMemberError(err.formattedMessage || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this team?`)) {
      return;
    }

    try {
      await teamsApi.removeMember(id, userId);
      showToast(`${memberName} removed from team.`, 'info');
      // If user removed themselves, redirect to teams
      if (userId === user.id) {
        navigate('/teams');
      } else {
        loadTeamData();
      }
    } catch (err) {
      showToast(err.formattedMessage || 'Failed to remove member.', 'error');
    }
  };

  const handleSimulateInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await teamsApi.inviteMember(id, { email: inviteEmail.trim() });
      showToast(res.data.message || 'Invitation sent!', 'success');
      setInviteEmail('');
      setInviteModalOpen(false);
    } catch (err) {
      showToast(err.formattedMessage || 'Failed to dispatch invite.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      loadTeamData();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.delete(taskId);
      showToast('Task deleted successfully.', 'info');
      loadTeamData();
    } catch (err) {
      showToast(err.formattedMessage || 'Failed to delete task.', 'error');
    }
  };

  // Filter team tasks locally
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter && t.status !== taskStatusFilter) return false;
    if (taskPriorityFilter && t.priority !== taskPriorityFilter) return false;
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading || !team) {
    return <LoadingSpinner text="Loading team workspace..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Teams</span>
      </Link>

      {/* Team Details Banner Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
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
            <span className="text-xs text-slate-400 font-medium">
              Owned by <strong className="text-slate-700">{team.owner_name}</strong>
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {team.name}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {team.description || 'No description provided for this team.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {isOwner && (
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              title="Bonus: Simulated Email Invitation"
            >
              <Mail className="w-4 h-4" />
              <span>Invite by Email</span>
            </button>
          )}

          <button
            onClick={() => {
              setTaskToEdit(null);
              setTaskModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-primary-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tasks'
              ? 'bg-primary-50 text-primary-700 border border-primary-200/60 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Team Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-primary-50 text-primary-700 border border-primary-200/60 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Members ({members.length})</span>
        </button>
      </div>

      {/* Tab 1: Tasks View */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks in this team..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <select
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={taskPriorityFilter}
              onChange={(e) => setTaskPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No tasks in this team yet</h3>
              <p className="text-xs text-slate-500 mb-4">
                Start assigning work to your members.
              </p>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => (
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
      )}

      {/* Tab 2: Members View */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Member Directory</h3>
              <p className="text-xs text-slate-500">People with access to this team workspace</p>
            </div>
            {isOwner && (
              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const isMemberOwner = member.role === 'owner';
              const isCurrentUser = member.user_id === user.id;

              return (
                <div key={member.user_id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{member.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{member.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        isMemberOwner
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isMemberOwner ? <Crown className="w-3 h-3 text-amber-500" /> : <Shield className="w-3 h-3 text-slate-400" />}
                      <span className="capitalize">{member.role}</span>
                    </span>

                    {/* Remove Member Button (Owner can remove non-owners; member can leave) */}
                    {(isOwner || isCurrentUser) && !isMemberOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={isCurrentUser ? 'Leave Team' : 'Remove Member'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={loadTeamData}
        taskToEdit={taskToEdit}
        initialTeamId={team.id}
        teams={[team]}
      />

      {/* Add Member Modal */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Registered Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Search for a registered coworker or enter their email address.
            </p>

            {memberError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Search Registered Users
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Type name or email..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white"
                  />
                </div>

                {/* Instant suggestions list */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-200/60">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setMemberEmail(u.email);
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-2 hover:bg-primary-50 text-xs transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{u.name}</span>
                        <span className="text-slate-500 text-[11px]">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  User Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  disabled={addingMember}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Team Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  disabled={addingMember}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white"
                >
                  <option value="member">Member (Can manage tasks)</option>
                  <option value="owner">Owner (Full administrative rights)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  disabled={addingMember}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors"
                >
                  {addingMember ? 'Adding...' : 'Add to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonus Simulated Email Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-2">
              <Mail className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-bold text-slate-900">Invite via Email</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              [Bonus Feature]: Sends a simulated invitation link to an unregistered prospective teammate without requiring an external SMTP configuration.
            </p>

            <form onSubmit={handleSimulateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="newhire@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  disabled={inviting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inviting ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetails;
