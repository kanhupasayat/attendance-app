import { useState } from 'react';
import toast from 'react-hot-toast';
import { attendanceAPI, leaveAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext';
import FaceVerification from './FaceVerification';
import PunchErrorModal from './PunchErrorModal';

const PunchButton = ({ type, onSuccess, disabled }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [leaveInfo, setLeaveInfo] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);
  const { getLocation } = useGeolocation();

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const performPunchIn = async (coords, faceVerified = false) => {
    const api = type === 'in' ? attendanceAPI.punchIn : attendanceAPI.punchOut;
    await api({ ...coords, face_verified: faceVerified });
    toast.success(`Punch ${type} successful!`);
    onSuccess?.();
  };

  const handlePunch = async () => {
    setLoading(true);

    try {
      // Location is mandatory - get it first
      let coords;
      try {
        coords = await getLocation();
      } catch (geoError) {
        showError(geoError || 'Location access is required. Please enable location permission.');
        setLoading(false);
        return;
      }

      if (!coords || !coords.latitude || !coords.longitude) {
        showError('Unable to get your location. Please enable GPS and try again.');
        setLoading(false);
        return;
      }

      // For punch IN, check if user has approved leave for today
      if (type === 'in') {
        const leaveResponse = await leaveAPI.checkTodayLeave();

        if (leaveResponse.data.has_leave) {
          // Store coords and show confirmation modal
          setPendingCoords(coords);
          setLeaveInfo(leaveResponse.data);
          setShowLeaveModal(true);
          setLoading(false);
          return;
        }
      }

      // Check if face verification is required (only for punch IN and if user has face_descriptor)
      if (type === 'in' && user?.face_descriptor) {
        setPendingCoords(coords);
        setShowFaceVerification(true);
        setLoading(false);
        return;
      }

      // No face verification required, proceed with punch
      await performPunchIn(coords, false);
    } catch (error) {
      const message = error.response?.data?.error ||
        (error.message?.includes('Network') ? 'No internet connection. Please check your network.' : `Failed to punch ${type}`);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceVerificationSuccess = async (result) => {
    setShowFaceVerification(false);
    setLoading(true);
    try {
      await performPunchIn(pendingCoords, true);
    } catch (error) {
      const message = error.response?.data?.error ||
        (error.message?.includes('Network') ? 'No internet connection. Please check your network.' : `Failed to punch ${type}`);
      showError(message);
    } finally {
      setLoading(false);
      setPendingCoords(null);
    }
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
    setPendingCoords(null);
  };

  const handleFaceVerificationError = (errMsg) => {
    setShowFaceVerification(false);
    setPendingCoords(null);
    showError(errMsg || 'Face verification failed');
  };

  const handleCancelLeaveAndPunch = async () => {
    setLoading(true);
    try {
      // Cancel leave for today
      const today = new Date().toISOString().split('T')[0];
      await leaveAPI.cancelLeaveForDate({ date: today, leave_id: leaveInfo.leave_id });
      toast.success('Leave cancelled for today');

      // Now punch in with the stored coordinates
      await performPunchIn(pendingCoords);

      // Close modal
      setShowLeaveModal(false);
      setLeaveInfo(null);
      setPendingCoords(null);
    } catch (error) {
      const message = error.response?.data?.error ||
        (error.message?.includes('Network') ? 'No internet connection. Please check your network.' : 'Failed to cancel leave');
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowLeaveModal(false);
    setLeaveInfo(null);
    setPendingCoords(null);
  };

  const buttonClass = type === 'in'
    ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
    : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300';

  return (
    <>
      <button
        onClick={handlePunch}
        disabled={loading || disabled}
        className={`${buttonClass} text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors disabled:cursor-not-allowed`}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Punch ${type === 'in' ? 'IN' : 'OUT'}`
        )}
      </button>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && leaveInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Leave Alert</h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-3">{leaveInfo.message}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Leave Type:</span> {leaveInfo.leave_type}
                </p>
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Period:</span> {new Date(leaveInfo.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(leaveInfo.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Do you want to cancel your leave for today and punch in?
            </p>

            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                No, Keep Leave
              </button>
              <button
                onClick={handleCancelLeaveAndPunch}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Yes, Cancel Leave & Punch In'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Face Verification Modal */}
      {showFaceVerification && user?.face_descriptor && (
        <FaceVerification
          userFaceDescriptor={user.face_descriptor}
          onSuccess={handleFaceVerificationSuccess}
          onCancel={handleFaceVerificationCancel}
          onError={handleFaceVerificationError}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <PunchErrorModal
          error={errorMessage}
          onClose={() => {
            setShowErrorModal(false);
            setErrorMessage('');
          }}
        />
      )}
    </>
  );
};

export default PunchButton;
