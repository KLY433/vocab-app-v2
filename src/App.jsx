import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ToastProvider, useAuthContext } from './lib/context'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import LibraryPage from './pages/LibraryPage'
import VocabPage from './pages/VocabPage'
import TestPage from './pages/TestPage'
import WrongPage from './pages/WrongPage'
import StatsPage from './pages/StatsPage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthContext()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthContext()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (user) return <Navigate to="/vocab" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute><LibraryPage /></ProtectedRoute>
      } />
      <Route path="/vocab" element={
        <ProtectedRoute><VocabPage /></ProtectedRoute>
      } />
      <Route path="/test" element={
        <ProtectedRoute><TestPage /></ProtectedRoute>
      } />
      <Route path="/wrong" element={
        <ProtectedRoute><WrongPage /></ProtectedRoute>
      } />
      <Route path="/stats" element={
        <ProtectedRoute><StatsPage /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute><AdminPage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/vocab" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
