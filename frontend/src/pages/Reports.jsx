import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { attendanceAPI, leaveAPI } from '../services/api';
import Layout from '../components/Layout';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [leaveReport, setLeaveReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);
  const [editBalanceData, setEditBalanceData] = useState({
    total_leaves: 0,
    used_leaves: 0,
    carried_forward: 0,
    lop_days: 0,
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const response = await attendanceAPI.getReport({ month, year });
        // Handle paginated response
        const data = response.data?.results || response.data;
        setAttendanceReport(Array.isArray(data) ? data : []);
      } else {
        const response = await leaveAPI.getAllBalances({ year });
        // Handle paginated response
        const data = response.data?.results || response.data;
        setLeaveReport(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setAttendanceReport([]);
      setLeaveReport([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, month, year]);

  const handleExportAttendance = async () => {
    try {
      const response = await attendanceAPI.exportCSV({ month, year });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${year}_${month}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportLeave = async () => {
    try {
      const response = await leaveAPI.exportCSV({ year });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave_report_${year}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleInitializeBalances = async () => {
    if (window.confirm(`Initialize leave balances for ${year}?`)) {
      try {
        const response = await leaveAPI.initializeBalances({ year });
        toast.success(response.data.message);
        fetchReports();
      } catch (error) {
        toast.error('Failed to initialize balances');
      }
    }
  };

  const handleEditBalanceClick = (balance) => {
    setEditingBalance(balance);
    setEditBalanceData({
      total_leaves: balance.total_leaves || 0,
      used_leaves: balance.used_leaves || 0,
      carried_forward: balance.carried_forward || 0,
      lop_days: balance.lop_days || 0,
    });
    setShowEditBalanceModal(true);
  };

  const handleEditBalanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.updateBalance(editingBalance.id, editBalanceData);
      toast.success('Leave balance updated!');
      setShowEditBalanceModal(false);
      setEditingBalance(null);
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update balance');
    }
  };

  const handleNewYearReset = async () => {
    if (window.confirm(`Reset leave balances for ${year} (carry forward from ${year - 1})?`)) {
      try {
        const response = await leaveAPI.newYearReset({ year });
        toast.success(response.data.message);
        fetchReports();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to reset balances');
      }
    }
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reports</h1>
            <div className="flex flex-wrap gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-4 sm:mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap text-sm ${
                activeTab === 'attendance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap text-sm ${
                activeTab === 'leave'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Leave Balances
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mb-4">
            {activeTab === 'attendance' ? (
              <button
                onClick={handleExportAttendance}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Export CSV
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportLeave}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleInitializeBalances}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Initialize
                </button>
                <button
                  onClick={handleNewYearReset}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  New Year Reset
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'attendance' ? (
            /* Attendance Report */
            attendanceReport.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {attendanceReport.map((record, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium text-gray-900 text-sm mb-2">{record.user_name}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center bg-white rounded p-2 border">
                          <p className="text-gray-500">Present</p>
                          <p className="font-semibold text-green-600">{record.total_present}</p>
                        </div>
                        <div className="text-center bg-white rounded p-2 border">
                          <p className="text-gray-500">Absent</p>
                          <p className="font-semibold text-red-600">{record.total_absent}</p>
                        </div>
                        <div className="text-center bg-white rounded p-2 border">
                          <p className="text-gray-500">Half Day</p>
                          <p className="font-semibold text-yellow-600">{record.total_half_day}</p>
                        </div>
                        <div className="text-center bg-white rounded p-2 border">
                          <p className="text-gray-500">On Leave</p>
                          <p className="font-semibold text-blue-600">{record.total_on_leave}</p>
                        </div>
                        <div className="text-center bg-white rounded p-2 border col-span-2">
                          <p className="text-gray-500">Total Hours</p>
                          <p className="font-semibold text-gray-800">{record.total_working_hours} hrs</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Half Day</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">On Leave</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceReport.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.user_name}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {record.total_present}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {record.total_absent}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">
                            {record.total_half_day}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                            {record.total_on_leave}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.total_working_hours} hrs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No attendance data for this period.
              </div>
            )
          ) : (
            /* Leave Balance Report */
            leaveReport.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {leaveReport.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{record.user_details?.name || record.user}</p>
                          <p className="text-xs text-gray-500">{record.leave_type_details?.code || 'N/A'}</p>
                        </div>
                        <button
                          onClick={() => handleEditBalanceClick(record)}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium hover:bg-blue-200"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="text-center bg-white rounded p-1.5 border">
                          <p className="text-gray-500">Total</p>
                          <p className="font-semibold">{record.total_leaves}</p>
                        </div>
                        <div className="text-center bg-white rounded p-1.5 border">
                          <p className="text-gray-500">Used</p>
                          <p className="font-semibold text-orange-600">{record.used_leaves}</p>
                        </div>
                        <div className="text-center bg-white rounded p-1.5 border">
                          <p className="text-gray-500">Avail</p>
                          <p className="font-semibold text-green-600">{record.available_leaves}</p>
                        </div>
                        <div className="text-center bg-white rounded p-1.5 border">
                          <p className="text-gray-500">LOP</p>
                          <p className="font-semibold text-red-600">{record.lop_days}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CF</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LOP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaveReport.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.user_details?.name || record.user}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.leave_type_details?.code || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.total_leaves}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold">
                            {record.used_leaves}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                            {record.carried_forward}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {record.available_leaves}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {record.lop_days}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleEditBalanceClick(record)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No leave balance data for this year. Click "Initialize" to create.
              </div>
            )
          )}
        </div>

        {/* Edit Leave Balance Modal */}
        {showEditBalanceModal && editingBalance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Leave Balance</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs sm:text-sm">
                <p className="text-gray-600">
                  <span className="font-semibold">Employee:</span> {editingBalance.user_details?.name || editingBalance.user}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Leave Type:</span> {editingBalance.leave_type_details?.name || editingBalance.leave_type_details?.code}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Year:</span> {editingBalance.year}
                </p>
              </div>
              <form onSubmit={handleEditBalanceSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Total Leaves
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editBalanceData.total_leaves}
                      onChange={(e) => setEditBalanceData({ ...editBalanceData, total_leaves: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Used Leaves
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editBalanceData.used_leaves}
                      onChange={(e) => setEditBalanceData({ ...editBalanceData, used_leaves: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Carried Forward
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editBalanceData.carried_forward}
                      onChange={(e) => setEditBalanceData({ ...editBalanceData, carried_forward: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      LOP Days
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editBalanceData.lop_days}
                      onChange={(e) => setEditBalanceData({ ...editBalanceData, lop_days: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Available Leaves:</span>{' '}
                    {(parseFloat(editBalanceData.total_leaves) + parseFloat(editBalanceData.carried_forward) - parseFloat(editBalanceData.used_leaves)).toFixed(1)}
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBalanceModal(false);
                      setEditingBalance(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
