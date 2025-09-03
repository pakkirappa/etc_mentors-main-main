// App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedLayout from './components/ProtectedLayout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExamManagement from './components/ExamManagement/ExamManagement';
import StudentManagement from './components/StudentManagement/StudentManagement';
import ResultsAnalysis from './components/ResultsAnalysis';
import Settings from './components/Settings';
import HelpSupport from './components/HelpSupport';
import AnnouncementsMedia from './components/AnnouncementsMedia/AnnouncementsMedia';
import PreviousQuestions from './components/PreviousQuestions';

// Separate component so we can use `useNavigate` inside
function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      navigate('/login', { replace: true });
    };
    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exams" element={<ExamManagement />} />
          <Route path="/students" element={<StudentManagement />} />
          <Route path="/results" element={<ResultsAnalysis />} />
          <Route path="/announcements" element={<AnnouncementsMedia />} />
          <Route path="/previous-questions" element={<PreviousQuestions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route
            path="*"
            element={<div className="text-center text-gray-500 p-6">Page Not Found</div>}
          />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
