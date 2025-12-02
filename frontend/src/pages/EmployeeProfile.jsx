import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI, attendanceAPI } from '../services/api';
import Layout from '../components/Layout';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch employee details
      const empResponse = await authAPI.getEmployee(id);
      setEmployee(empResponse.data);

      // Fetch attendance stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const attendanceResponse = await attendanceAPI.getAllAttendance({
        month: currentMonth,
        year: currentYear
      });

      const employeeAttendance = attendanceResponse.data.filter(
        (a) => a.user === parseInt(id)
      );

      const presentDays = employeeAttendance.filter(a => a.status === 'present').length;
      const absentDays = employeeAttendance.filter(a => a.status === 'absent').length;
      const halfDays = employeeAttendance.filter(a => a.status === 'half_day').length;
      const onLeave = employeeAttendance.filter(a => a.status === 'on_leave').length;
      const totalHours = employeeAttendance.reduce((sum, a) => sum + (parseFloat(a.working_hours) || 0), 0);

      setStats({
        presentDays,
        absentDays,
        halfDays,
        onLeave,
        totalHours: totalHours.toFixed(1)
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const maskAadhaar = (num) => {
    if (!num || num.length < 4) return num || '-';
    return 'XXXX-XXXX-' + num.slice(-4);
  };

  const maskAccount = (num) => {
    if (!num || num.length < 4) return num || '-';
    return 'XXXX' + num.slice(-4);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Employee not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Employees
        </button>

        {/* Profile Header Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Profile Photo */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-4xl sm:text-5xl font-bold text-white">
                  {employee.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{employee.name}</h1>
              <p className="text-lg text-gray-600">{employee.designation || 'Employee'}</p>
              <p className="text-gray-500">{employee.department || 'No Department'}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {employee.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Weekly Off: {employee.weekly_off_display}
                </span>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                Joined: {new Date(employee.date_joined).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* This Month Stats */}
        {stats && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              This Month's Attendance ({new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <p className="text-3xl font-bold text-green-600">{stats.presentDays}</p>
                <p className="text-sm text-green-700">Present</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                <p className="text-3xl font-bold text-red-600">{stats.absentDays}</p>
                <p className="text-sm text-red-700">Absent</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                <p className="text-3xl font-bold text-yellow-600">{stats.halfDays}</p>
                <p className="text-sm text-yellow-700">Half Day</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{stats.onLeave}</p>
                <p className="text-sm text-blue-700">On Leave</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200 col-span-2 sm:col-span-1">
                <p className="text-3xl font-bold text-purple-600">{stats.totalHours}</p>
                <p className="text-sm text-purple-700">Total Hours</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'bank', label: 'Bank Details' },
              { id: 'documents', label: 'Documents' },
              { id: 'family', label: 'Family' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Full Name" value={employee.name} />
                <InfoItem label="Mobile Number" value={employee.mobile} />
                <InfoItem label="Email" value={employee.email} />
                <InfoItem label="Department" value={employee.department} />
                <InfoItem label="Designation" value={employee.designation} />
                <InfoItem label="Weekly Off" value={employee.weekly_off_display} />
                <div className="sm:col-span-2">
                  <InfoItem label="Address" value={employee.address} />
                </div>
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Bank Name" value={employee.bank_name} />
                <InfoItem label="Account Holder Name" value={employee.bank_holder_name} />
                <InfoItem label="Account Number" value={maskAccount(employee.bank_account_number)} />
                <InfoItem label="IFSC Code" value={employee.bank_ifsc} />
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* Aadhaar Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Aadhaar Card</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem label="Aadhaar Number" value={maskAadhaar(employee.aadhaar_number)} />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Aadhaar Photo</p>
                      {employee.aadhaar_photo_url ? (
                        <img
                          src={employee.aadhaar_photo_url}
                          alt="Aadhaar"
                          className="max-w-full h-40 object-contain border rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(employee.aadhaar_photo_url, '_blank')}
                        />
                      ) : (
                        <p className="text-gray-400 italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PAN Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">PAN Card</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem label="PAN Number" value={employee.pan_number} />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">PAN Photo</p>
                      {employee.pan_photo_url ? (
                        <img
                          src={employee.pan_photo_url}
                          alt="PAN"
                          className="max-w-full h-40 object-contain border rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(employee.pan_photo_url, '_blank')}
                        />
                      ) : (
                        <p className="text-gray-400 italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Family Tab */}
            {activeTab === 'family' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Father's Name" value={employee.father_name} />
                <InfoItem label="Father's Phone" value={employee.father_phone} />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/employees`)}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
          >
            Back to List
          </button>
        </div>
      </div>
    </Layout>
  );
};

// Helper component for displaying info items
const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-gray-900 font-medium">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
  </div>
);

export default EmployeeProfile;
