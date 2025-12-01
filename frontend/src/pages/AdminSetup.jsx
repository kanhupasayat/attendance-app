import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const AdminSetup = () => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const { adminSignup, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await authAPI.checkAdmin();
        if (response.data.admin_exists) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error checking admin:', error);
      }
    };
    checkAdmin();
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await adminSignup(formData);
      toast.success('Admin account created successfully!');
      navigate('/');
    } catch (error) {
      const errors = error.response?.data;
      if (errors) {
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        toast.error('Failed to create admin account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Admin Setup</h1>
        <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base">
          Create the first admin account for your organization
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Enter mobile number"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Enter email address"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Enter password (min 6 characters)"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Confirm password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-2 px-4 rounded-lg disabled:opacity-50 transition-colors text-sm sm:text-base"
          >
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup;
