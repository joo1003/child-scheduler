import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChildProvider } from './contexts/ChildContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import TimetablePage from './pages/TimetablePage'
import CalendarPage from './pages/CalendarPage'
import PhotosPage from './pages/PhotosPage'
import NoticesPage from './pages/NoticesPage'
import ChatPage from './pages/ChatPage'
import AcademiesPage from './pages/AcademiesPage'
import GamesPage from './pages/GamesPage'
import InterestsPage from './pages/InterestsPage'

function AppRoutes() {
  const { user, myFamily, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 로그인 안 됨 → Auth 화면 (가족 설정 포함)
  if (!user) return <AuthPage />

  // 로그인 됐지만 가족 없음 → 가족 설정 화면 (AuthPage가 family step 처리)
  if (!myFamily) return <AuthPage />

  return (
    <ChildProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="academies" element={<AcademiesPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="interests" element={<InterestsPage />} />
        </Route>
      </Routes>
    </ChildProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
