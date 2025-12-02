import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { lazy, Suspense } from 'react';

// Loading Spinner Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Employees = lazy(() => import('./pages/Employees'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const LeaveHistory = lazy(() => import('./pages/LeaveHistory'));
const Holidays = lazy(() => import('./pages/Holidays'));
const Regularization = lazy(() => import('./pages/Regularization'));
const ProfileRequests = lazy(() => import('./pages/ProfileRequests'));
const WFH = lazy(() => import('./pages/WFH'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Suspense fallback={<PageLoader />}>
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
            <Route
              path="/wfh"
              element={
                <ProtectedRoute>
                  <WFH />
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
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
