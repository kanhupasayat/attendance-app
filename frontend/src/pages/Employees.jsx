import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
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
                        <p className="font-medium text-gray-900 text-sm">{employee.name}</p>
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
                          <div className="text-sm font-medium text-gray-900">
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
                            onClick={() => handleEdit(employee)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
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
      </div>
    </Layout>
  );
};

export default Employees;
