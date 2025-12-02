import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';

const Shifts = () => {
  const { isAdmin } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '10:00',
    end_time: '19:00',
    break_start: '14:00',
    break_end: '15:00',
    break_duration_hours: 1,
    grace_period_minutes: 10,
    is_active: true,
  });
  const [assignData, setAssignData] = useState({
    shift_id: '',
    user_ids: [],
  });

  const fetchShifts = async () => {
    try {
      const response = await attendanceAPI.getShifts();
      // Handle paginated response
      const data = response.data?.results || response.data;
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await authAPI.getEmployees();
      // Handle paginated response
      const data = response.data?.results || response.data;
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchShifts();
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShift) {
        await attendanceAPI.updateShift(editingShift.id, formData);
        toast.success('Shift updated successfully!');
      } else {
        await attendanceAPI.createShift(formData);
        toast.success('Shift created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchShifts();
    } catch (error) {
      const errors = error.response?.data;
      if (errors) {
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        toast.error('Failed to save shift');
      }
    }
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_start: shift.break_start || '14:00',
      break_end: shift.break_end || '15:00',
      break_duration_hours: shift.break_duration_hours || 1,
      grace_period_minutes: shift.grace_period_minutes || 10,
      is_active: shift.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await attendanceAPI.deleteShift(id);
        toast.success('Shift deleted successfully!');
        fetchShifts();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete shift');
      }
    }
  };

  const resetForm = () => {
    setEditingShift(null);
    setFormData({
      name: '',
      start_time: '10:00',
      end_time: '19:00',
      break_start: '14:00',
      break_end: '15:00',
      break_duration_hours: 1,
      grace_period_minutes: 10,
      is_active: true,
    });
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    if (assignData.user_ids.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    try {
      await attendanceAPI.assignShift({
        shift_id: assignData.shift_id || null,
        user_ids: assignData.user_ids,
      });
      toast.success('Shift assigned successfully!');
      setShowAssignModal(false);
      setAssignData({ shift_id: '', user_ids: [] });
      fetchShifts();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign shift');
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setAssignData((prev) => ({
      ...prev,
      user_ids: prev.user_ids.includes(empId)
        ? prev.user_ids.filter((id) => id !== empId)
        : [...prev.user_ids, empId],
    }));
  };

  const formatTime = (time) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          You don't have permission to access this page.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Shift Management</h1>
              <p className="text-sm text-gray-500 mt-1">Create and manage employee shifts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  fetchEmployees();
                  setShowAssignModal(true);
                }}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Assign Shift
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Add Shift
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Total Shifts</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{shifts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Active</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {shifts.filter((s) => s.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Employees Assigned</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {shifts.reduce((acc, s) => acc + (s.employee_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">No Shift</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">
              {employees.filter((e) => !e.shift).length}
            </p>
          </div>
        </div>

        {/* Shifts List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : shifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  !shift.is_active ? 'opacity-60' : ''
                }`}
              >
                <div
                  className={`px-4 py-3 ${shift.is_active ? 'bg-blue-600' : 'bg-gray-500'}`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">{shift.name}</h3>
                    {!shift.is_active && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Timing</span>
                    <span className="font-medium text-gray-800">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Break</span>
                    <span className="font-medium text-gray-800">
                      {formatTime(shift.break_start)} - {formatTime(shift.break_end)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Working Hours</span>
                    <span className="font-medium text-gray-800">{shift.total_hours}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Grace Period</span>
                    <span className="font-medium text-gray-800">
                      {shift.grace_period_minutes} min
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Employees</span>
                    <span className="font-medium text-blue-600">{shift.employee_count || 0}</span>
                  </div>
                  <div className="pt-3 border-t flex gap-2">
                    <button
                      onClick={() => handleEdit(shift)}
                      className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500">
            No shifts created yet.
            <p className="mt-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="text-blue-600 hover:underline"
              >
                Create your first shift
              </button>
            </p>
          </div>
        )}

        {/* Add/Edit Shift Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                {editingShift ? 'Edit Shift' : 'Add Shift'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    placeholder="e.g., Morning Shift"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Break Start
                    </label>
                    <input
                      type="time"
                      value={formData.break_start}
                      onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Break End
                    </label>
                    <input
                      type="time"
                      value={formData.break_end}
                      onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Break Duration (hrs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.break_duration_hours}
                      onChange={(e) =>
                        setFormData({ ...formData, break_duration_hours: parseFloat(e.target.value) })
                      }
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grace Period (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.grace_period_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })
                      }
                      className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingShift ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Shift Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Assign Shift to Employees</h2>
              <form onSubmit={handleAssignShift}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Shift
                  </label>
                  <select
                    value={assignData.shift_id}
                    onChange={(e) => setAssignData({ ...assignData, shift_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                  >
                    <option value="">No Shift (Remove)</option>
                    {shifts
                      .filter((s) => s.is_active)
                      .map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employees ({assignData.user_ids.length} selected)
                  </label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {employees.length === 0 ? (
                      <p className="p-3 text-gray-500 text-center">No employees found</p>
                    ) : (
                      employees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={assignData.user_ids.includes(emp.id)}
                            onChange={() => toggleEmployeeSelection(emp.id)}
                            className="mr-3 h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-500">
                              {emp.shift_name || 'No shift assigned'}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setAssignData({ shift_id: '', user_ids: [] });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Assign Shift
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

export default Shifts;
