import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import Layout from '../components/Layout';

const WFH = () => {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    reason: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = isAdmin
        ? await attendanceAPI.getAllWFH({ status: statusFilter })
        : await attendanceAPI.getMyWFH();
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching WFH requests:', error);
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
      await attendanceAPI.applyWFH(formData);
      toast.success('WFH request submitted!');
      setShowApplyModal(false);
      setFormData({ date: '', reason: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await attendanceAPI.cancelWFH(id);
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
      await attendanceAPI.reviewWFH(id, {
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

  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {isAdmin ? 'All WFH Requests' : 'Work From Home'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isAdmin ? 'Manage employee WFH requests' : 'Request to work from home'}
                </p>
              </div>
              {!isAdmin && (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Apply WFH
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

          {/* Info Box for Employee */}
          {!isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">How WFH Works:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                    <li>Apply for WFH for today or any future date</li>
                    <li>Once approved, you can punch in/out from anywhere</li>
                    <li>Location and WiFi restrictions are bypassed for WFH days</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

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
                        <p className="text-blue-600 font-medium text-sm">{formatDate(request.date)}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <p className="text-xs text-gray-600 mb-2" title={request.reason}>
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
                            <div className="text-xs text-gray-500">
                              {request.user_details?.department}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.date)}
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
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              No WFH requests found.
              {!isAdmin && (
                <p className="text-xs text-gray-400 mt-1">Click "Apply WFH" to request work from home</p>
              )}
            </div>
          )}
        </div>

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Apply for Work From Home
              </h2>
              <form onSubmit={handleApply}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    min={today}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">You can apply for today or future dates</p>
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
                    placeholder="Explain why you need to work from home..."
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setFormData({ date: '', reason: '' });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit Request
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

export default WFH;
