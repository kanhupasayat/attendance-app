import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `px-2 xl:px-3 py-2 rounded-md text-xs xl:text-sm font-medium transition-colors whitespace-nowrap ${
      isActive(path)
        ? 'bg-blue-700 text-white'
        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
    }`;

  const mobileNavLinkClass = (path) =>
    `block px-3 py-3 rounded-md text-base font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-700 text-white'
        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
    }`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-white font-bold text-base sm:text-lg xl:text-xl whitespace-nowrap">
                Attendance
              </Link>
            </div>

            {/* Desktop Navigation - Hidden on mobile/tablet */}
            <div className="hidden xl:flex items-center space-x-1">
              <Link to="/" className={navLinkClass('/')}>
                Dashboard
              </Link>
              <Link to="/attendance" className={navLinkClass('/attendance')}>
                Attendance
              </Link>
              <Link to="/leaves" className={navLinkClass('/leaves')}>
                Leaves
              </Link>
              <Link to="/holidays" className={navLinkClass('/holidays')}>
                Holidays
              </Link>
              <Link to="/wfh" className={navLinkClass('/wfh')}>
                WFH
              </Link>
              <Link to="/comp-off" className={navLinkClass('/comp-off')}>
                Comp Off
              </Link>
              {isAdmin && (
                <>
                  <Link to="/employees" className={navLinkClass('/employees')}>
                    Employees
                  </Link>
                  <Link to="/profile-requests" className={navLinkClass('/profile-requests')}>
                    Requests
                  </Link>
                  <Link to="/shifts" className={navLinkClass('/shifts')}>
                    Shifts
                  </Link>
                  <Link to="/reports" className={navLinkClass('/reports')}>
                    Reports
                  </Link>
                </>
              )}
            </div>

            {/* Desktop Right Side - Hidden on mobile/tablet */}
            <div className="hidden xl:flex items-center space-x-2">
              <NotificationBell />
              <Link
                to="/profile"
                className="text-white hover:text-blue-200 flex items-center"
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden bg-blue-800">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile/Tablet: Notification + Hamburger */}
            <div className="flex xl:hidden items-center space-x-2">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-md hover:bg-blue-500 focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-blue-700 border-t border-blue-500">
            <div className="px-4 py-3 space-y-1">
              {/* User Info */}
              <Link
                to="/profile"
                onClick={closeMobileMenu}
                className="flex items-center px-3 py-3 text-white hover:bg-blue-600 rounded-md"
              >
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-3 overflow-hidden bg-blue-800">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </span>
                <div>
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-sm text-blue-200">{user?.email}</div>
                </div>
              </Link>

              <hr className="border-blue-500 my-2" />

              {/* Navigation Links */}
              <Link to="/" className={mobileNavLinkClass('/')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </span>
              </Link>
              <Link to="/attendance" className={mobileNavLinkClass('/attendance')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Attendance
                </span>
              </Link>
              <Link to="/leaves" className={mobileNavLinkClass('/leaves')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Leaves
                </span>
              </Link>
              <Link to="/holidays" className={mobileNavLinkClass('/holidays')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Holidays
                </span>
              </Link>
              <Link to="/wfh" className={mobileNavLinkClass('/wfh')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Work From Home
                </span>
              </Link>
              <Link to="/comp-off" className={mobileNavLinkClass('/comp-off')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Comp Off
                </span>
              </Link>
              <Link to="/profile" className={mobileNavLinkClass('/profile')} onClick={closeMobileMenu}>
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </span>
              </Link>

              {isAdmin && (
                <>
                  <hr className="border-blue-500 my-2" />
                  <div className="px-3 py-1 text-xs text-blue-300 uppercase tracking-wider">Admin</div>
                  <Link to="/employees" className={mobileNavLinkClass('/employees')} onClick={closeMobileMenu}>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Employees
                    </span>
                  </Link>
                  <Link to="/profile-requests" className={mobileNavLinkClass('/profile-requests')} onClick={closeMobileMenu}>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Profile Requests
                    </span>
                  </Link>
                  <Link to="/shifts" className={mobileNavLinkClass('/shifts')} onClick={closeMobileMenu}>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Shifts
                    </span>
                  </Link>
                  <Link to="/reports" className={mobileNavLinkClass('/reports')} onClick={closeMobileMenu}>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Reports
                    </span>
                  </Link>
                </>
              )}

              <hr className="border-blue-500 my-2" />

              {/* Logout Button */}
              <button
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className="w-full flex items-center px-3 py-3 text-red-200 hover:bg-red-600 hover:text-white rounded-md transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4">{children}</main>
    </div>
  );
};

export default Layout;
