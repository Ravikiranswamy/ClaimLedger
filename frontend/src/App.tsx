import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { OrganisationSettings } from './pages/OrganisationSettings'
import { AdminSubmissionDetail } from './pages/AdminSubmissionDetail'
import { AdminSubmissions } from './pages/AdminSubmissions'
import { ApprovalManagement } from './pages/ApprovalManagement'
import { BrandGuidelines } from './pages/BrandGuidelines'
import { DepartmentActivity } from './pages/DepartmentActivity'
import { DepartmentInsights } from './pages/DepartmentInsights'
import { DepartmentSubmissions } from './pages/DepartmentSubmissions'
import { History } from './pages/History'
import { Home } from './pages/Home'
import { Insights } from './pages/Insights'
import { KnowledgeBase } from './pages/KnowledgeBase'
import { Login } from './pages/Login'
import { MyContent } from './pages/MyContent'
import { Register } from './pages/Register'
import { ReviewDetail } from './pages/ReviewDetail'
import { ReviewList } from './pages/ReviewList'
import { Submit } from './pages/Submit'
import { UserManagement } from './pages/UserManagement'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-lg text-muted" role="status">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<Protected />}>
              <Route index element={<Home />} />
              <Route path="admin" element={<Navigate to="/" replace />} />
              <Route path="submit" element={<Submit />} />
              <Route path="my-content" element={<MyContent />} />
              <Route path="guidelines" element={<BrandGuidelines />} />
              <Route path="brand-guidelines" element={<BrandGuidelines />} />
              <Route path="submissions/:id" element={<ReviewDetail />} />
              <Route path="review" element={<ReviewList />} />
              <Route path="review/:id" element={<ReviewDetail />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="history" element={<History />} />
              <Route path="department/submissions" element={<DepartmentSubmissions />} />
              <Route path="department/submissions/:id" element={<AdminSubmissionDetail />} />
              <Route path="department/insights" element={<DepartmentInsights />} />
              <Route path="department/activity" element={<DepartmentActivity />} />
              <Route path="admin/submissions" element={<AdminSubmissions />} />
              <Route path="admin/submissions/:id" element={<AdminSubmissionDetail />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/approvals" element={<ApprovalManagement />} />
              <Route path="admin/insights" element={<Insights />} />
              <Route path="admin/settings" element={<OrganisationSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
