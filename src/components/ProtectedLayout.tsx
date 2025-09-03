import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { toast } from 'react-toastify';

const ProtectedLayout: React.FC = () => {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      toast.error('Your session has expired. Please log in again.');
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Fixed Sidebar */}
      <Sidebar />
      {/* Main Content Area with left margin to avoid overlap */}
      <div className="flex-1 overflow-auto ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default ProtectedLayout;
