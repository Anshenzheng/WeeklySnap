import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Teams from './pages/Teams';
import Users from './pages/Users';
import MyReport from './pages/MyReport';
import Reports from './pages/Reports';
import Unsubmitted from './pages/Unsubmitted';
import Statistics from './pages/Statistics';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RedirectBasedOnRole = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
    case 'manager':
      return <Navigate to="/reports" replace />;
    case 'member':
      return <Navigate to="/my-report" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RedirectBasedOnRole />} />
        
        <Route
          path="teams"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Teams />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="my-report"
          element={
            <ProtectedRoute allowedRoles={['member']}>
              <MyReport />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="unsubmitted"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Unsubmitted />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="statistics"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Statistics />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
