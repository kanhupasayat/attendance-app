import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, leaveAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import PunchButton from '../components/PunchButton';
import AttendanceCalendar from '../components/AttendanceCalendar';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
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
      setLeaveBalance(results[1].data);

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
          // Get only recent 5 leave requests
          setRecentLeaves(results[4].data.slice(0, 5));
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

          {/* Comp Off and LOP Summary Cards */}
          {!isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Comp Off Balance Card */}
              <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-purple-800 text-xs sm:text-sm">
                      Comp Off Balance
                    </h3>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1 sm:mt-2">
                      {compOffBalance.available}
                    </p>
                    <p className="text-xs text-purple-500">Days available</p>
                  </div>
                  <div className="text-right text-xs text-purple-600">
                    <p>Used first when you apply leave</p>
                    {compOffBalance.pending > 0 && (
                      <p className="text-orange-500 mt-1">
                        {compOffBalance.pending} pending in requests
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* LOP Summary Card */}
              <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-red-800 text-xs sm:text-sm">
                      Loss of Pay (LOP)
                    </h3>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">
                      {leaveBalance.reduce((total, b) => total + parseFloat(b.lop_days || 0), 0)}
                    </p>
                    <p className="text-xs text-red-500">Days this month</p>
                  </div>
                  <div className="text-right text-xs text-red-600">
                    <p>Salary will be deducted</p>
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

        {/* Recent Leave Requests - Employee Only */}
        {!isAdmin && recentLeaves.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Recent Leave Requests</h2>
              <Link
                to="/leaves"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className={`p-3 rounded-lg border ${
                    leave.status === 'approved' ? 'bg-green-50 border-green-200' :
                    leave.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                    leave.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {leave.status.toUpperCase()}
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {leave.leave_type_details?.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(leave.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {leave.start_date !== leave.end_date && (
                        <> - {new Date(leave.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</>
                      )}
                    </span>
                  </div>

                  {/* Leave Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center bg-white rounded p-1.5">
                      <p className="text-gray-500">Total</p>
                      <p className="font-bold text-gray-800">{leave.total_days}</p>
                    </div>
                    <div className="text-center bg-white rounded p-1.5">
                      <p className="text-gray-500">CompOff</p>
                      <p className="font-bold text-purple-600">{leave.comp_off_days || 0}</p>
                    </div>
                    <div className="text-center bg-white rounded p-1.5">
                      <p className="text-gray-500">Paid</p>
                      <p className="font-bold text-green-600">{leave.paid_days || 0}</p>
                    </div>
                    <div className="text-center bg-white rounded p-1.5">
                      <p className="text-gray-500">LOP</p>
                      <p className="font-bold text-red-600">{leave.lop_days || 0}</p>
                    </div>
                  </div>

                  {/* Show remarks if rejected */}
                  {leave.status === 'rejected' && leave.review_remarks && (
                    <p className="mt-2 text-xs text-red-600">
                      <span className="font-medium">Reason:</span> {leave.review_remarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
