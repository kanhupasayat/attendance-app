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
    `px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      isActive(path)
        ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  const mobileNavLinkClass = (path) =>
    `block px-4 py-3 rounded-xl text-base font-medium transition-all ${
      isActive(path)
        ? 'bg-white/20 text-white shadow-sm'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg xl:text-xl whitespace-nowrap group">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="hidden sm:inline">AttendEase</span>
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
                  <div className="w-px h-6 bg-white/20 mx-1"></div>
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
            <div className="hidden xl:flex items-center space-x-3">
              <NotificationBell />
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-all group"
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold overflow-hidden bg-white/20 ring-2 ring-white/30 group-hover:ring-white/50 transition-all">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </span>
                <span className="text-white text-sm font-medium hidden 2xl:block">{user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-white/20 hover:border-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>

            {/* Mobile/Tablet: Notification + Hamburger */}
            <div className="flex xl:hidden items-center space-x-2">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-xl hover:bg-white/10 focus:outline-none transition-all"
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
          <div className="xl:hidden bg-gradient-to-b from-blue-700 to-indigo-800 border-t border-white/10 animate-fadeIn">
            <div className="px-4 py-4 space-y-2">
              {/* User Info */}
              <Link
                to="/profile"
                onClick={closeMobileMenu}
                className="flex items-center px-4 py-3 text-white bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
              >
                <span className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold mr-4 overflow-hidden bg-white/20 ring-2 ring-white/30">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </span>
                <div>
                  <div className="font-semibold text-lg">{user?.name}</div>
                  <div className="text-sm text-blue-200">{user?.email}</div>
                </div>
                <svg className="w-5 h-5 ml-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <div className="h-px bg-white/10 my-3"></div>

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
                  <div className="h-px bg-white/10 my-3"></div>
                  <div className="px-4 py-2 text-xs text-blue-300 uppercase tracking-widest font-semibold">Admin Tools</div>
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

              <div className="h-px bg-white/10 my-3"></div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className="w-full flex items-center px-4 py-3 text-white bg-red-500/20 hover:bg-red-500 rounded-xl transition-all"
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default Layout;
