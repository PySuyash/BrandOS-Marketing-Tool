import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function TeamPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Creator');
  const [newDeptId, setNewDeptId] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
      ]);
      setMembers(uRes.data.users || []);
      setDepartments(dRes.data.departments || []);
      if (dRes.data.departments?.[0] && !newDeptId) {
        setNewDeptId(String(dRes.data.departments[0].id));
      }
    } finally {
      setLoading(false);
    }
  }, [newDeptId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        name: newName,
        email: newEmail,
        role: newRole,
        departmentId: newDeptId ? Number(newDeptId) : null,
        title: newTitle || 'Team Member',
      });
      notify(`Created employee account for ${newEmail}.`, 'success');
      setShowAdd(false);
      setNewName('');
      setNewEmail('');
      setNewTitle('');
      await loadTeam();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create employee.', 'error');
    }
  };

  const handleUpdateUser = async (memberId, updates) => {
    try {
      await api.put(`/users/${memberId}`, updates);
      notify('Employee assignment updated.', 'success');
      await loadTeam();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to update employee.', 'error');
    }
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Team & Role Access
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage employee department assignments and role-based governance permissions.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading team roster...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-6 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {m.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {m.email}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{m.title}</td>
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <select
                          value={m.departmentId || ''}
                          onChange={(e) =>
                            handleUpdateUser(m.id, {
                              departmentId: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs"
                        >
                          <option value="">All / Cross-Dept</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-700">
                          {m.departmentName || 'Cross-Department'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {isAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            handleUpdateUser(m.id, { role: e.target.value })
                          }
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700"
                        >
                          <option value="Creator">Creator</option>
                          <option value="Manager">Manager</option>
                          <option value="Reviewer">Reviewer</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-indigo-700">
                          {m.role}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Add Employee Account
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="Creator">Creator</option>
                  <option value="Manager">Manager</option>
                  <option value="Reviewer">Reviewer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Cross-Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Content Strategist"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
