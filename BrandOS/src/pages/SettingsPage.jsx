import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function SettingsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [departments, setDepartments] = useState([]);
  const [showNewDept, setShowNewDept] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [toneProfile, setToneProfile] = useState('');
  const [requiredMessaging, setRequiredMessaging] = useState('');

  const loadDepts = () => {
    api.get('/departments').then((res) => {
      setDepartments(res.data.departments || []);
    });
  };

  useEffect(() => {
    loadDepts();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments', {
        name,
        description,
        toneProfile,
        requiredMessaging,
      });
      notify(`Created department ${name}.`, 'success');
      setShowNewDept(false);
      setName('');
      setDescription('');
      setToneProfile('');
      setRequiredMessaging('');
      loadDepts();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create department.', 'error');
    }
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Governance Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Account profile, department tone standards, and core verification rules.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowNewDept(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Account Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Your Employee Session
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Name</div>
            <div className="font-medium text-slate-900 mt-0.5">{user?.name}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Email</div>
            <div className="font-mono text-xs text-slate-900 mt-1">{user?.email}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Role & Scope</div>
            <div className="font-medium text-indigo-700 mt-0.5">
              {user?.role} · {user?.departmentName || 'Cross-Department'}
            </div>
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Department Governance Profiles
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {departments.map((d) => (
            <div key={d.id} className="p-6 space-y-1.5">
              <div className="font-semibold text-slate-900">{d.name}</div>
              <div className="text-xs text-slate-600">{d.description}</div>
              <div className="text-xs text-slate-800 pt-1">
                <span className="font-semibold">Tone Profile:</span> {d.toneProfile}
              </div>
              {d.requiredMessaging && (
                <div className="text-xs text-slate-700">
                  <span className="font-semibold">Required Standard:</span>{' '}
                  {d.requiredMessaging}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showNewDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleCreateDept}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Create Department
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Legal & Compliance"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tone Profile
              </label>
              <input
                type="text"
                required
                value={toneProfile}
                onChange={(e) => setToneProfile(e.target.value)}
                placeholder="Precise, objective, unambiguous"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Messaging
              </label>
              <input
                type="text"
                value={requiredMessaging}
                onChange={(e) => setRequiredMessaging(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDept(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Create Department
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
