import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../services/api';
import Layout from '../components/Layout';

const LeaveHistory = () => {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    year: new Date().getFullYear(),
    month: '',
    status: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    cancelled: 0,
    totalDays: 0,
    compOffDays: 0,
    paidDays: 0,
    lopDays: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.year) params.year = filter.year;
      if (filter.month) params.month = filter.month;
      if (filter.status) params.status = filter.status;

      const response = isAdmin
        ? await leaveAPI.getAllRequests(params)
        : await leaveAPI.getMyRequests();

      let data = response.data;

      if (!isAdmin) {
        if (filter.year) {
          data = data.filter(r => new Date(r.start_date).getFullYear() === parseInt(filter.year));
        }
        if (filter.month) {
          data = data.filter(r => new Date(r.start_date).getMonth() + 1 === parseInt(filter.month));
        }
        if (filter.status) {
          data = data.filter(r => r.status === filter.status);
        }
      }

      setRequests(data);

      const approvedRequests = data.filter(r => r.status === 'approved');
      const newStats = {
        total: data.length,
        approved: approvedRequests.length,
        rejected: data.filter(r => r.status === 'rejected').length,
        pending: data.filter(r => r.status === 'pending').length,
        cancelled: data.filter(r => r.status === 'cancelled').length,
        totalDays: approvedRequests.reduce((sum, r) => sum + parseFloat(r.total_days || 0), 0),
        compOffDays: approvedRequests.reduce((sum, r) => sum + parseFloat(r.comp_off_days || 0), 0),
        paidDays: approvedRequests.reduce((sum, r) => sum + parseFloat(r.paid_days || 0), 0),
        lopDays: approvedRequests.reduce((sum, r) => sum + parseFloat(r.lop_days || 0), 0),
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filter, isAdmin]);

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

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const groupByMonth = (requests) => {
    const grouped = {};
    requests.forEach(request => {
      const date = new Date(request.start_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[date.getMonth()]} ${date.getFullYear()}`;
      if (!grouped[key]) {
        grouped[key] = { label, requests: [] };
      }
      grouped[key].requests.push(request);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const groupedRequests = groupByMonth(requests);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
            Leave History
          </h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              value={filter.year}
              onChange={(e) => setFilter({ ...filter, year: e.target.value })}
              className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: e.target.value })}
              className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Months</option>
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs text-gray-500">Total Requests</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md p-3 sm:p-4 border border-green-200">
            <p className="text-xs text-green-600">Approved</p>
            <p className="text-lg sm:text-2xl font-bold text-green-800">{stats.approved}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-md p-3 sm:p-4 border border-yellow-200">
            <p className="text-xs text-yellow-600">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-800">{stats.pending}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-200">
            <p className="text-xs text-red-600">Rejected</p>
            <p className="text-lg sm:text-2xl font-bold text-red-800">{stats.rejected}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Cancelled</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.cancelled}</p>
          </div>
        </div>

        {/* Days Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-200">
            <p className="text-xs text-blue-600">Total Days</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-800">{stats.totalDays}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-md p-3 sm:p-4 border border-purple-200">
            <p className="text-xs text-purple-600">Comp Off Used</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-800">{stats.compOffDays}</p>
          </div>
          <div className="bg-teal-50 rounded-lg shadow-md p-3 sm:p-4 border border-teal-200">
            <p className="text-xs text-teal-600">Paid Leaves</p>
            <p className="text-lg sm:text-2xl font-bold text-teal-800">{stats.paidDays}</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-md p-3 sm:p-4 border border-orange-200">
            <p className="text-xs text-orange-600">LOP Days</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-800">{stats.lopDays}</p>
          </div>
        </div>

        {/* Timeline View */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : groupedRequests.length > 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {groupedRequests.map(([key, { label, requests }]) => (
              <div key={key} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3 border-b">
                  <h3 className="font-semibold text-gray-700 text-sm sm:text-base">{label}</h3>
                </div>
                <div className="divide-y">
                  {requests.map((request) => (
                    <div key={request.id} className="p-3 sm:p-4 hover:bg-gray-50">
                      {/* Mobile Layout */}
                      <div className="block sm:hidden">
                        <div className="flex items-center justify-between mb-2">
                          {getStatusBadge(request.status)}
                          <span className="text-xs text-gray-400">
                            {formatDateShort(request.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800 text-sm">
                            {request.leave_type_details?.name}
                          </span>
                          {isAdmin && (
                            <span className="text-xs text-gray-500">
                              - {request.user_details?.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {formatDateShort(request.start_date)}
                          {request.start_date !== request.end_date && (
                            <> - {formatDateShort(request.end_date)}</>
                          )}
                          {request.is_half_day && ' (Half)'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mb-2">
                          {request.reason}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-gray-600">Total: <span className="font-medium">{request.total_days}</span></span>
                          {request.status === 'approved' && (
                            <>
                              {parseFloat(request.comp_off_days) > 0 && (
                                <span className="text-purple-600">CompOff: {request.comp_off_days}</span>
                              )}
                              <span className="text-green-600">Paid: {request.paid_days || 0}</span>
                              {parseFloat(request.lop_days) > 0 && (
                                <span className="text-red-600">LOP: {request.lop_days}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusBadge(request.status)}
                            <span className="font-medium text-gray-800">
                              {request.leave_type_details?.name}
                            </span>
                            {isAdmin && (
                              <span className="text-sm text-gray-500">
                                - {request.user_details?.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(request.start_date)}
                            {request.start_date !== request.end_date && (
                              <> to {formatDate(request.end_date)}</>
                            )}
                            {request.is_half_day && ' (Half Day)'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {request.reason}
                          </p>
                          {request.review_remarks && (
                            <p className="text-sm text-blue-600 mt-1">
                              Remarks: {request.review_remarks}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 md:mt-0 md:text-right">
                          <div className="flex items-center space-x-4 text-sm">
                            <div>
                              <span className="text-gray-500">Total: </span>
                              <span className="font-medium">{request.total_days} days</span>
                            </div>
                            {request.status === 'approved' && (
                              <>
                                {parseFloat(request.comp_off_days) > 0 && (
                                  <div className="text-purple-600">
                                    CompOff: {request.comp_off_days}
                                  </div>
                                )}
                                <div className="text-green-600">
                                  Paid: {request.paid_days || 0}
                                </div>
                                {parseFloat(request.lop_days) > 0 && (
                                  <div className="text-red-600">
                                    LOP: {request.lop_days}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Applied on {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
            No leave history found for the selected filters.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeaveHistory;
