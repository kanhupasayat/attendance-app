import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Skeleton from '@mui/material/Skeleton';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, leaveAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import PunchButton from '../components/PunchButton';
import AttendanceCalendar from '../components/AttendanceCalendar';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [absentDays, setAbsentDays] = useState(0);
  const [compOffBalance, setCompOffBalance] = useState({ available: 0, pending: 0 });
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [offDayStats, setOffDayStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const promises = [
        attendanceAPI.getToday(),
        leaveAPI.getMyBalance({}),
      ];

      // Fetch different data based on role
      if (isAdmin) {
        promises.push(authAPI.getDashboardStats());
      } else {
        promises.push(attendanceAPI.getOffDayStats({}));
        promises.push(attendanceAPI.getCompOffBalance({})); // Get comp off balance
        promises.push(leaveAPI.getMyRequests()); // Get recent leave requests
      }

      const results = await Promise.all(promises);

      setTodayAttendance(results[0].data);
      // Handle new response format with balances array and absent_days
      const leaveData = results[1].data;
      if (leaveData.balances) {
        setLeaveBalance(leaveData.balances);
        setAbsentDays(leaveData.absent_days || 0);
      } else {
        // Backward compatibility with old format
        setLeaveBalance(Array.isArray(leaveData) ? leaveData : []);
      }

      if (isAdmin && results[2]) {
        setAdminStats(results[2].data);
      } else if (!isAdmin) {
        if (results[2]) {
          setOffDayStats(results[2].data);
        }
        if (results[3]) {
          setCompOffBalance({
            available: results[3].data.available || 0,
            pending: results[3].data.pending_in_leaves || 0
          });
        }
        if (results[4]) {
          // Get only recent 5 leave requests (handle paginated response)
          const leaveData = results[4].data.results || results[4].data;
          setRecentLeaves(Array.isArray(leaveData) ? leaveData.slice(0, 5) : []);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const formatTime = (datetime) => {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasPunchedIn = todayAttendance?.punch_in && !todayAttendance?.message;
  const hasPunchedOut = todayAttendance?.punch_out;

  if (loading) {
    return (
      <Layout>
        <div className="space-y-5 sm:space-y-6">
          {/* Welcome Section Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Skeleton variant="rounded" width={56} height={56} />
                <div>
                  <Skeleton variant="text" width={200} height={32} />
                  <Skeleton variant="text" width={150} height={20} />
                </div>
              </div>
              <Skeleton variant="text" width={180} height={24} />
            </div>
          </div>

          {/* Punch Section Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <Skeleton variant="text" width={120} height={28} />
                <div className="flex gap-6">
                  <Skeleton variant="text" width={100} height={20} />
                  <Skeleton variant="text" width={100} height={20} />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton variant="rounded" width={130} height={56} sx={{ borderRadius: '12px' }} />
                <Skeleton variant="rounded" width={130} height={56} sx={{ borderRadius: '12px' }} />
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={60} height={36} />
                <Skeleton variant="text" width={80} height={16} />
              </div>
            ))}
          </div>

          {/* Calendar Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width="100%" height={300} sx={{ borderRadius: '12px' }} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Welcome back, {user?.name?.split(' ')[0]}!
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {!isAdmin && user?.weekly_off_display && (
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 px-4 py-3 rounded-xl self-start shadow-lg">
                <p className="text-xs text-purple-100 font-medium">Weekly Off</p>
                <p className="text-lg font-bold text-white">{user.weekly_off_display}</p>
              </div>
            )}
          </div>
        </div>

        {/* Face Registration Warning */}
        {!isAdmin && !user?.face_descriptor && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-orange-800">Face Verification Not Set Up</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Please upload a clear profile photo with your face visible to enable face verification during punch in.
                </p>
                <Link
                  to="/profile"
                  className="inline-flex items-center mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                >
                  Go to Profile
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Punch Section */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Today's Attendance</h2>
            </div>
            {todayAttendance?.is_off_day && (
              <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Today is your weekly off day! You're working extra today.</span>
              </div>
            )}
            <div className="flex flex-col gap-5">
              <div className="bg-gray-50 rounded-xl p-4">
                {hasPunchedIn ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Punch In</p>
                        <p className="text-lg font-bold text-green-600">{formatTime(todayAttendance.punch_in)}</p>
                      </div>
                    </div>
                    {hasPunchedOut ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Punch Out</p>
                            <p className="text-lg font-bold text-red-600">{formatTime(todayAttendance.punch_out)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Working Hours</p>
                            <p className="text-lg font-bold text-blue-600">{todayAttendance.working_hours} hrs</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 sm:col-span-2">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-yellow-700 font-medium">You haven't punched out yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">You haven't punched in today</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <PunchButton
                  type="in"
                  onSuccess={fetchData}
                  disabled={hasPunchedIn}
                />
                <PunchButton
                  type="out"
                  onSuccess={fetchData}
                  disabled={!hasPunchedIn || hasPunchedOut}
                  todayAttendance={todayAttendance}
                />
              </div>
            </div>
          </div>
        )}

        {/* Attendance Calendar for Employees */}
        {!isAdmin && <AttendanceCalendar />}

        {/* Off-Day Work Stats for Employees */}
        {!isAdmin && offDayStats && offDayStats.total_off_day_work > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Off-Day Work (This Month)</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-purple-800 text-sm">Days Worked</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">{offDayStats.total_off_day_work}</p>
                <p className="text-xs text-purple-500 mt-1">Extra days this month</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-orange-800 text-sm">Hours Worked</h3>
                </div>
                <p className="text-3xl font-bold text-orange-600">{parseFloat(offDayStats.total_hours_on_off_days).toFixed(1)}</p>
                <p className="text-xs text-orange-500 mt-1">Extra hours this month</p>
              </div>
            </div>
            {offDayStats.off_day_records && offDayStats.off_day_records.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Work Details</h4>
                <div className="space-y-2">
                  {offDayStats.off_day_records.map((record, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-gray-50 px-4 py-3 rounded-xl">
                      <span className="text-gray-700 font-medium">
                        {new Date(record.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span className="text-purple-600 font-bold bg-purple-100 px-3 py-1 rounded-lg">
                        {parseFloat(record.working_hours).toFixed(1)} hrs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave Balance Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Leave Balance</h2>
              {leaveBalance.length > 0 && leaveBalance[0].month_name && (
                <p className="text-xs text-gray-500">
                  {leaveBalance[0].month_name} {leaveBalance[0].year}
                </p>
              )}
            </div>
          </div>

          {/* Comp Off and LOP Summary Cards */}
          {!isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Comp Off Balance Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-purple-800 text-sm">Comp Off Balance</h3>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">{compOffBalance.available}</p>
                    <p className="text-xs text-purple-500 mt-1">Days available</p>
                  </div>
                  <div className="text-right text-xs text-purple-600 max-w-[120px]">
                    <p>Used first when you apply leave</p>
                    {compOffBalance.pending > 0 && (
                      <p className="text-orange-500 mt-1 font-medium">
                        {compOffBalance.pending} pending
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* LOP Summary Card */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-red-800 text-sm">Loss of Pay (LOP)</h3>
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {leaveBalance.reduce((total, b) => total + parseFloat(b.lop_days || 0), 0)}
                    </p>
                    <p className="text-xs text-red-500 mt-1">Days this month</p>
                  </div>
                  <div className="text-right text-xs text-red-600 max-w-[120px]">
                    <p>Salary will be deducted</p>
                    {absentDays > 0 && (
                      <p className="text-gray-600 mt-1 font-medium">Absent: {absentDays} day(s)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leave Type Balances */}
          {leaveBalance.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {leaveBalance.map((balance) => (
                <div
                  key={balance.id}
                  className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-800 text-sm truncate">
                    {balance.leave_type_details?.name || 'Monthly Leave'}
                  </h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {balance.available_leaves}
                  </p>
                  <p className="text-xs text-gray-500">Available this month</p>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Quota:</span>
                      <span className="font-medium text-gray-700">{balance.total_leaves}</span>
                    </div>
                    {parseFloat(balance.carried_forward) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Carried:</span>
                        <span className="font-medium">+{balance.carried_forward}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span className="font-medium text-gray-700">{balance.used_leaves}</span>
                    </div>
                    {parseFloat(balance.lop_days) > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>LOP:</span>
                        <span className="font-medium">{balance.lop_days}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No leave balance data available.</p>
            </div>
          )}
        </div>

        {/* Recent Leave Requests - Employee Only */}
        {!isAdmin && recentLeaves.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Recent Leave Requests</h2>
              </div>
              <Link
                to="/leaves"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
              >
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-3">
              {recentLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                    leave.status === 'approved' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
                    leave.status === 'pending' ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                    leave.status === 'rejected' ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                        leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {leave.status.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {leave.leave_type_details?.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-lg">
                      {new Date(leave.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {leave.start_date !== leave.end_date && (
                        <> - {new Date(leave.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</>
                      )}
                    </span>
                  </div>

                  {/* Leave Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center bg-white/80 backdrop-blur rounded-lg p-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wide">Total</p>
                      <p className="font-bold text-gray-800 text-base">{leave.total_days}</p>
                    </div>
                    <div className="text-center bg-white/80 backdrop-blur rounded-lg p-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wide">Comp Off</p>
                      <p className="font-bold text-purple-600 text-base">{leave.comp_off_days || 0}</p>
                    </div>
                    <div className="text-center bg-white/80 backdrop-blur rounded-lg p-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wide">Paid</p>
                      <p className="font-bold text-green-600 text-base">{leave.paid_days || 0}</p>
                    </div>
                    <div className="text-center bg-white/80 backdrop-blur rounded-lg p-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wide">LOP</p>
                      <p className="font-bold text-red-600 text-base">{leave.lop_days || 0}</p>
                    </div>
                  </div>

                  {/* Show remarks if rejected or auto-adjusted */}
                  {leave.review_remarks && (
                    <div className={`mt-3 p-2 rounded-lg text-xs ${leave.status === 'rejected' ? 'bg-red-100/50 text-red-700' : 'bg-blue-100/50 text-blue-700'}`}>
                      <span className="font-semibold">{leave.status === 'rejected' ? 'Reason:' : 'Note:'}</span> {leave.review_remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Dashboard Stats */}
        {isAdmin && adminStats && (
          <>
            {/* Today's Attendance Overview */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Today's Attendance
              </h2>

              {/* Mobile: 2x2 grid, Desktop: 4 columns */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/20 backdrop-blur rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{adminStats.total_employees}</p>
                  <p className="text-xs sm:text-sm opacity-90">Total Employees</p>
                </div>

                <div className="bg-green-500/30 backdrop-blur rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-400/40 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{adminStats.today_present}</p>
                  <p className="text-xs sm:text-sm opacity-90">Present</p>
                </div>

                <div className="bg-red-500/30 backdrop-blur rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-400/40 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{adminStats.today_absent}</p>
                  <p className="text-xs sm:text-sm opacity-90">Absent</p>
                </div>

                <div className="bg-yellow-500/30 backdrop-blur rounded-lg p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/40 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{adminStats.today_on_leave}</p>
                  <p className="text-xs sm:text-sm opacity-90">On Leave</p>
                </div>
              </div>
            </div>

            {/* Leave Statistics */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Leave Statistics
              </h2>

              {/* Mobile: Stack, Desktop: 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Link to="/leaves" className="block">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 sm:p-5 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-orange-600 font-medium">Pending Requests</p>
                        <p className="text-3xl sm:text-4xl font-bold text-orange-700 mt-1">{adminStats.pending_leave_requests}</p>
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-orange-500 mt-2">Click to review →</p>
                  </div>
                </Link>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-5 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-green-600 font-medium">Approved Today</p>
                      <p className="text-3xl sm:text-4xl font-bold text-green-700 mt-1">{adminStats.approved_today}</p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 sm:p-5 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-indigo-600 font-medium">This Month</p>
                      <p className="text-3xl sm:text-4xl font-bold text-indigo-700 mt-1">{adminStats.leaves_this_month}</p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions for Admin */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h2>

            {/* Mobile: 2 columns, Desktop: 4 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                to="/employees"
                className="group bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 p-4 sm:p-5 rounded-xl border border-blue-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Employees</h3>
                <p className="text-xs text-blue-600 mt-1 hidden sm:block">Manage staff</p>
              </Link>

              <Link
                to="/attendance"
                className="group bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 p-4 sm:p-5 rounded-xl border border-green-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-green-800 text-sm sm:text-base">Attendance</h3>
                <p className="text-xs text-green-600 mt-1 hidden sm:block">View records</p>
              </Link>

              <Link
                to="/leaves"
                className="group bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 p-4 sm:p-5 rounded-xl border border-yellow-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">Leaves</h3>
                <p className="text-xs text-yellow-600 mt-1 hidden sm:block">Review requests</p>
              </Link>

              <Link
                to="/reports"
                className="group bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 p-4 sm:p-5 rounded-xl border border-purple-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-purple-800 text-sm sm:text-base">Reports</h3>
                <p className="text-xs text-purple-600 mt-1 hidden sm:block">View analytics</p>
              </Link>
            </div>

            {/* Additional Quick Actions Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <Link
                to="/shifts"
                className="group bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 p-4 sm:p-5 rounded-xl border border-cyan-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-cyan-800 text-sm sm:text-base">Shifts</h3>
                <p className="text-xs text-cyan-600 mt-1 hidden sm:block">Manage shifts</p>
              </Link>

              <Link
                to="/holidays"
                className="group bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 p-4 sm:p-5 rounded-xl border border-pink-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-pink-800 text-sm sm:text-base">Holidays</h3>
                <p className="text-xs text-pink-600 mt-1 hidden sm:block">Set holidays</p>
              </Link>

              <Link
                to="/comp-off"
                className="group bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 p-4 sm:p-5 rounded-xl border border-teal-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-teal-800 text-sm sm:text-base">Comp Off</h3>
                <p className="text-xs text-teal-600 mt-1 hidden sm:block">Manage comp offs</p>
              </Link>

              <Link
                to="/regularization"
                className="group bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 p-4 sm:p-5 rounded-xl border border-amber-200 transition-all hover:shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-amber-800 text-sm sm:text-base">Regularization</h3>
                <p className="text-xs text-amber-600 mt-1 hidden sm:block">Review requests</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
