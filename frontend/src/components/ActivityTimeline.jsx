import { useState, useEffect, useRef } from 'react';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Function to generate consistent color based on name
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

// Marquee Text Component - scrolls long text on mobile
const MarqueeText = ({ text, className = '' }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const isOverflowing = textRef.current.scrollWidth > containerRef.current.clientWidth;
        setShouldScroll(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${shouldScroll ? 'animate-marquee' : ''}`}
        style={shouldScroll ? {
          animation: 'marquee 8s linear infinite',
          paddingRight: '50px'
        } : {}}
      >
        {text}
        {shouldScroll && <span className="px-8">•</span>}
        {shouldScroll && text}
      </span>
    </div>
  );
};

// Activity type icons and colors
const getActivityIcon = (type) => {
  const icons = {
    punch_in: '🟢',
    punch_out: '🔴',
    attendance_edit: '✏️',
    punch_out_cleared: '🔄',
    leave_applied: '📝',
    leave_approved: '✅',
    leave_rejected: '❌',
    leave_cancelled: '🚫',
    regularization_applied: '📋',
    regularization_approved: '✅',
    regularization_rejected: '❌',
    wfh_applied: '🏠',
    wfh_approved: '✅',
    wfh_rejected: '❌',
    employee_added: '👤',
    employee_updated: '✏️',
    employee_deactivated: '🚫',
    profile_update_requested: '📝',
    profile_update_approved: '✅',
    profile_update_rejected: '❌',
    shift_created: '⏰',
    shift_updated: '⏰',
    shift_deleted: '🗑️',
    holiday_added: '🎉',
    holiday_updated: '📅',
    holiday_deleted: '🗑️',
    comp_off_earned: '🎁',
    comp_off_used: '📅',
    system: '🔔',
  };
  return icons[type] || '📌';
};

const getActivityColor = (category) => {
  const colors = {
    attendance: 'bg-green-100 text-green-800 border-green-200',
    leave: 'bg-blue-100 text-blue-800 border-blue-200',
    regularization: 'bg-purple-100 text-purple-800 border-purple-200',
    wfh: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    employee: 'bg-orange-100 text-orange-800 border-orange-200',
    profile: 'bg-pink-100 text-pink-800 border-pink-200',
    shift: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    holiday: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    comp_off: 'bg-teal-100 text-teal-800 border-teal-200',
    system: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const ActivityTimeline = () => {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'leave', label: 'Leave' },
    { value: 'regularization', label: 'Regularization' },
    { value: 'wfh', label: 'WFH' },
    { value: 'employee', label: 'Employee' },
    { value: 'holiday', label: 'Holiday' },
  ];

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
      const response = await authAPI.getActivityLog(params);
      setActivities(response.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [categoryFilter]);

  // Group activities by date
  const groupByDate = (activities) => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    activities.forEach((activity) => {
      const date = new Date(activity.created_at).toDateString();
      let label = date;

      if (date === today) {
        label = 'Today';
      } else if (date === yesterday) {
        label = 'Yesterday';
      } else {
        label = new Date(activity.created_at).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupByDate(activities);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton variant="text" width={150} height={32} />
          <Skeleton variant="rounded" width={100} height={36} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1">
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="80%" height={16} />
                <Skeleton variant="text" width={60} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Marquee Animation CSS */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 8s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity Timeline
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchActivities}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No activities yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto overflow-x-hidden pr-1">
            {Object.entries(groupedActivities).map(([date, items]) => (
              <div key={date}>
                <div className="sticky top-0 bg-white py-2 z-10">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  {items.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-lg border ${getActivityColor(activity.category)} overflow-hidden`}
                    >
                      <div className="flex gap-2 sm:gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {activity.actor_photo ? (
                            <Avatar
                              src={activity.actor_photo}
                              alt={activity.actor_name}
                              sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}
                            />
                          ) : (
                            <Avatar
                              sx={{
                                width: { xs: 32, sm: 40 },
                                height: { xs: 32, sm: 40 },
                                bgcolor: stringToColor(activity.actor_name || 'System'),
                                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                              }}
                            >
                              {activity.actor_name?.charAt(0)?.toUpperCase() || 'S'}
                            </Avatar>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          {/* Title Row */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="flex-shrink-0 text-xs sm:text-sm">{getActivityIcon(activity.activity_type)}</span>
                              {/* Mobile: Marquee scroll, Desktop: Normal */}
                              <div className="hidden sm:block text-sm font-medium text-gray-900 truncate">
                                {activity.title}
                              </div>
                              <div className="sm:hidden flex-1 min-w-0">
                                <MarqueeText
                                  text={activity.title}
                                  className="text-xs font-medium text-gray-900"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-1">
                              {activity.formatted_time}
                            </span>
                          </div>

                          {/* Description - with marquee on mobile */}
                          {activity.description && (
                            <>
                              {/* Mobile: Marquee */}
                              <div className="sm:hidden mt-1">
                                <MarqueeText
                                  text={activity.description}
                                  className="text-[11px] text-gray-600"
                                />
                              </div>
                              {/* Desktop: Normal text */}
                              <p className="hidden sm:block text-xs text-gray-600 mt-1 break-words">
                                {activity.description}
                              </p>
                            </>
                          )}

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <span className="text-[10px] sm:text-xs text-gray-500">{activity.time_ago}</span>
                            {isAdmin && activity.target_user_name && activity.target_user_name !== activity.actor_name && (
                              <span className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">
                                • For: {activity.target_user_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityTimeline;
