import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';

const ProfileRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getAllProfileRequests({ status: statusFilter });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load profile requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleReview = async (action) => {
    if (!selectedRequest) return;

    setReviewing(true);
    try {
      await authAPI.reviewProfileRequest(selectedRequest.id, {
        status: action,
        review_remarks: reviewRemarks,
      });
      toast.success(`Profile update request ${action}`);
      setShowDetailModal(false);
      setSelectedRequest(null);
      setReviewRemarks('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to review request');
    } finally {
      setReviewing(false);
    }
  };

  const openDetailModal = (request) => {
    setSelectedRequest(request);
    setReviewRemarks('');
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const formatFieldName = (field) => {
    const fieldNames = {
      name: 'Name',
      email: 'Email',
      father_name: "Father's Name",
      father_phone: "Father's Phone",
      aadhaar_number: 'Aadhaar',
      aadhaar_photo: 'Aadhaar Photo',
      pan_number: 'PAN',
      pan_photo: 'PAN Photo',
      bank_account_number: 'Bank Account',
      bank_name: 'Bank Name',
      bank_ifsc: 'IFSC',
      address: 'Address',
      photo: 'Photo',
    };
    return fieldNames[field] || field;
  };

  const getChangedFieldsList = (request) => {
    if (!request.changed_fields) return [];
    return request.changed_fields.split(',').map(f => f.trim());
  };

  const maskSensitiveData = (value, type) => {
    if (!value) return '-';
    if (type === 'aadhaar') {
      return `XXXX XXXX ${value.slice(-4)}`;
    }
    if (type === 'pan') {
      return `${value.slice(0, 2)}XXXXX${value.slice(-3)}`;
    }
    if (type === 'bank') {
      return `XXXXXX${value.slice(-4)}`;
    }
    return value;
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                Profile Update Requests
              </h1>
            </div>
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
                        <p className="font-medium text-gray-900 text-sm">{request.user_details?.name}</p>
                        <p className="text-gray-600 text-xs">{request.user_details?.mobile}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                      {formatDateShort(request.created_at)}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {getChangedFieldsList(request).slice(0, 3).map((field, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {formatFieldName(field)}
                        </span>
                      ))}
                      {getChangedFieldsList(request).length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{getChangedFieldsList(request).length - 3} more
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => openDetailModal(request)}
                      className="w-full bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Requested Changes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Submitted On
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.user_details?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.user_details?.mobile}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.user_details?.department} - {request.user_details?.designation}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {getChangedFieldsList(request).map((field, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {formatFieldName(field)}
                              </span>
                            ))}
                          </div>
                          {request.reason && (
                            <p className="text-xs text-gray-500 mt-1">
                              Reason: {request.reason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                          {request.reviewer_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              by {request.reviewer_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openDetailModal(request)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              No profile update requests found.
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold">Request Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-1 sm:ml-2 text-gray-900">{selectedRequest.user_details?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Mobile:</span>
                      <span className="ml-1 sm:ml-2 text-gray-900">{selectedRequest.user_details?.mobile}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Dept:</span>
                      <span className="ml-1 sm:ml-2 text-gray-900">{selectedRequest.user_details?.department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span>
                      <span className="ml-1 sm:ml-2 text-gray-900">{selectedRequest.user_details?.designation || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Requested Changes */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">Requested Changes</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {selectedRequest.requested_name && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Name</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_name}</p>
                      </div>
                    )}

                    {selectedRequest.requested_email && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Email</span>
                        <p className="text-blue-600 text-sm break-all">{selectedRequest.requested_email}</p>
                      </div>
                    )}

                    {selectedRequest.requested_father_name && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Father's Name</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_father_name}</p>
                      </div>
                    )}

                    {selectedRequest.requested_father_phone && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Father's Phone</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_father_phone}</p>
                      </div>
                    )}

                    {selectedRequest.requested_aadhaar_number && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Aadhaar Number</span>
                        <p className="text-blue-600 text-sm">
                          {maskSensitiveData(selectedRequest.requested_aadhaar_number, 'aadhaar')}
                        </p>
                      </div>
                    )}

                    {selectedRequest.requested_pan_number && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">PAN Number</span>
                        <p className="text-blue-600 text-sm">
                          {maskSensitiveData(selectedRequest.requested_pan_number, 'pan')}
                        </p>
                      </div>
                    )}

                    {selectedRequest.requested_bank_account_number && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Bank Account</span>
                        <p className="text-blue-600 text-sm">
                          {maskSensitiveData(selectedRequest.requested_bank_account_number, 'bank')}
                        </p>
                      </div>
                    )}

                    {selectedRequest.requested_bank_name && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Bank Name</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_bank_name}</p>
                      </div>
                    )}

                    {selectedRequest.requested_bank_ifsc && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">IFSC Code</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_bank_ifsc}</p>
                      </div>
                    )}

                    {selectedRequest.requested_address && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Address</span>
                        <p className="text-blue-600 text-sm">{selectedRequest.requested_address}</p>
                      </div>
                    )}

                    {selectedRequest.requested_photo_url && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Profile Photo</span>
                        <img
                          src={selectedRequest.requested_photo_url}
                          alt="Profile"
                          className="mt-2 max-h-32 sm:max-h-48 rounded border"
                        />
                      </div>
                    )}

                    {selectedRequest.requested_aadhaar_photo_url && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Aadhaar Photo</span>
                        <img
                          src={selectedRequest.requested_aadhaar_photo_url}
                          alt="Aadhaar"
                          className="mt-2 max-h-32 sm:max-h-48 rounded border"
                        />
                      </div>
                    )}

                    {selectedRequest.requested_pan_photo_url && (
                      <div className="border rounded-lg p-2 sm:p-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">PAN Card Photo</span>
                        <img
                          src={selectedRequest.requested_pan_photo_url}
                          alt="PAN"
                          className="mt-2 max-h-32 sm:max-h-48 rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason */}
                {selectedRequest.reason && (
                  <div className="bg-yellow-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reason for Update</h3>
                    <p className="text-gray-700 text-sm">{selectedRequest.reason}</p>
                  </div>
                )}

                {/* Review Section - Only for pending requests */}
                {selectedRequest.status === 'pending' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Review Request</h3>
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Remarks (Optional)
                      </label>
                      <textarea
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Add any remarks for this decision..."
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                      <button
                        onClick={() => handleReview('approved')}
                        disabled={reviewing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 sm:py-2 rounded-lg disabled:opacity-50 text-sm"
                      >
                        {reviewing ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        disabled={reviewing}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 sm:py-2 rounded-lg disabled:opacity-50 text-sm"
                      >
                        {reviewing ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Info - For reviewed requests */}
                {selectedRequest.status !== 'pending' && selectedRequest.reviewed_on && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Review Information</h3>
                    <div className="text-xs sm:text-sm space-y-1">
                      <p>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-2">{getStatusBadge(selectedRequest.status)}</span>
                      </p>
                      <p>
                        <span className="text-gray-500">Reviewed by:</span>
                        <span className="ml-2 text-gray-900">{selectedRequest.reviewer_name}</span>
                      </p>
                      <p>
                        <span className="text-gray-500">Reviewed on:</span>
                        <span className="ml-2 text-gray-900">{formatDate(selectedRequest.reviewed_on)}</span>
                      </p>
                      {selectedRequest.review_remarks && (
                        <p>
                          <span className="text-gray-500">Remarks:</span>
                          <span className="ml-2 text-gray-900">{selectedRequest.review_remarks}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-3 sm:py-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProfileRequests;
