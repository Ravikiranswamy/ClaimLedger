import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { DEPARTMENTS, ROLE_LABEL, type Role, type User } from '../types'

const ROLE_COLORS: Record<Role, { badge: string; text: string; dot: string }> = {
  ADMIN: { badge: 'bg-purple-50 border-purple-200 text-purple-900', text: 'text-purple-700', dot: 'bg-purple-500' },
  REVIEWER: { badge: 'bg-teal-50 border-teal-200 text-teal-900', text: 'text-teal-700', dot: 'bg-teal-500' },
  DEPT_MANAGER: { badge: 'bg-indigo-50 border-indigo-200 text-indigo-900', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  CREATOR: { badge: 'bg-sky-50 border-sky-200 text-sky-900', text: 'text-sky-700', dot: 'bg-sky-500' },
}

export function UserManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'matrix'>('users')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Query users from backend / mock
  const usersQ = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.listUsers(),
  })

  const users = usersQ.data ?? []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { email: string; fullName: string; role: Role; departmentId?: string | null; canApproveKnowledge?: boolean }) =>
      api.createUser(data),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
      setInviteModalOpen(false)
      setActionSuccess(`Invited ${newUser.fullName} (${newUser.email}) successfully.`)
      setTimeout(() => setActionSuccess(null), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: Role; departmentId?: string | null; isActive?: boolean; canApproveKnowledge?: boolean } }) =>
      api.updateUser(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
      setEditingUser(null)
      setActionSuccess(`Updated permissions for ${updated.fullName}.`)
      setTimeout(() => setActionSuccess(null), 4000)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.toggleUserStatus(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
      setActionSuccess(`Account for ${updated.fullName} is now ${updated.isActive ? 'Active' : 'Suspended'}.`)
      setTimeout(() => setActionSuccess(null), 4000)
    },
  })

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchesDept = deptFilter === 'ALL' || u.departmentId === deptFilter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive !== false) ||
      (statusFilter === 'SUSPENDED' && u.isActive === false)

    return matchesSearch && matchesRole && matchesDept && matchesStatus
  })

  // Computed metrics
  const totalUsers = users.length
  const activeCount = users.filter((u) => u.isActive !== false).length
  const creatorsCount = users.filter((u) => u.role === 'CREATOR').length
  const reviewersCount = users.filter((u) => u.role === 'REVIEWER').length
  const managersCount = users.filter((u) => u.role === 'DEPT_MANAGER').length
  const adminsCount = users.filter((u) => u.role === 'ADMIN').length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-xs md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy">
            <span className="font-mono text-brand font-bold">04</span>
            <span>Organisation Admin Workspace</span>
          </div>
          <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0A1F36]">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage Nexora Technologies organisation members, departmental scopes, and governance permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-strong transition shadow-xs cursor-pointer shrink-0"
        >
          <UserPlus size={16} />
          <span>Invite Employee</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Live Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Total Members</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#0A1F36]">{totalUsers}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">{activeCount} Active</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Creators</p>
          <p className="mt-1 font-display text-2xl font-bold text-sky-700">{creatorsCount}</p>
          <p className="mt-0.5 text-[11px] text-muted">Content Authors</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Reviewers</p>
          <p className="mt-1 font-display text-2xl font-bold text-teal-700">{reviewersCount}</p>
          <p className="mt-0.5 text-[11px] text-muted">Approval Authority</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Managers</p>
          <p className="mt-1 font-display text-2xl font-bold text-indigo-700">{managersCount}</p>
          <p className="mt-0.5 text-[11px] text-muted">Dept Oversight</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Admins</p>
          <p className="mt-1 font-display text-2xl font-bold text-purple-700">{adminsCount}</p>
          <p className="mt-0.5 text-[11px] text-muted">System Governance</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted">Departments</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#0A1F36]">{DEPARTMENTS.length}</p>
          <p className="mt-0.5 text-[11px] text-muted">Mkt, Sales, HR</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-[#0A1F36]'
          }`}
        >
          <Users size={15} />
          <span>All Users ({filteredUsers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'departments'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-[#0A1F36]'
          }`}
        >
          <Building2 size={15} />
          <span>Departments ({DEPARTMENTS.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-[#0A1F36]'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Roles & Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: ALL USERS TABLE */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name or email…"
                className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-xs text-[#0A1F36] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="CREATOR">Content Creator</option>
                <option value="REVIEWER">Authorised Reviewer</option>
                <option value="DEPT_MANAGER">Department Manager</option>
                <option value="ADMIN">Organisation Admin</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Accounts</option>
                <option value="SUSPENDED">Suspended Accounts</option>
              </select>

              {(search || roleFilter !== 'ALL' || deptFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setRoleFilter('ALL')
                    setDeptFilter('ALL')
                    setStatusFilter('ALL')
                  }}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-muted hover:text-[#0A1F36] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-canvas/70 font-semibold text-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Knowledge Authority</th>
                    <th className="px-4 py-3.5">Account Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted">
                        No employees found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const dept = DEPARTMENTS.find((d) => d.id === u.departmentId)?.name ?? 'Global'
                      const isSelf = u.id === currentUser?.id
                      const isActive = u.isActive !== false
                      const roleConfig = ROLE_COLORS[u.role] ?? ROLE_COLORS.CREATOR

                      return (
                        <tr key={u.id} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy font-bold text-xs uppercase">
                                {u.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-[#0A1F36]">{u.fullName}</p>
                                  {isSelf && (
                                    <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-[11px] ${roleConfig.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${roleConfig.dot}`} />
                              <span>{ROLE_LABEL[u.role]}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-medium text-[#2D3F50]">{dept}</span>
                          </td>

                          <td className="px-4 py-3.5">
                            {u.canApproveKnowledge ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                                <ShieldCheck size={13} className="text-teal-600" />
                                <span>Authorised Knowledge Approver</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">Standard Workflow</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span>Suspended</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser(u)}
                                className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-[#0A1F36] hover:bg-canvas cursor-pointer shadow-2xs"
                              >
                                Edit Role & Scope
                              </button>

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => toggleStatusMutation.mutate(u.id)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer shadow-2xs ${
                                    isActive
                                      ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                      : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                  title={isActive ? 'Suspend account access' : 'Reactivate account'}
                                >
                                  {isActive ? 'Suspend' : 'Activate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS OVERVIEW */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEPARTMENTS.map((dept) => {
              const deptMembers = users.filter((u) => u.departmentId === dept.id)
              const deptManager = deptMembers.find((u) => u.role === 'DEPT_MANAGER')
              const creators = deptMembers.filter((u) => u.role === 'CREATOR')

              return (
                <div key={dept.id} className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#0A1F36]">{dept.name}</h3>
                        <p className="text-[11px] text-muted">Nexora Department</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-navy-soft/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
                      {deptMembers.length} Members
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-line pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Department Manager:</span>
                      <span className="font-semibold text-[#0A1F36]">
                        {deptManager ? deptManager.fullName : 'None Assigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Content Creators:</span>
                      <span className="font-semibold text-[#0A1F36]">{creators.length} Authors</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Applicable Knowledge:</span>
                      <span className="font-semibold text-teal-700">Tier 2 Scoped Docs</span>
                    </div>
                  </div>

                  <div className="border-t border-line pt-3">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {deptMembers.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-0.5 text-[11px] text-[#2D3F50]"
                        >
                          <span className="font-medium">{m.fullName}</span>
                          <span className="text-muted">({m.role.charAt(0)})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0A1F36]">
              ClaimLedger Role-Based Access Control (RBAC) Architecture
            </h2>
            <p className="mt-1 text-xs text-muted max-w-3xl">
              Permissions follow the four core roles established in the governance charter. Authorised knowledge document approval is a configurable capability granted to senior personnel rather than an artificial additional role.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/70 font-semibold text-[#0A1F36]">
                <tr>
                  <th className="px-4 py-3">Governance Capability</th>
                  <th className="px-4 py-3 text-sky-800">Content Creator</th>
                  <th className="px-4 py-3 text-indigo-800">Dept Manager</th>
                  <th className="px-4 py-3 text-teal-800">Authorised Reviewer</th>
                  <th className="px-4 py-3 text-purple-800">Organisation Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[#2D3F50]">
                <tr>
                  <td className="px-4 py-2.5 font-medium">Create & Submit Content</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">View Brand Guidelines & Facts</td>
                  <td className="px-4 py-2.5 text-teal-700 font-semibold">✓ Read-Only</td>
                  <td className="px-4 py-2.5 text-teal-700 font-semibold">✓ Read-Only</td>
                  <td className="px-4 py-2.5 text-teal-700 font-semibold">✓ Read-Only</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full Manage</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Inspect Claim Evidence & Diffs</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Own Content</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Department</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Organisation</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Organisation</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Content Review Decision (Approve / Reject)</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Authorized</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Authorized</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Upload Knowledge Documents</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full Manage</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Approve Knowledge Documents (Make Authoritative)</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-amber-700 font-semibold">Configurable Flag</td>
                  <td className="px-4 py-2.5 text-amber-700 font-semibold">Configurable Flag</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full Manage</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Manage Employees, Roles & Scopes</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Full Manage</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Access Organisation-Wide Audit History</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-muted">—</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-bold">✓ Immutable Log</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: INVITE EMPLOYEE MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-brand" />
                <h3 className="font-bold text-base text-[#0A1F36]">Invite New Employee</h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-muted hover:text-[#0A1F36] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value
                const email = (form.elements.namedItem('email') as HTMLInputElement).value
                const role = (form.elements.namedItem('role') as HTMLSelectElement).value as Role
                const deptVal = (form.elements.namedItem('departmentId') as HTMLSelectElement).value
                const departmentId = deptVal === 'NONE' ? null : deptVal
                const canApproveKnowledge = (form.elements.namedItem('canApprove') as HTMLInputElement).checked

                createMutation.mutate({ fullName, email, role, departmentId, canApproveKnowledge })
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0A1F36] mb-1">Full Name</label>
                <input
                  name="fullName"
                  required
                  placeholder="e.g. Vikram Seth"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0A1F36] mb-1">Work Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. vikram@nexora.com"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A1F36] mb-1">Assign Role</label>
                  <select
                    name="role"
                    defaultValue="CREATOR"
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                  >
                    <option value="CREATOR">Content Creator</option>
                    <option value="REVIEWER">Authorised Reviewer</option>
                    <option value="DEPT_MANAGER">Department Manager</option>
                    <option value="ADMIN">Organisation Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0A1F36] mb-1">Department</label>
                  <select
                    name="departmentId"
                    defaultValue={DEPARTMENTS[0]?.id}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                  >
                    <option value="NONE">Global / None</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#DDE5EE] bg-white p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="canApprove"
                    defaultChecked={false}
                    className="mt-0.5 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[#0A1F36] block">
                      Grant Authorised Knowledge Document Approval
                    </span>
                    <span className="text-muted block text-[11px] leading-relaxed">
                      Allows this user to participate in Knowledge Document sign-offs and approve documents into the official brand knowledge base.
                    </span>
                  </div>
                </label>
              </div>

              {createMutation.isError && (
                <p className="rounded-lg bg-violation-soft p-2.5 text-xs text-violation">
                  {(createMutation.error as any)?.message ?? 'Failed to invite user.'}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl border border-line px-3.5 py-2 font-semibold text-muted hover:text-[#0A1F36] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong transition cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Sending Invite…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ROLE & PERMISSIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0A1F36]">Edit Role & Governance Scope</h3>
                <p className="text-xs text-muted">{editingUser.fullName} ({editingUser.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-muted hover:text-[#0A1F36] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const role = (form.elements.namedItem('role') as HTMLSelectElement).value as Role
                const deptVal = (form.elements.namedItem('departmentId') as HTMLSelectElement).value
                const departmentId = deptVal === 'NONE' ? null : deptVal
                const canApproveKnowledge = (form.elements.namedItem('canApprove') as HTMLInputElement).checked
                const isActive = (form.elements.namedItem('isActive') as HTMLSelectElement).value === 'TRUE'

                updateMutation.mutate({
                  id: editingUser.id,
                  data: { role, departmentId, canApproveKnowledge, isActive },
                })
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0A1F36] mb-1">Governance Role</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                >
                  <option value="CREATOR">Content Creator (Create, edit, and resubmit content)</option>
                  <option value="REVIEWER">Authorised Reviewer (Review and sign off content submissions)</option>
                  <option value="DEPT_MANAGER">Department Manager (Departmental oversight and reporting)</option>
                  <option value="ADMIN">Organisation Admin (Full governance and system configuration)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0A1F36] mb-1">Department Scope</label>
                <select
                  name="departmentId"
                  defaultValue={editingUser.departmentId ?? 'NONE'}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                >
                  <option value="NONE">Global / Organisation-Wide</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0A1F36] mb-1">Account Access Status</label>
                <select
                  name="isActive"
                  defaultValue={editingUser.isActive !== false ? 'TRUE' : 'FALSE'}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-[#0A1F36] focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                >
                  <option value="TRUE">Active (Permitted to sign in and take actions)</option>
                  <option value="FALSE">Suspended (Access blocked)</option>
                </select>
              </div>

              <div className="rounded-xl border border-[#DDE5EE] bg-white p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="canApprove"
                    defaultChecked={editingUser.canApproveKnowledge ?? (editingUser.role === 'ADMIN')}
                    className="mt-0.5 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[#0A1F36] block">
                      Authorised Knowledge Document Approver
                    </span>
                    <span className="text-muted block text-[11px] leading-relaxed">
                      Grants permission to approve uploaded guidelines and catalogues into authoritative organizational truth.
                    </span>
                  </div>
                </label>
              </div>

              {updateMutation.isError && (
                <p className="rounded-lg bg-violation-soft p-2.5 text-xs text-violation">
                  {(updateMutation.error as any)?.message ?? 'Failed to update user.'}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-line px-3.5 py-2 font-semibold text-muted hover:text-[#0A1F36] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong transition cursor-pointer disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving Changes…' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
