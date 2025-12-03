const PunchErrorModal = ({ error, onClose }) => {
  if (!error) return null;

  // Determine error type and icon
  const getErrorDetails = () => {
    const errorLower = error.toLowerCase();

    // GPS/Location permission errors
    if (errorLower.includes('permission denied') || errorLower.includes('location permission')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        title: 'Location Permission Required',
        message: 'Please allow location access in your browser settings to punch in.',
        tips: [
          'Click the lock icon in address bar',
          'Allow location permission',
          'Refresh and try again'
        ],
        color: 'red'
      };
    }

    // GPS not available
    if (errorLower.includes('gps') || errorLower.includes('enable location') || errorLower.includes('geolocation')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        title: 'GPS Not Available',
        message: 'Please enable GPS/Location on your device.',
        tips: [
          'Turn on Location/GPS in device settings',
          'Make sure you are not in Airplane mode',
          'Try moving to an open area'
        ],
        color: 'orange'
      };
    }

    // Not at office location
    if (errorLower.includes('not within office') || errorLower.includes('office premises') || errorLower.includes('location')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        title: 'Not at Office Location',
        message: 'You are not within the office premises.',
        tips: [
          'Make sure you are inside the office',
          'Check if GPS is giving accurate location',
          'Contact admin if you are at office'
        ],
        color: 'red'
      };
    }

    // Network/Internet errors
    if (errorLower.includes('network') || errorLower.includes('internet') || errorLower.includes('connection') || errorLower.includes('timeout')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ),
        title: 'No Internet Connection',
        message: 'Please check your internet connection and try again.',
        tips: [
          'Check if WiFi/Mobile data is on',
          'Try switching between WiFi and Mobile data',
          'Move to area with better signal'
        ],
        color: 'yellow'
      };
    }

    // Face verification errors
    if (errorLower.includes('face') || errorLower.includes('match') || errorLower.includes('camera')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Face Verification Failed',
        message: 'Your face could not be verified. Please try again.',
        tips: [
          'Make sure your face is clearly visible',
          'Check lighting - avoid dark areas',
          'Remove sunglasses/mask if wearing',
          'Look directly at the camera'
        ],
        color: 'purple'
      };
    }

    // IP not authorized
    if (errorLower.includes('ip') || errorLower.includes('authorized')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        title: 'Network Not Authorized',
        message: 'You are not connected to office network.',
        tips: [
          'Connect to office WiFi',
          'Contact IT if you are on office network'
        ],
        color: 'red'
      };
    }

    // Already punched in
    if (errorLower.includes('already punched')) {
      return {
        icon: (
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Already Punched In',
        message: 'You have already punched in today.',
        tips: [
          'Check your attendance status',
          'You can punch out when leaving'
        ],
        color: 'blue'
      };
    }

    // Default error
    return {
      icon: (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Punch Failed',
      message: error,
      tips: ['Please try again', 'Contact admin if issue persists'],
      color: 'red'
    };
  };

  const details = getErrorDetails();

  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    blue: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`${colorClasses[details.color]} border-b p-6 text-center`}>
          <div className="flex justify-center mb-3">
            {details.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{details.title}</h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 text-center mb-4">{details.message}</p>

          {/* Tips */}
          {details.tips && details.tips.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">How to fix:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {details.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
          >
            OK, Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PunchErrorModal;
