import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, leaveAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import PunchButton from '../components/PunchButton';
import AttendanceCalendar from '../components/AttendanceCalendar';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
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
      }

      const results = await Promise.all(promises);

      setTodayAttendance(results[0].data);
      setLeaveBalance(results[1].data);

      if (isAdmin && results[2]) {
        setAdminStats(results[2].data);
      } else if (!isAdmin && results[2]) {
        setOffDayStats(results[2].data);
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                Welcome, {user?.name}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {!isAdmin && user?.weekly_off_display && (
              <div className="bg-purple-100 px-3 py-2 rounded-lg self-start">
                <p className="text-xs sm:text-sm text-purple-600">Weekly Off</p>
                <p className="text-base sm:text-lg font-bold text-purple-800">{user.weekly_off_display}</p>
              </div>
            )}
          </div>
        </div>

        {/* Punch Section */}
        {!isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Today's Attendance</h2>
            {todayAttendance?.is_off_day && (
              <div className="mb-4 bg-purple-100 border border-purple-300 text-purple-800 px-3 py-2 rounded-lg text-sm sm:text-base">
                Today is your weekly off day! You're working extra today.
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div>
                {hasPunchedIn ? (
                  <div className="space-y-2">
                    <p className="text-green-600 text-sm sm:text-base">
                      <span className="font-semibold">Punch In:</span>{' '}
                      {formatTime(todayAttendance.punch_in)}
                    </p>
                    {hasPunchedOut ? (
                      <p className="text-red-600 text-sm sm:text-base">
                        <span className="font-semibold">Punch Out:</span>{' '}
                        {formatTime(todayAttendance.punch_out)}
                      </p>
                    ) : (
                      <p className="text-yellow-600 text-sm sm:text-base">
                        You haven't punched out yet
                      </p>
                    )}
                    {hasPunchedOut && (
                      <p className="text-blue-600 text-sm sm:text-base">
                        <span className="font-semibold">Working Hours:</span>{' '}
                        {todayAttendance.working_hours} hrs
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">
                    You haven't punched in today
                  </p>
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
                />
              </div>
            </div>
          </div>
        )}

        {/* Attendance Calendar for Employees */}
        {!isAdmin && <AttendanceCalendar />}

        {/* Off-Day Work Stats for Employees */}
        {!isAdmin && offDayStats && offDayStats.total_off_day_work > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Off-Day Work (This Month)</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-800 text-xs sm:text-sm">Days Worked on Off</h3>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1 sm:mt-2">
                  {offDayStats.total_off_day_work}
                </p>
                <p className="text-xs text-purple-500">Extra days this month</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
                <h3 className="font-semibold text-orange-800 text-xs sm:text-sm">Hours on Off Days</h3>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1 sm:mt-2">
                  {parseFloat(offDayStats.total_hours_on_off_days).toFixed(1)}
                </p>
                <p className="text-xs text-orange-500">Extra hours this month</p>
              </div>
            </div>
            {offDayStats.off_day_records && offDayStats.off_day_records.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Off-Day Work Details:</h4>
                <div className="space-y-1">
                  {offDayStats.off_day_records.map((record, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm bg-gray-50 px-2 sm:px-3 py-2 rounded">
                      <span className="text-gray-700">
                        {new Date(record.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span className="text-purple-600 font-medium">
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
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Leave Balance
            {leaveBalance.length > 0 && leaveBalance[0].month_name && (
              <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                ({leaveBalance[0].month_name} {leaveBalance[0].year})
              </span>
            )}
          </h2>
          {leaveBalance.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {leaveBalance.map((balance) => (
                <div
                  key={balance.id}
                  className="bg-gray-50 rounded-lg p-3 sm:p-4 border"
                >
                  <h3 className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                    {balance.leave_type_details?.name || 'Monthly Leave'}
                  </h3>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">
                    {balance.available_leaves}
                  </p>
                  <p className="text-xs text-gray-500">Available this month</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p>Quota: {balance.total_leaves}</p>
                    {parseFloat(balance.carried_forward) > 0 && (
                      <p className="text-green-600">+CF: {balance.carried_forward}</p>
                    )}
                    <p>Used: {balance.used_leaves}</p>
                    {parseFloat(balance.lop_days) > 0 && (
                      <p className="text-red-500">LOP: {balance.lop_days}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No leave balance data available.</p>
          )}
        </div>

        {/* Admin Dashboard Stats */}
        {isAdmin && adminStats && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Today's Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                <h3 className="text-xs sm:text-sm font-medium text-blue-600">Total Employees</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-800 mt-1">{adminStats.total_employees}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                <h3 className="text-xs sm:text-sm font-medium text-green-600">Present Today</h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-800 mt-1">{adminStats.today_present}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                <h3 className="text-xs sm:text-sm font-medium text-red-600">Absent Today</h3>
                <p className="text-2xl sm:text-3xl font-bold text-red-800 mt-1">{adminStats.today_absent}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
                <h3 className="text-xs sm:text-sm font-medium text-yellow-600">On Leave</h3>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-800 mt-1">{adminStats.today_on_leave}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
                <h3 className="text-xs sm:text-sm font-medium text-orange-600">Pending Leave Requests</h3>
                <p className="text-2xl sm:text-3xl font-bold text-orange-800 mt-1">{adminStats.pending_leave_requests}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                <h3 className="text-xs sm:text-sm font-medium text-purple-600">Approved Today</h3>
                <p className="text-2xl sm:text-3xl font-bold text-purple-800 mt-1">{adminStats.approved_today}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 border border-indigo-200">
                <h3 className="text-xs sm:text-sm font-medium text-indigo-600">Leaves This Month</h3>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-800 mt-1">{adminStats.leaves_this_month}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions for Admin */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <a
                href="/employees"
                className="bg-blue-50 hover:bg-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200 transition-colors"
              >
                <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Manage Employees</h3>
                <p className="text-xs sm:text-sm text-blue-600">Add or edit employees</p>
              </a>
              <a
                href="/reports"
                className="bg-green-50 hover:bg-green-100 p-3 sm:p-4 rounded-lg border border-green-200 transition-colors"
              >
                <h3 className="font-semibold text-green-800 text-sm sm:text-base">View Reports</h3>
                <p className="text-xs sm:text-sm text-green-600">Attendance & Leave reports</p>
              </a>
              <a
                href="/leaves"
                className="bg-yellow-50 hover:bg-yellow-100 p-3 sm:p-4 rounded-lg border border-yellow-200 transition-colors"
              >
                <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">Leave Requests</h3>
                <p className="text-xs sm:text-sm text-yellow-600">Review pending requests</p>
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
