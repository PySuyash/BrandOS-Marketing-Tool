import React, { useCallback, useEffect, useState } from 'react';
import { FileUp, Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SeverityLabel } from '../components/StatusText.jsx';

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(
    user?.departmentId || 1
  );
  const [guidelines, setGuidelines] = useState([]);
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState('guidelines');
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Guideline modal
  const [guidelineModal, setGuidelineModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fact modal
  const [factModal, setFactModal] = useState(null);

  const canManage =
    user?.role === 'Admin' ||
    user?.role === 'Manager' ||
    user?.role === 'Reviewer';

  useEffect(() => {
    api.get('/departments').then((res) => {
      const list = res.data.departments || [];
      setDepartments(list);
      if (user?.departmentId) {
        setSelectedDeptId(user.departmentId);
      } else if (list[0]) {
        setSelectedDeptId(list[0].id);
      }
    });
  }, [user]);

  const loadDepartmentKnowledge = useCallback(async () => {
    if (!selectedDeptId) return;
    setLoading(true);
    try {
      const [gRes, kRes] = await Promise.all([
        api.get(`/guidelines/${selectedDeptId}`),
        api.get(`/knowledge/${selectedDeptId}`),
      ]);
      setGuidelines(gRes.data.guidelines || []);
      setFacts(kRes.data.knowledgeItems || []);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        'Failed to load department knowledge base.';
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId, notify]);

  useEffect(() => {
    void loadDepartmentKnowledge();
  }, [loadDepartmentKnowledge]);

  const handleSaveGuideline = async (e) => {
    e.preventDefault();
    if (!guidelineModal) return;
    try {
      if (guidelineModal.id) {
        await api.put(`/guidelines/${guidelineModal.id}`, guidelineModal);
        notify('Guideline updated.', 'success');
      } else {
        await api.post('/guidelines', {
          ...guidelineModal,
          departmentId: selectedDeptId,
        });
        notify('Guideline created.', 'success');
      }
      setGuidelineModal(null);
      await loadDepartmentKnowledge();
    } catch (err) {
      notify(
        err?.response?.data?.error || 'Failed to save guideline.',
        'error'
      );
    }
  };

  const handleSaveFact = async (e) => {
    e.preventDefault();
    if (!factModal) return;
    try {
      if (factModal.id) {
        await api.put(`/knowledge/${factModal.id}`, factModal);
        notify('Approved fact updated.', 'success');
      } else {
        await api.post('/knowledge', {
          ...factModal,
          departmentId: selectedDeptId,
        });
        notify('Approved fact added.', 'success');
      }
      setFactModal(null);
      await loadDepartmentKnowledge();
    } catch (err) {
      notify(
        err?.response?.data?.error || 'Failed to save approved fact.',
        'error'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'guideline') {
        await api.delete(`/guidelines/${deleteConfirm.id}`);
      } else {
        await api.delete(`/knowledge/${deleteConfirm.id}`);
      }
      notify('Record deleted.', 'success');
      setDeleteConfirm(null);
      await loadDepartmentKnowledge();
    } catch (err) {
      notify(err?.response?.data?.error || 'Delete failed.', 'error');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('departmentId', String(selectedDeptId));
      formData.append('owner', user?.name || 'Department Lead');
      const res = await api.post('/knowledge/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      notify(`Imported ${res.data.importedCount} knowledge items.`, 'success');
      setSection('facts');
      await loadDepartmentKnowledge();
    } catch (err) {
      notify(err?.response?.data?.error || 'Import failed.', 'error');
    }
  };

  const currentDept = departments.find((d) => d.id === selectedDeptId);
  const canSwitchDept = user?.role === 'Admin' || user?.role === 'Reviewer';

  const filteredGuidelines = guidelines.filter((g) => {
    const matchesType =
      ruleTypeFilter === 'all' || g.ruleType === ruleTypeFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      g.ruleCode.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      (g.bannedTerm || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const filteredFacts = facts.filter((f) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      f.factCode.toLowerCase().includes(q) ||
      f.title.toLowerCase().includes(q) ||
      f.content.toLowerCase().includes(q) ||
      f.owner.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Department Knowledge Base
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Independent rules, tone profiles, and source-owned facts. Reviews never mix rules across departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedDeptId}
            disabled={!canSwitchDept}
            onChange={(e) => setSelectedDeptId(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 disabled:bg-slate-100"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {canManage && (
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <FileUp className="h-3.5 w-3.5 text-indigo-600" />
              <span>Import TXT/DOCX</span>
              <input
                type="file"
                accept=".txt,.docx"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Department Tone Summary */}
      {currentDept && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Department Tone Profile
            </div>
            <div className="mt-1 text-slate-900 font-medium">
              {currentDept.toneProfile}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Required Messaging Standard
            </div>
            <div className="mt-1 text-slate-700">
              {currentDept.requiredMessaging || currentDept.description}
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSection('guidelines')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                section === 'guidelines'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Guidelines ({guidelines.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('facts')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                section === 'facts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved Facts ({facts.length})
            </button>
          </div>

          {section === 'guidelines' && (
            <select
              value={ruleTypeFilter}
              onChange={(e) => setRuleTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="all">All rule types</option>
              <option value="banned_word">Banned words</option>
              <option value="preferred_word">Preferred words</option>
              <option value="tone">Tone</option>
              <option value="readability">Readability</option>
              <option value="required_messaging">Required messaging</option>
              <option value="accessibility">Accessibility</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules or facts..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {canManage && section === 'guidelines' && (
            <button
              type="button"
              onClick={() =>
                setGuidelineModal({
                  ruleType: 'banned_word',
                  severity: 'Major',
                  status: 'Active',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Guideline</span>
            </button>
          )}

          {canManage && section === 'facts' && (
            <button
              type="button"
              onClick={() =>
                setFactModal({
                  factType: 'policy',
                  status: 'Approved',
                  expiryDate: '2027-12-31',
                  owner: user?.name || '',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Approved Fact</span>
            </button>
          )}
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading knowledge base...</div>
        ) : section === 'guidelines' ? (
          filteredGuidelines.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No guidelines match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Rule ID</th>
                    <th className="px-4 py-3">Rule & Description</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Term Mapping</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    {canManage && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuidelines.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-700 whitespace-nowrap">
                        {g.ruleCode}
                      </td>
                      <td className="px-4 py-3.5 max-w-md">
                        <div className="font-medium text-slate-900">{g.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {g.description}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 capitalize whitespace-nowrap">
                        {g.ruleType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        {g.bannedTerm && (
                          <span>
                            “{g.bannedTerm}” → “{g.preferredTerm || 'remove'}”
                          </span>
                        )}
                        {!g.bannedTerm && g.requiredPhrase && (
                          <span>Required: {g.requiredPhrase}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <SeverityLabel severity={g.severity} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">{g.status}</td>
                      {canManage && (
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setGuidelineModal(g)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700"
                            aria-label="Edit guideline"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'guideline',
                                id: g.id,
                                label: g.ruleCode,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-red-700 ml-1"
                            aria-label="Delete guideline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredFacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No approved facts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Fact ID</th>
                  <th className="px-4 py-3">Approved Statement</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Fact Owner</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacts.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-700 whitespace-nowrap">
                      {f.factCode}
                    </td>
                    <td className="px-4 py-3.5 max-w-md">
                      <div className="font-medium text-slate-900">{f.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {f.content}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 capitalize whitespace-nowrap">
                      {f.factType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{f.owner}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {f.expiryDate}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-emerald-700 font-medium">
                      {f.status}
                    </td>
                    {canManage && (
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setFactModal(f)}
                          className="p-1.5 text-slate-500 hover:text-indigo-700"
                          aria-label="Edit fact"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'fact',
                              id: f.id,
                              label: f.factCode,
                            })
                          }
                          className="p-1.5 text-slate-500 hover:text-red-700 ml-1"
                          aria-label="Delete fact"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add/Edit Guideline */}
      {guidelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleSaveGuideline}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {guidelineModal.id ? 'Edit Guideline' : 'Add Department Guideline'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rule Type
                </label>
                <select
                  value={guidelineModal.ruleType || 'banned_word'}
                  onChange={(e) =>
                    setGuidelineModal({ ...guidelineModal, ruleType: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="banned_word">Banned Word</option>
                  <option value="preferred_word">Preferred Word</option>
                  <option value="tone">Tone</option>
                  <option value="readability">Readability</option>
                  <option value="required_messaging">Required Messaging</option>
                  <option value="accessibility">Accessibility</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Severity
                </label>
                <select
                  value={guidelineModal.severity || 'Major'}
                  onChange={(e) =>
                    setGuidelineModal({
                      ...guidelineModal,
                      severity: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="Blocker">Blocker</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rule Title
              </label>
              <input
                type="text"
                required
                value={guidelineModal.title || ''}
                onChange={(e) =>
                  setGuidelineModal({ ...guidelineModal, title: e.target.value })
                }
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
                value={guidelineModal.description || ''}
                onChange={(e) =>
                  setGuidelineModal({
                    ...guidelineModal,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Banned / Discouraged Term
                </label>
                <input
                  type="text"
                  value={guidelineModal.bannedTerm || ''}
                  onChange={(e) =>
                    setGuidelineModal({
                      ...guidelineModal,
                      bannedTerm: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Replacement
                </label>
                <input
                  type="text"
                  value={guidelineModal.preferredTerm || ''}
                  onChange={(e) =>
                    setGuidelineModal({
                      ...guidelineModal,
                      preferredTerm: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuidelineModal(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Save Guideline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add/Edit Fact */}
      {factModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleSaveFact}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {factModal.id ? 'Edit Approved Fact' : 'Add Approved Fact'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fact Title
              </label>
              <input
                type="text"
                required
                value={factModal.title || ''}
                onChange={(e) =>
                  setFactModal({ ...factModal, title: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approved Fact Statement
              </label>
              <textarea
                rows={3}
                required
                value={factModal.content || ''}
                onChange={(e) =>
                  setFactModal({ ...factModal, content: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={factModal.factType || 'policy'}
                  onChange={(e) =>
                    setFactModal({ ...factModal, factType: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                >
                  <option value="delivery">Delivery</option>
                  <option value="pricing">Pricing</option>
                  <option value="ranking">Ranking</option>
                  <option value="product_feature">Product Feature</option>
                  <option value="employment_benefit">Benefit</option>
                  <option value="metric">Metric</option>
                  <option value="policy">Policy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner
                </label>
                <input
                  type="text"
                  required
                  value={factModal.owner || ''}
                  onChange={(e) =>
                    setFactModal({ ...factModal, owner: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={factModal.expiryDate || '2027-12-31'}
                  onChange={(e) =>
                    setFactModal({ ...factModal, expiryDate: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFactModal(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Save Fact
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Confirm Deletion
            </h3>
            <p className="text-sm text-slate-600">
              Delete <span className="font-mono font-semibold">{deleteConfirm.label}</span> from this department’s knowledge base?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
