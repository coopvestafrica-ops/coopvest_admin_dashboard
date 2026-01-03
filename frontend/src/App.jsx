import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import { Toaster } from 'react-hot-toast'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Contributions from './pages/Contributions'
import Loans from './pages/Loans'
import Rollovers from './pages/Rollovers'
import Investments from './pages/Investments'
import Documents from './pages/Documents'
import Notifications from './pages/Notifications'
import Compliance from './pages/Compliance'
import Settings from './pages/Settings'
import AccessManagement from './pages/AccessManagement'
import AuditLogs from './pages/AuditLogs'
import FeatureManagement from './pages/FeatureManagement'
import RoleAssignment from './pages/RoleAssignment'
import InterestRates from './pages/InterestRates'
import RiskScoring from './pages/RiskScoring'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const { darkMode } = useUIStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contributions"
          element={
            <ProtectedRoute>
              <Contributions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loans"
          element={
            <ProtectedRoute>
              <Loans />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rollovers"
          element={
            <ProtectedRoute>
              <Rollovers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investments"
          element={
            <ProtectedRoute>
              <Investments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute>
              <Compliance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access-management"
          element={
            <ProtectedRoute>
              <AccessManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feature-management"
          element={
            <ProtectedRoute>
              <FeatureManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/role-assignment"
          element={
            <ProtectedRoute>
              <RoleAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interest-rates"
          element={
            <ProtectedRoute>
              <InterestRates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/risk-scoring"
          element={
            <ProtectedRoute>
              <RiskScoring />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
