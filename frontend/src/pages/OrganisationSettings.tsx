import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  Mail,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import type { AuthorityEngineConfig, DepartmentItem, OrganisationProfile } from '../types'

export function OrganisationSettings() {
  const queryClient = useQueryClient()

  // Tabs: profile, departments, authority
  const [activeTab, setActiveTab] = useState<'profile' | 'departments' | 'authority'>('profile')

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Queries
  const orgQ = useQuery({
    queryKey: ['organisation-profile'],
    queryFn: () => api.getOrganisation(),
  })

  const deptQ = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.listDepartments(),
  })

  const rulesQ = useQuery({
    queryKey: ['authority-rules'],
    queryFn: () => api.getAuthorityRules(),
  })

  // Profile Form State
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileForm, setProfileForm] = useState<{
    name: string
    description: string
    website: string
    contactEmail: string
  }>({
    name: '',
    description: '',
    website: '',
    contactEmail: '',
  })

  // Sync profile form when data loads or editing starts
  const startEditingProfile = () => {
    if (orgQ.data) {
      setProfileForm({
        name: orgQ.data.name || '',
        description: orgQ.data.description || '',
        website: orgQ.data.website || '',
        contactEmail: orgQ.data.contactEmail || '',
      })
    }
    setProfileEditing(true)
  }

  // Profile Mutation
  const updateOrgMutation = useMutation({
    mutationFn: (data: Partial<OrganisationProfile>) => api.updateOrganisation(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['organisation-profile'], updated)
      setProfileEditing(false)
      showToast('Organisation profile updated successfully.')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to update organisation profile.', 'error')
    },
  })

  // Department Modals State
  const [addDeptModalOpen, setAddDeptModalOpen] = useState(false)
  const [editDeptModalOpen, setEditDeptModalOpen] = useState(false)
  const [deactivateConfirmDept, setDeactivateConfirmDept] = useState<DepartmentItem | null>(null)
  const [deptForm, setDeptForm] = useState<{ id?: string; name: string; code: string; description: string }>({
    name: '',
    code: '',
    description: '',
  })

  // Department Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; code: string; description: string }) => api.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-list'] })
      setAddDeptModalOpen(false)
      setDeptForm({ name: '', code: '', description: '' })
      showToast('New department registered successfully.')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to create department.', 'error')
    },
  })

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; description?: string; isActive?: boolean } }) =>
      api.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-list'] })
      setEditDeptModalOpen(false)
      setDeactivateConfirmDept(null)
      showToast('Department configuration updated successfully.')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to update department.', 'error')
    },
  })

  // Authority Rules Form State & Mutation
  const [rulesDraft, setRulesDraft] = useState<AuthorityEngineConfig | null>(null)
  const activeRules: AuthorityEngineConfig = rulesDraft ?? rulesQ.data ?? {
    requireExplicitApproval: true,
    strictDateValidity: true,
    allowScopedTier2Exceptions: true,
    tier1OverridesSubordinate: true,
    flagNumericContradictions: true,
  }

  const updateRulesMutation = useMutation({
    mutationFn: (data: AuthorityEngineConfig) => api.updateAuthorityRules(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['authority-rules'], updated)
      setRulesDraft(null)
      showToast('Deterministic authority configuration updated and applied.')
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to update authority rules.', 'error')
    },
  })

  const org = orgQ.data
  const departments = deptQ.data ?? []

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisation Settings</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 border border-teal-200 text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              {org?.name || 'Nexora Technologies'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Configure organisation brand metadata, departmental hierarchy scopes, and deterministic authority matrix rules.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-sm font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Organisation Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'departments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-4 h-4 text-teal-600" />
            <span>Departments ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('authority')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'authority'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>Authority Rules</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ORGANISATION PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Brand & Organisation Profile</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Core identity details used across automated compliance audits, creator attribution, and notifications.
                </p>
              </div>
              {!profileEditing ? (
                <button
                  onClick={startEditingProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={updateOrgMutation.isPending}
                    onClick={() => updateOrgMutation.mutate(profileForm)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {updateOrgMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              {orgQ.isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading organisation profile...</div>
              ) : !profileEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Organisation Name</span>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{org?.name || 'Nexora Technologies'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unique Identifier (Slug)</span>
                    <p className="text-sm font-mono text-slate-700 mt-1.5 bg-slate-100 px-2.5 py-1 rounded inline-block">
                      {org?.slug || 'nexora'}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Organisation Description</span>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      {org?.description || 'Enterprise brand truth, automated claim verification, and continuous guideline governance platform.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Primary Website</span>
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-800">
                      <Globe className="w-4 h-4 text-teal-600" />
                      <a
                        href={org?.website || 'https://nexora.tech'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 hover:underline font-medium"
                      >
                        {org?.website || 'https://nexora.tech'}
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Governance Contact Email</span>
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-800">
                      <Mail className="w-4 h-4 text-teal-600" />
                      <span className="font-medium">{org?.contactEmail || 'governance@nexora.tech'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateOrgMutation.mutate(profileForm)
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organisation Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. Nexora Technologies"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Unique Identifier (Slug)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={org?.slug || 'nexora'}
                        className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed font-mono"
                      />
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Workspace slug is immutable.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organisation Description
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.description}
                      onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Summary of brand governance mission, scope, or operations..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Primary Website URL
                      </label>
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Governance Contact Email
                      </label>
                      <input
                        type="email"
                        value={profileForm.contactEmail}
                        onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Audit Metadata Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              System Audit Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">Organisation ID:</span>
                <span className="font-mono text-slate-800">{org?.id || 'a1b2c3d4-0000-0000-0000-000000000001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Provisioned Date:</span>
                <span className="text-slate-800">
                  {org?.createdAt ? new Date(org.createdAt).toLocaleDateString() : '01 Jan 2026'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Governance Engine:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-teal-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Deterministic Pure Java v1.0
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT CONFIGURATION */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Departments</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{departments.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Units</span>
              <p className="text-2xl font-bold text-teal-700 mt-1">
                {departments.filter((d) => d.isActive).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Members</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {departments.reduce((acc, d) => acc + (d.userCount || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scoped Documents</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {departments.reduce((acc, d) => acc + (d.documentCount || 0), 0)}
              </p>
            </div>
          </div>

          {/* Department Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Configured Departments</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisational scopes for Tier 2 authority resolution. Historical submissions and audit trails are preserved upon deactivation.
                </p>
              </div>
              <button
                onClick={() => {
                  setDeptForm({ name: '', code: '', description: '' })
                  setAddDeptModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Department
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Department Name</th>
                    <th className="px-6 py-3">Scope Code</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-center">Assigned Users</th>
                    <th className="px-6 py-3 text-center">Scoped Docs</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deptQ.isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        Loading departments...
                      </td>
                    </tr>
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        No departments registered yet. Click &quot;Add Department&quot; above to create one.
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {dept.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                            {dept.code || 'DEPT'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                          {dept.description || '—'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-700">
                          {dept.userCount || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-700">
                          {dept.documentCount || 0}
                        </td>
                        <td className="px-6 py-4">
                          {dept.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setDeptForm({
                                id: dept.id,
                                name: dept.name,
                                code: dept.code || '',
                                description: dept.description || '',
                              })
                              setEditDeptModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            Edit
                          </button>
                          {dept.isActive ? (
                            <button
                              onClick={() => setDeactivateConfirmDept(dept)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                updateDeptMutation.mutate({
                                  id: dept.id,
                                  data: { isActive: true },
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETERMINISTIC AUTHORITY RULES */}
      {activeTab === 'authority' && (
        <div className="space-y-6">
          {/* Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border-2 border-teal-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl">
                Highest Priority
              </div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Tier 1 – Master Authority</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Company-wide approved brand guidelines, official product specifications, master price lists, and core corporate truth.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-teal-800 font-medium">
                Scope: Universal organisation-wide override
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl">
                Scoped Authority
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Tier 2 – Departmental Scope</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Approved departmental, sales proposal, marketing campaign, or regional addenda. Valid exclusively within designated department or product scope.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-indigo-800 font-medium">
                Scope: Departmental & channel specific
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-slate-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl">
                Contextual
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-900 text-sm">Tier 3 – Supporting Material</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reference brochures, legacy documentation, style collateral, and background research. Provides context but cannot overrule Tier 1 or Tier 2.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                Scope: Reference only (non-binding)
              </div>
            </div>
          </div>

          {/* Configurable Engine Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Deterministic Resolution Matrix</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure how ClaimLedger&apos;s pure Java authority engine evaluates candidate evidence, validates effective dates, and enforces hierarchy.
                </p>
              </div>
              {rulesDraft && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRulesDraft(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    disabled={updateRulesMutation.isPending}
                    onClick={() => updateRulesMutation.mutate(rulesDraft)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {updateRulesMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Apply Rules
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 divide-y divide-slate-100 space-y-5">
              {/* Rule 1 */}
              <div className="pt-2 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Require Explicit Human Approval</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      STEP 1 GATEWAY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Only knowledge documents with formal <code className="text-teal-700 font-semibold font-mono">APPROVED</code> status are admitted as evidence. Draft, under-review, or unverified documents are discarded upfront before any claim comparison occurs.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRulesDraft({
                      ...activeRules,
                      requireExplicitApproval: !activeRules.requireExplicitApproval,
                    })
                  }
                  className="text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                >
                  {activeRules.requireExplicitApproval ? (
                    <ToggleRight className="w-8 h-8 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Rule 2 */}
              <div className="pt-5 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Strict Date Validity Enforcement</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                      STEP 2 GATEWAY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Documents past their declared expiry date or prior to their effective date are classified as <code className="text-rose-700 font-semibold font-mono">EXPIRED</code> and blocked from serving as authoritative truth. Superseded documents are strictly barred from resolving claims.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRulesDraft({
                      ...activeRules,
                      strictDateValidity: !activeRules.strictDateValidity,
                    })
                  }
                  className="text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                >
                  {activeRules.strictDateValidity ? (
                    <ToggleRight className="w-8 h-8 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Rule 3 */}
              <div className="pt-5 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Allow Scoped Tier 2 Departmental Exceptions</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-800 border border-purple-200">
                      STEP 3 GATEWAY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Permit departmental collateral (such as Marketing promotional briefs or Sales proposal custom quotes) to cite authorized Tier 2 scoped documents within matching department or product scope without triggering false-positive violations.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRulesDraft({
                      ...activeRules,
                      allowScopedTier2Exceptions: !activeRules.allowScopedTier2Exceptions,
                    })
                  }
                  className="text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                >
                  {activeRules.allowScopedTier2Exceptions ? (
                    <ToggleRight className="w-8 h-8 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Rule 4 */}
              <div className="pt-5 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Tier 1 Overrules Subordinate Guidelines</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-50 text-teal-800 border border-teal-200">
                      STEP 4 HIERARCHY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    When candidate evidence contains conflicting guidance between Tier 1 (Company Master) and Tier 2/3 (Departmental / Reference), the pure Java engine deterministically designates Tier 1 as the single source of truth.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRulesDraft({
                      ...activeRules,
                      tier1OverridesSubordinate: !activeRules.tier1OverridesSubordinate,
                    })
                  }
                  className="text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                >
                  {activeRules.tier1OverridesSubordinate ? (
                    <ToggleRight className="w-8 h-8 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Rule 5 */}
              <div className="pt-5 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">Deterministic Numeric & Pricing Contradiction Check</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                      STEP 5 DISCREPANCY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Treat any pricing or metric discrepancies (e.g. citing outdated ₹799 vs authoritative ₹999/mo) as strict, deterministic <code className="text-rose-700 font-semibold font-mono">VIOLATION</code> findings rather than subjective tone suggestions.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRulesDraft({
                      ...activeRules,
                      flagNumericContradictions: !activeRules.flagNumericContradictions,
                    })
                  }
                  className="text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                >
                  {activeRules.flagNumericContradictions ? (
                    <ToggleRight className="w-8 h-8 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD DEPARTMENT */}
      {addDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add New Department</h3>
              <button
                onClick={() => setAddDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createDeptMutation.mutate(deptForm)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Legal & Compliance"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Code (2-5 uppercase chars) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. LGL"
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Governance Scope
                </label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Governance domain, policies, and materials managed by this unit..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDeptMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {createDeptMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DEPARTMENT */}
      {editDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Edit Department Details</h3>
              <button
                onClick={() => setEditDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (deptForm.id) {
                  updateDeptMutation.mutate({
                    id: deptForm.id,
                    data: {
                      name: deptForm.name,
                      code: deptForm.code,
                      description: deptForm.description,
                    },
                  })
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateDeptMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {updateDeptMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEACTIVATE CONFIRMATION */}
      {deactivateConfirmDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Deactivate {deactivateConfirmDept.name}?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Deactivating this department marks it inactive for new submissions. All historical submissions, reviewer audits, and existing documents will remain intact and completely accessible for compliance reporting.
              </p>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Department Scope:</span>
                  <span className="font-mono font-semibold">{deactivateConfirmDept.code}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Historical Members:</span>
                  <span className="font-semibold">{deactivateConfirmDept.userCount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Associated Documents:</span>
                  <span className="font-semibold">{deactivateConfirmDept.documentCount}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeactivateConfirmDept(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={updateDeptMutation.isPending}
                onClick={() =>
                  updateDeptMutation.mutate({
                    id: deactivateConfirmDept.id,
                    data: { isActive: false },
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {updateDeptMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

