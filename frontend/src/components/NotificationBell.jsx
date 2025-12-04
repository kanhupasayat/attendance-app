import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const response = await authAPI.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getNotifications();
      // Handle paginated response
      const data = response.data?.results || response.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await authAPI.markNotificationRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await authAPI.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleClear = async () => {
    try {
      await authAPI.clearNotifications();
      setNotifications(notifications.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const formatTime = (datetime) => {
    const date = new Date(datetime);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave_approved':
      case 'regularization_approved':
      case 'profile_update_approved':
      case 'wfh_approved':
        return '✓';
      case 'leave_rejected':
      case 'regularization_rejected':
      case 'profile_update_rejected':
      case 'wfh_rejected':
        return '✗';
      case 'leave_applied':
      case 'regularization_applied':
      case 'wfh_applied':
        return '📝';
      case 'profile_update_requested':
        return '👤';
      case 'holiday':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const getTypeColor = (type) => {
    if (type.includes('approved')) return 'text-green-600';
    if (type.includes('rejected')) return 'text-red-600';
    if (type.includes('profile_update_requested')) return 'text-purple-600';
    if (type === 'holiday') return 'text-orange-600';
    if (type.includes('wfh')) return 'text-indigo-600';
    return 'text-blue-600';
  };

  // Get the route to navigate based on notification type
  const getNotificationRoute = (type) => {
    // Leave related
    if (type.includes('leave')) return '/leaves';

    // Regularization related
    if (type.includes('regularization')) return '/regularization';

    // WFH (Work From Home) related
    if (type.includes('wfh')) return '/regularization'; // WFH is in regularization page

    // Profile update related
    if (type.includes('profile_update')) {
      // Admin goes to profile requests page, employee goes to profile page
      if (type === 'profile_update_requested') {
        return isAdmin ? '/profile-requests' : '/profile';
      }
      // For approved/rejected notifications, employee goes to profile
      return '/profile';
    }

    // Holiday notification
    if (type === 'holiday') return '/leaves'; // Holidays shown in leaves page

    // System notification - go to dashboard
    if (type === 'system') return '/';

    return null;
  };

  // Handle notification click - mark as read and navigate
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Get route and navigate
    const route = getNotificationRoute(notification.notification_type);
    if (route) {
      setShowDropdown(false);
      navigate(route);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-white hover:text-blue-200 focus:outline-none"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
            }
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </Badge>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <span className={`text-lg mr-2 ${getTypeColor(notification.notification_type)}`}>
                      {getTypeIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''} text-gray-800`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
