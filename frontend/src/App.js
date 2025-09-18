import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Panels from './pages/Panels';
import Campaigns from './pages/Campaigns';
import Repository from './pages/Repository';
import Activities from './pages/Activities';
import Apply from './pages/Apply';
import WorkflowDetail from './pages/WorkflowDetail';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/apply" element={<Apply />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="panels" element={<Panels />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="repository" element={<Repository />} />
          <Route path="activities" element={<Activities />} />
          <Route path="workflow/:id" element={<WorkflowDetail />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;
