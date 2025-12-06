import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import Layout from '../components/Layout';

const Regularization = () => {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [existingAttendance, setExistingAttendance] = useState(null);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    request_type: '',
    requested_punch_in: '',
    requested_punch_out: '',
    reason: '',
  });

  const requestTypes = [
    { value: 'missed_punch_in', label: 'Missed Punch In' },
    { value: 'missed_punch_out', label: 'Missed Punch Out' },
    { value: 'wrong_punch', label: 'Wrong Punch Time' },
    { value: 'forgot_punch', label: 'Forgot to Punch' },
  ];

  const fetchAttendanceForDate = async (date) => {
    if (!date) return;
    setFetchingAttendance(true);
    try {
      const response = await attendanceAPI.getMyAttendance({
        start_date: date,
        end_date: date
      });
      const attendance = response.data.length > 0 ? response.data[0] : null;
      setExistingAttendance(attendance);

      if (attendance) {
        const punchIn = attendance.punch_in
          ? new Date(attendance.punch_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';
        const punchOut = attendance.punch_out
          ? new Date(attendance.punch_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';

        setFormData(prev => ({
          ...prev,
          requested_punch_in: punchIn,
          requested_punch_out: punchOut
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          requested_punch_in: '',
          requested_punch_out: ''
        }));
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setExistingAttendance(null);
    } finally {
      setFetchingAttendance(false);
    }
  };

  const handleDateChange = (newValue) => {
    const newDate = newValue ? newValue.format('YYYY-MM-DD') : '';
    setFormData(prev => ({ ...prev, date: newDate }));
    if (newDate) {
      fetchAttendanceForDate(newDate);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = isAdmin
        ? await attendanceAPI.getAllRegularizations({ status: statusFilter })
        : await attendanceAPI.getMyRegularizations();
      // Handle paginated response
      const data = response.data?.results || response.data;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching regularizations:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin, statusFilter]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      // Convert empty strings to null for time fields
      const dataToSend = {
        ...formData,
        requested_punch_in: formData.requested_punch_in || null,
        requested_punch_out: formData.requested_punch_out || null,
      };
      await attendanceAPI.applyRegularization(dataToSend);
      toast.success('Regularization request submitted!');
      setShowApplyModal(false);
      setExistingAttendance(null);
      setFormData({
        date: '',
        request_type: '',
        requested_punch_in: '',
        requested_punch_out: '',
        reason: '',
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await attendanceAPI.cancelRegularization(id);
        toast.success('Request cancelled');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to cancel');
      }
    }
  };

  const handleReview = async (id, status) => {
    const remarks = window.prompt('Add remarks (optional):');
    try {
      await attendanceAPI.reviewRegularization(id, {
        status,
        review_remarks: remarks || '',
      });
      toast.success(`Request ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to review');
    }
  };

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

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getRequestTypeLabel = (type) => {
    const found = requestTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isAdmin ? 'All Regularization Requests' : 'My Regularization Requests'}
              </h1>
              {!isAdmin && (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base transition-colors"
                >
                  Apply Regularization
                </button>
              )}
            </div>

            {isAdmin && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : requests.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {isAdmin && (
                          <p className="font-medium text-gray-900 text-sm">{request.user_details?.name}</p>
                        )}
                        <p className="text-gray-600 text-xs">{formatDate(request.date)}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <p className="text-blue-600 font-medium text-sm mb-2">
                      {getRequestTypeLabel(request.request_type)}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white rounded p-2 border">
                        <p className="text-gray-500">Punch In</p>
                        <p className="font-medium text-green-600">{formatTime(request.requested_punch_in)}</p>
                      </div>
                      <div className="bg-white rounded p-2 border">
                        <p className="text-gray-500">Punch Out</p>
                        <p className="font-medium text-red-600">{formatTime(request.requested_punch_out)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 truncate mb-2" title={request.reason}>
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>

                    {request.review_remarks && (
                      <p className="text-xs text-blue-600 mb-2">
                        <span className="font-medium">Remarks:</span> {request.review_remarks}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {isAdmin && request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(request.id, 'approved')}
                            className="flex-1 bg-green-100 text-green-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(request.id, 'rejected')}
                            className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {!isAdmin && request.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isAdmin && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Employee
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Punch In
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Punch Out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        {isAdmin && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {request.user_details?.name}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getRequestTypeLabel(request.request_type)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(request.requested_punch_in)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(request.requested_punch_out)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={request.reason}>
                            {request.reason}
                          </div>
                          {request.review_remarks && (
                            <div className="text-xs text-blue-600 mt-1">
                              Remarks: {request.review_remarks}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {isAdmin && request.status === 'pending' && (
                            <div className="space-x-2">
                              <button
                                onClick={() => handleReview(request.id, 'approved')}
                                className="text-green-600 hover:text-green-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(request.id, 'rejected')}
                                className="text-red-600 hover:text-red-800"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {!isAdmin && request.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              No regularization requests found.
            </div>
          )}
        </div>

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Apply for Regularization</h2>
              <form onSubmit={handleApply}>
                <div className="mb-4">
                  <DatePicker
                    label="Date"
                    value={formData.date ? dayjs(formData.date) : null}
                    onChange={handleDateChange}
                    maxDate={dayjs(today)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                  {fetchingAttendance && (
                    <p className="text-xs text-gray-500 mt-1">Loading attendance...</p>
                  )}
                  {existingAttendance && !fetchingAttendance && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <p className="font-medium">Existing attendance found:</p>
                      <p>Punch In: {existingAttendance.punch_in ? new Date(existingAttendance.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded'}</p>
                      <p>Punch Out: {existingAttendance.punch_out ? new Date(existingAttendance.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded'}</p>
                    </div>
                  )}
                  {formData.date && !existingAttendance && !fetchingAttendance && (
                    <p className="text-xs text-yellow-600 mt-1">No attendance record found for this date</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Type
                  </label>
                  <select
                    value={formData.request_type}
                    onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  >
                    <option value="">Select Type</option>
                    {requestTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Punch In Time
                    </label>
                    <input
                      type="time"
                      value={formData.requested_punch_in}
                      onChange={(e) => setFormData({ ...formData, requested_punch_in: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Punch Out Time
                    </label>
                    <input
                      type="time"
                      value={formData.requested_punch_out}
                      onChange={(e) => setFormData({ ...formData, requested_punch_out: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-base"
                    rows="3"
                    placeholder="Explain why you need this regularization..."
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setExistingAttendance(null);
                      setFormData({
                        date: '',
                        request_type: '',
                        requested_punch_in: '',
                        requested_punch_out: '',
                        reason: '',
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit
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

export default Regularization;
