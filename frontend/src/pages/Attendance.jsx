import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';

const Attendance = () => {
  const { isAdmin } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Admin modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    punch_in: '',
    punch_out: '',
    status: 'present',
    notes: '',
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      const api = isAdmin ? attendanceAPI.getAllAttendance : attendanceAPI.getMyAttendance;
      const response = await api(params);
      // Handle paginated response
      const data = response.data?.results || response.data;
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (isAdmin) {
      try {
        const response = await authAPI.getEmployees();
        // Handle paginated response
        const data = response.data?.results || response.data;
        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      }
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, [month, year, isAdmin]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

  // Admin functions
  const openAddModal = async () => {
    setModalMode('add');
    setEditingRecord(null);
    // Fetch fresh employees list
    await fetchEmployees();
    setFormData({
      user_id: '',
      date: new Date().toISOString().split('T')[0],
      punch_in: '',
      punch_out: '',
      status: 'present',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setModalMode('edit');
    setEditingRecord(record);

    // Extract time from datetime
    const punchInTime = record.punch_in ? new Date(record.punch_in).toTimeString().slice(0, 5) : '';
    const punchOutTime = record.punch_out ? new Date(record.punch_out).toTimeString().slice(0, 5) : '';

    setFormData({
      user_id: record.user,
      date: record.date,
      punch_in: punchInTime,
      punch_out: punchOutTime,
      status: record.status,
      notes: '',
    });
    setShowModal(true);
  };

  const handleMarkAbsent = async (record) => {
    if (!confirm(`Mark ${record.user_details?.name} as absent on ${formatDate(record.date)}?`)) {
      return;
    }

    try {
      await attendanceAPI.adminMarkAbsent({
        user_id: record.user,
        date: record.date,
        notes: 'Marked absent by admin'
      });
      toast.success('Marked as absent');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to mark absent');
    }
  };

  const handleClearPunchOut = async (record) => {
    if (!confirm(`Clear punch out for ${record.user_details?.name}?\n\nThis will allow the employee to punch out again.`)) {
      return;
    }

    try {
      await attendanceAPI.adminClearPunchOut(record.id);
      toast.success('Punch out cleared. Employee can now punch out again.');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clear punch out');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === 'add') {
        await attendanceAPI.adminAddAttendance({
          user_id: parseInt(formData.user_id),
          date: formData.date,
          punch_in: formData.punch_in || null,
          punch_out: formData.punch_out || null,
          status: formData.status,
          notes: formData.notes,
        });
        toast.success('Attendance added successfully');
      } else {
        await attendanceAPI.adminUpdateAttendance(editingRecord.id, {
          punch_in: formData.punch_in || null,
          punch_out: formData.punch_out || null,
          status: formData.status,
          notes: formData.notes,
        });
        toast.success('Attendance updated successfully');
      }

      setShowModal(false);
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

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
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={openAddModal}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-center text-sm sm:text-base transition-colors"
                  >
                    + Add Attendance
                  </button>
                )}
                <Link
                  to="/regularization"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-center text-sm sm:text-base transition-colors"
                >
                  Regularization
                </Link>
              </div>
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
                      <div className="flex items-center gap-2">
                        {getStatusBadge(record.status, true)}
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(record)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">In</p>
                        <p className="font-medium text-green-600">
                          {formatTime(record.punch_in)}
                          {record.face_verified && (
                            <span className="ml-1 text-green-500" title="Face Verified">
                              <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </p>
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
                    {isAdmin && (
                      <div className="mt-2 flex gap-3">
                        {record.status !== 'absent' && (
                          <button
                            onClick={() => handleMarkAbsent(record)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Mark Absent
                          </button>
                        )}
                        {record.punch_out && (
                          <button
                            onClick={() => handleClearPunchOut(record)}
                            className="text-xs text-orange-600 hover:text-orange-800"
                          >
                            Clear Punch Out
                          </button>
                        )}
                      </div>
                    )}
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
                      {isAdmin && (
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
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
                          {record.face_verified && (
                            <span className="ml-1 text-green-500" title="Face Verified">
                              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
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
                        {isAdmin && (
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(record)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            {record.status !== 'absent' && (
                              <button
                                onClick={() => handleMarkAbsent(record)}
                                className="text-red-600 hover:text-red-800 mr-3"
                              >
                                Absent
                              </button>
                            )}
                            {record.punch_out && (
                              <button
                                onClick={() => handleClearPunchOut(record)}
                                className="text-orange-600 hover:text-orange-800"
                                title="Clear punch out so employee can punch out again"
                              >
                                Clear Out
                              </button>
                            )}
                          </td>
                        )}
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

      {/* Admin Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'add' ? 'Add Attendance' : 'Edit Attendance'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee *
                  </label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {Array.isArray(employees) && employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalMode === 'edit' && (
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Employee</p>
                  <p className="font-medium">{editingRecord?.user_details?.name}</p>
                  <p className="text-sm text-gray-500">{editingRecord?.date}</p>
                </div>
              )}

              {modalMode === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Punch In
                  </label>
                  <input
                    type="time"
                    value={formData.punch_in}
                    onChange={(e) => setFormData({ ...formData, punch_in: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Punch Out
                  </label>
                  <input
                    type="time"
                    value={formData.punch_out}
                    onChange={(e) => setFormData({ ...formData, punch_out: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (modalMode === 'add' ? 'Add' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Attendance;
