import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authAPI, attendanceAPI, leaveAPI } from '../services/api';
import Layout from '../components/Layout';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    department: '',
    designation: '',
    weekly_off: 6,
    password: '',
  });

  // Profile view modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const weekDays = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
  ];

  const fetchEmployees = async () => {
    try {
      const response = await authAPI.getEmployees();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleViewProfile = async (employee) => {
    setSelectedEmployee(employee);
    setShowProfileModal(true);
    setLoadingProfile(true);
    setEmployeeStats(null);

    try {
      // Fetch attendance stats for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const attendanceResponse = await attendanceAPI.getAllAttendance({
        month: currentMonth,
        year: currentYear
      });

      // Filter attendance for this employee
      const employeeAttendance = attendanceResponse.data.filter(
        (a) => a.user === employee.id
      );

      // Calculate stats
      const presentDays = employeeAttendance.filter(a => a.status === 'present').length;
      const absentDays = employeeAttendance.filter(a => a.status === 'absent').length;
      const halfDays = employeeAttendance.filter(a => a.status === 'half_day').length;
      const onLeave = employeeAttendance.filter(a => a.status === 'on_leave').length;
      const totalHours = employeeAttendance.reduce((sum, a) => sum + (parseFloat(a.working_hours) || 0), 0);

      setEmployeeStats({
        presentDays,
        absentDays,
        halfDays,
        onLeave,
        totalHours: totalHours.toFixed(1),
        totalRecords: employeeAttendance.length
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await authAPI.updateEmployee(editingEmployee.id, formData);
        toast.success('Employee updated successfully!');
      } else {
        await authAPI.createEmployee(formData);
        toast.success('Employee created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      const errors = error.response?.data;
      if (errors) {
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        toast.error('Failed to save employee');
      }
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      mobile: employee.mobile,
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      weekly_off: employee.weekly_off ?? 6,
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await authAPI.deleteEmployee(id);
        toast.success('Employee deleted successfully!');
        fetchEmployees();
      } catch (error) {
        toast.error('Failed to delete employee');
      }
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      department: '',
      designation: '',
      weekly_off: 6,
      password: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Employees</h1>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base transition-colors"
            >
              Add Employee
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : employees.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {employees.map((employee) => (
                  <div key={employee.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p
                          className="font-medium text-blue-600 text-sm cursor-pointer hover:underline"
                          onClick={() => handleViewProfile(employee)}
                        >
                          {employee.name}
                        </p>
                        <p className="text-gray-600 text-xs">{employee.mobile}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <p className="text-gray-500">Department</p>
                        <p className="font-medium text-gray-800">{employee.department || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Designation</p>
                        <p className="font-medium text-gray-800">{employee.designation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium text-gray-800 truncate">{employee.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Weekly Off</p>
                        <p className="font-medium text-purple-600">{employee.weekly_off_display || 'Sunday'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewProfile(employee)}
                        className="flex-1 bg-green-100 text-green-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-green-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="flex-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="flex-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mobile
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Designation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Weekly Off
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
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div
                            className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                            onClick={() => handleViewProfile(employee)}
                          >
                            {employee.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.mobile}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.email || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.department || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.designation || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                          {employee.weekly_off_display || 'Sunday'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employee.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewProfile(employee)}
                            className="text-green-600 hover:text-green-800 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
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
              No employees found. Add your first employee!
            </div>
          )}
        </div>

        {/* Add/Edit Employee Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                    disabled={editingEmployee}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Off Day
                  </label>
                  <select
                    value={formData.weekly_off}
                    onChange={(e) => setFormData({ ...formData, weekly_off: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                  >
                    {weekDays.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editingEmployee && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    placeholder={editingEmployee ? 'Leave blank to keep current' : ''}
                    required={!editingEmployee}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEmployee ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Employee Profile View Modal */}
        {showProfileModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Employee Profile</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  {selectedEmployee.profile_photo ? (
                    <img
                      src={selectedEmployee.profile_photo}
                      alt={selectedEmployee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {selectedEmployee.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                  <p className="text-sm text-gray-600">{selectedEmployee.designation || 'Employee'}</p>
                  <p className="text-sm text-gray-500">{selectedEmployee.department || '-'}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Mobile</p>
                    <p className="font-medium text-gray-900">{selectedEmployee.mobile}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900 truncate">{selectedEmployee.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Work Info */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Work Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Weekly Off</p>
                    <p className="font-medium text-purple-600">{selectedEmployee.weekly_off_display || 'Sunday'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEmployee.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* This Month Stats */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  This Month's Attendance ({new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})
                </h4>

                {loadingProfile ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : employeeStats ? (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{employeeStats.presentDays}</p>
                      <p className="text-xs text-green-700">Present</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center border border-red-200">
                      <p className="text-xl sm:text-2xl font-bold text-red-600">{employeeStats.absentDays}</p>
                      <p className="text-xs text-red-700">Absent</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center border border-yellow-200">
                      <p className="text-xl sm:text-2xl font-bold text-yellow-600">{employeeStats.halfDays}</p>
                      <p className="text-xs text-yellow-700">Half Day</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{employeeStats.onLeave}</p>
                      <p className="text-xs text-blue-700">On Leave</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-200 col-span-2">
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{employeeStats.totalHours}</p>
                      <p className="text-xs text-purple-700">Total Hours</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No attendance data available</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleEdit(selectedEmployee);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm"
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

export default Employees;
