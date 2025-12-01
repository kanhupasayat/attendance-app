import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AdminSetup from './pages/AdminSetup';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import LeaveHistory from './pages/LeaveHistory';
import Holidays from './pages/Holidays';
import Regularization from './pages/Regularization';
import ProfileRequests from './pages/ProfileRequests';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin-setup" element={<AdminSetup />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <ProtectedRoute>
                <Leaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-history"
            element={
              <ProtectedRoute>
                <LeaveHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holidays"
            element={
              <ProtectedRoute>
                <Holidays />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regularization"
            element={
              <ProtectedRoute>
                <Regularization />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute adminOnly>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute adminOnly>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile-requests"
            element={
              <ProtectedRoute adminOnly>
                <ProfileRequests />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
