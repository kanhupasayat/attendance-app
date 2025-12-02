import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../services/api';
import Layout from '../components/Layout';

const Leaves = () => {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    half_day_type: '',
    reason: '',
  });
  const [editFormData, setEditFormData] = useState({
    status: '',
    paid_days: 0,
    lop_days: 0,
    review_remarks: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, typesRes] = await Promise.all([
        isAdmin
          ? leaveAPI.getAllRequests({ status: statusFilter })
          : leaveAPI.getMyRequests(),
        leaveAPI.getTypes(),
      ]);
      setRequests(requestsRes.data);
      setLeaveTypes(typesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      await leaveAPI.applyLeave(formData);
      toast.success('Leave request submitted!');
      setShowApplyModal(false);
      setFormData({
        leave_type: '',
        start_date: '',
        end_date: '',
        is_half_day: false,
        half_day_type: '',
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
        await leaveAPI.cancelRequest(id);
        toast.success('Leave request cancelled');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to cancel');
      }
    }
  };

  const handleReview = async (id, status) => {
    const remarks = window.prompt('Add remarks (optional):');
    try {
      await leaveAPI.reviewRequest(id, { status, remarks: remarks || '' });
      toast.success(`Leave request ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to review');
    }
  };

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setEditFormData({
      status: request.status,
      paid_days: request.paid_days || 0,
      lop_days: request.lop_days || 0,
      review_remarks: request.review_remarks || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await leaveAPI.updateRequest(editingRequest.id, editFormData);
      toast.success('Leave request updated!');
      setShowEditModal(false);
      setEditingRequest(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update');
    } finally {
      setEditLoading(false);
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

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isAdmin ? 'All Leave Requests' : 'My Leave Requests'}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/leave-history"
                  className="flex-1 sm:flex-none text-center bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  History
                </Link>
                {!isAdmin && (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Apply Leave
                  </button>
                )}
              </div>
            </div>

            {/* Filter */}
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
                        <p className="text-blue-600 font-medium text-sm">
                          {request.leave_type_details?.code}
                          {request.is_lop && <span className="text-red-500 ml-1">(LOP)</span>}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="text-xs text-gray-600 mb-2">
                      <span>{formatDateShort(request.start_date)}</span>
                      <span className="mx-1">-</span>
                      <span>{formatDateShort(request.end_date)}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                      <div className="text-center bg-white rounded p-1.5 border">
                        <p className="text-gray-500">Total</p>
                        <p className="font-medium">{request.total_days}{request.is_half_day && ' (H)'}</p>
                      </div>
                      <div className="text-center bg-white rounded p-1.5 border">
                        <p className="text-gray-500">CompOff</p>
                        <p className="font-medium text-purple-600">{request.comp_off_days || 0}</p>
                      </div>
                      <div className="text-center bg-white rounded p-1.5 border">
                        <p className="text-gray-500">Paid</p>
                        <p className="font-medium text-green-600">{request.paid_days || 0}</p>
                      </div>
                      <div className="text-center bg-white rounded p-1.5 border">
                        <p className="text-gray-500">LOP</p>
                        <p className="font-medium text-red-600">{request.lop_days || 0}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 truncate mb-3" title={request.reason}>
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>

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
                      {isAdmin && (
                        <button
                          onClick={() => handleEditClick(request)}
                          className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200"
                        >
                          Edit
                        </button>
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
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        From
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CompOff
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Paid
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        LOP
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {request.leave_type_details?.code}
                          </div>
                          {request.is_lop && (
                            <span className="text-xs text-red-500">LOP</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.start_date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.end_date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.total_days}
                          {request.is_half_day && ' (Half)'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                          {request.comp_off_days || 0}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {request.paid_days || 0}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {request.lop_days || 0}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={request.reason}>
                            {request.reason}
                          </div>
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
                          {isAdmin && (
                            <button
                              onClick={() => handleEditClick(request)}
                              className="text-blue-600 hover:text-blue-800 ml-2"
                            >
                              Edit
                            </button>
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
              No leave requests found.
            </div>
          )}
        </div>

        {/* Apply Leave Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Apply for Leave</h2>
              <form onSubmit={handleApply}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  >
                    <option value="">Select Type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_half_day}
                      onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Half Day</span>
                  </label>
                </div>
                {formData.is_half_day && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Half Day Type
                    </label>
                    <select
                      value={formData.half_day_type}
                      onChange={(e) => setFormData({ ...formData, half_day_type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    >
                      <option value="">Select</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-base"
                    rows="3"
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
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

        {/* Edit Leave Request Modal (Admin) */}
        {showEditModal && editingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Leave Request</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-600 mb-1">
                  <span className="font-semibold">Employee:</span> {editingRequest.user_details?.name}
                </p>
                <p className="text-gray-600 mb-1">
                  <span className="font-semibold">Type:</span> {editingRequest.leave_type_details?.name}
                </p>
                <p className="text-gray-600 mb-1">
                  <span className="font-semibold">Period:</span> {formatDateShort(editingRequest.start_date)} - {formatDateShort(editingRequest.end_date)}
                </p>
                <p className="text-gray-600 mb-1">
                  <span className="font-semibold">Total:</span> {editingRequest.total_days} days
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Reason:</span> {editingRequest.reason}
                </p>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Days
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editFormData.paid_days}
                      onChange={(e) => setEditFormData({ ...editFormData, paid_days: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LOP Days
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editFormData.lop_days}
                      onChange={(e) => setEditFormData({ ...editFormData, lop_days: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Remarks
                  </label>
                  <textarea
                    value={editFormData.review_remarks}
                    onChange={(e) => setEditFormData({ ...editFormData, review_remarks: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-base"
                    rows="3"
                    placeholder="Add remarks..."
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRequest(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {editLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
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

export default Leaves;
