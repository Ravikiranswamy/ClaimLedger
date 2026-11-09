import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { AdminModulePlaceholder } from './pages/AdminModulePlaceholder'
import { History } from './pages/History'
import { Home } from './pages/Home'
import { KnowledgeBase } from './pages/KnowledgeBase'
import { Login } from './pages/Login'
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
            <Route element={<Protected />}>
              <Route index element={<Home />} />
              <Route path="submit" element={<Submit />} />
              <Route path="submissions/:id" element={<ReviewDetail />} />
              <Route path="review" element={<ReviewList />} />
              <Route path="review/:id" element={<ReviewDetail />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="history" element={<History />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/approvals" element={<AdminModulePlaceholder />} />
              <Route path="admin/insights" element={<AdminModulePlaceholder />} />
              <Route path="admin/settings" element={<AdminModulePlaceholder />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
