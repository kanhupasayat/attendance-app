import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState('password');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  const { login, loginWithOTP, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }

    const checkAdmin = async () => {
      try {
        const response = await authAPI.checkAdmin();
        setAdminExists(response.data.admin_exists);
      } catch (error) {
        console.error('Error checking admin:', error);
      }
    };
    checkAdmin();
  }, [user, navigate]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(mobile, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!mobile) {
      toast.error('Please enter mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.requestOTP({ mobile });
      toast.success('OTP sent to your mobile!');
      // For dev: show OTP in console
      console.log('OTP (dev only):', response.data.otp);
      setOtpSent(true);
    } catch (error) {
      toast.error(error.response?.data?.mobile?.[0] || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginWithOTP(mobile, otp);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.non_field_errors?.[0] || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Welcome!</h1>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            No admin account exists. Please set up the admin account first.
          </p>
          <Link
            to="/admin-setup"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block"
          >
            Setup Admin Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">Login</h1>

        <div className="flex mb-6">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-2 text-sm sm:text-base transition-colors ${
              loginMethod === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            } rounded-l-lg`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('otp')}
            className={`flex-1 py-2 text-sm sm:text-base transition-colors ${
              loginMethod === 'otp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            } rounded-r-lg`}
          >
            OTP
          </button>
        </div>

        {loginMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-2 px-4 rounded-lg disabled:opacity-50 transition-colors text-sm sm:text-base"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Mobile Number
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="flex-1 px-3 py-2.5 sm:py-2 border rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="Enter mobile number"
                  required
                  disabled={otpSent}
                />
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={loading || otpSent}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 sm:py-2 rounded-lg sm:rounded-l-none sm:rounded-r-lg disabled:opacity-50 transition-colors text-sm sm:text-base whitespace-nowrap"
                >
                  {otpSent ? 'Sent' : 'Get OTP'}
                </button>
              </div>
            </div>
            {otpSent && (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-center tracking-widest"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  required
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !otpSent}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-2 px-4 rounded-lg disabled:opacity-50 transition-colors text-sm sm:text-base"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
