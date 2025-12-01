import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import Layout from '../components/Layout';

const Attendance = () => {
  const { isAdmin } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      const api = isAdmin ? attendanceAPI.getAllAttendance : attendanceAPI.getMyAttendance;
      const response = await api(params);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [month, year, isAdmin]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (datetime) => {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status, small = false) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      half_day: 'bg-yellow-100 text-yellow-800',
      on_leave: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full font-medium ${colors[status] || 'bg-gray-100'} ${small ? 'text-xs' : 'text-xs'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isAdmin ? 'All Attendance' : 'My Attendance'}
              </h1>
              <Link
                to="/regularization"
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-center text-sm sm:text-base transition-colors"
              >
                Regularization
              </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendance.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {attendance.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {isAdmin && (
                          <p className="font-medium text-gray-900 text-sm">{record.user_details?.name}</p>
                        )}
                        <p className="text-gray-600 text-xs">{formatDate(record.date)}</p>
                      </div>
                      {getStatusBadge(record.status, true)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">In</p>
                        <p className="font-medium text-green-600">{formatTime(record.punch_in)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Out</p>
                        <p className="font-medium text-red-600">
                          {formatTime(record.punch_out)}
                          {record.is_auto_punch_out && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Auto</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Hours</p>
                        <p className="font-medium text-blue-600">{record.working_hours || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isAdmin && (
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                      )}
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch In
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch Out
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        {isAdmin && (
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.user_details?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.user_details?.mobile}
                            </div>
                          </td>
                        )}
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.punch_in)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.punch_out)}
                          {record.is_auto_punch_out && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Auto</span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.working_hours || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              No attendance records found for this period.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
