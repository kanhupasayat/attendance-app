import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';

const CompOff = () => {
  const { isAdmin, user } = useAuth();
  const [compOffs, setCompOffs] = useState([]);
  const [balance, setBalance] = useState({ earned: 0, used: 0, available: 0, expired: 0 });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReduceLOPModal, setShowReduceLOPModal] = useState(false);
  const [reduceLOPData, setReduceLOPData] = useState({ available_comp_offs: [], lop_leaves: [] });
  const [selectedLOPLeave, setSelectedLOPLeave] = useState(null);
  const [selectedCompOffForLOP, setSelectedCompOffForLOP] = useState('');
  const [reduceLOPLoading, setReduceLOPLoading] = useState(false);
  const [selectedCompOff, setSelectedCompOff] = useState(null);
  const [useDate, setUseDate] = useState('');
  const [addFormData, setAddFormData] = useState({
    user_id: '',
    earned_date: '',
    credit_days: 1,
    reason: '',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const fetchCompOffs = async () => {
    try {
      let response;
      if (isAdmin) {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (selectedEmployee) params.user_id = selectedEmployee;
        response = await attendanceAPI.getAllCompOffs(params);
      } else {
        response = await attendanceAPI.getMyCompOffs();
      }
      // Handle paginated response
      const data = response.data?.results || response.data;
      setCompOffs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching comp offs:', error);
      setCompOffs([]);
    }
  };

  const fetchBalance = async () => {
    try {
      const params = isAdmin && selectedEmployee ? { user_id: selectedEmployee } : {};
      const response = await attendanceAPI.getCompOffBalance(params);
      setBalance(response.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (isAdmin) {
      try {
        const response = await authAPI.getEmployees();
        // Handle paginated response
        const data = response.data?.results || response.data;
        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      }
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [isAdmin]);

  useEffect(() => {
    fetchCompOffs();
    fetchBalance();
  }, [isAdmin, statusFilter, selectedEmployee]);

  const handleUseCompOff = async (e) => {
    e.preventDefault();
    if (!selectedCompOff || !useDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      await attendanceAPI.useCompOff({
        comp_off_id: selectedCompOff.id,
        use_date: useDate,
      });
      toast.success('Comp off used successfully!');
      setShowUseModal(false);
      setSelectedCompOff(null);
      setUseDate('');
      fetchCompOffs();
      fetchBalance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to use comp off');
    }
  };

  const handleAddCompOff = async (e) => {
    e.preventDefault();
    try {
      await attendanceAPI.adminCreateCompOff(addFormData);
      toast.success('Comp off credited successfully!');
      setShowAddModal(false);
      setAddFormData({ user_id: '', earned_date: '', credit_days: 1, reason: '' });
      fetchCompOffs();
      fetchBalance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add comp off');
    }
  };

  const fetchReduceLOPOptions = async () => {
    setReduceLOPLoading(true);
    try {
      const response = await attendanceAPI.getReduceLOPOptions();
      setReduceLOPData(response.data);
    } catch (error) {
      console.error('Error fetching LOP options:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch LOP options');
    } finally {
      setReduceLOPLoading(false);
    }
  };

  const handleOpenReduceLOPModal = () => {
    setShowReduceLOPModal(true);
    fetchReduceLOPOptions();
  };

  const handleReduceLOP = async () => {
    if (!selectedLOPLeave || !selectedCompOffForLOP) {
      toast.error('Please select both a LOP leave and a Comp Off');
      return;
    }
    try {
      const response = await attendanceAPI.useCompOffToReduceLOP({
        leave_request_id: selectedLOPLeave.id,
        comp_off_id: parseInt(selectedCompOffForLOP),
      });
      toast.success(response.data.message || 'LOP reduced successfully!');
      setShowReduceLOPModal(false);
      setSelectedLOPLeave(null);
      setSelectedCompOffForLOP('');
      fetchCompOffs();
      fetchBalance();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reduce LOP');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      earned: 'bg-green-100 text-green-800',
      used: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getMinUseDate = () => {
    const today = new Date();
    // Use local date instead of UTC to handle timezone correctly
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Compensatory Off</h1>
              <p className="text-sm text-gray-500 mt-1">
                Earn comp off by working on holidays or weekly off days
              </p>
            </div>
            <div className="flex gap-2">
              {!isAdmin && (
                <button
                  onClick={handleOpenReduceLOPModal}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Reduce LOP
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Add Comp Off
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Available</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{balance.available}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Earned</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{balance.earned}</p>
            <p className="text-xs text-gray-400">total</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Used</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{balance.used}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Expired</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{balance.expired}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
        </div>

        {/* Filters (Admin) */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Employees</option>
                {Array.isArray(employees) && employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="earned">Earned</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}

        {/* Comp Off List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : compOffs.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile Card View */}
            <div className="block lg:hidden divide-y">
              {compOffs.map((compOff) => (
                <div key={compOff.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      {isAdmin && compOff.user_details && (
                        <p className="font-medium text-gray-800">{compOff.user_details.name}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Earned: {formatDate(compOff.earned_date)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                        compOff.status
                      )}`}
                    >
                      {compOff.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Credit</p>
                      <p className="font-medium">{compOff.credit_days} day(s)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expires</p>
                      <p className="font-medium">{formatDate(compOff.expires_on)}</p>
                    </div>
                  </div>
                  {compOff.reason && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{compOff.reason}</p>
                  )}
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
                      Earned Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires On
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {compOffs.map((compOff) => (
                    <tr key={compOff.id} className="hover:bg-gray-50">
                      {isAdmin && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="font-medium text-gray-800">
                            {compOff.user_details?.name || '-'}
                          </p>
                        </td>
                      )}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(compOff.earned_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {compOff.credit_days} day(s)
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {compOff.reason || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(compOff.expires_on)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            compOff.status
                          )}`}
                        >
                          {compOff.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500">No comp off records found.</p>
            <p className="text-sm text-gray-400 mt-2">
              {isAdmin
                ? 'Use the "Add Comp Off" button to manually credit comp off to employees.'
                : 'Work on your weekly off or holidays to earn comp off days!'}
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
          <h3 className="font-semibold text-blue-800 mb-3">How Comp Off Works</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>
                You automatically earn comp off when you work on your weekly off day or a public
                holiday
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>
                Working 6+ hours = 1 full day comp off, Working 4-6 hours = 0.5 day comp off
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Comp off expires on 31st December of the same year</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>Use "Reduce LOP" to convert your LOP days using comp off</span>
            </li>
          </ul>
        </div>

        {/* Use Comp Off Modal */}
        {showUseModal && selectedCompOff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Use Comp Off</h2>
              <form onSubmit={handleUseCompOff}>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Comp Off Details</p>
                  <p className="font-medium">Earned on: {formatDate(selectedCompOff.earned_date)}</p>
                  <p className="text-sm text-gray-600">
                    Credit: {selectedCompOff.credit_days} day(s)
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires: {formatDate(selectedCompOff.expires_on)}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Date to Use *
                  </label>
                  <input
                    type="date"
                    value={useDate}
                    min={getMinUseDate()}
                    max={selectedCompOff.expires_on}
                    onChange={(e) => setUseDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select a future date before the comp off expires
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUseModal(false);
                      setSelectedCompOff(null);
                      setUseDate('');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Use Comp Off
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Comp Off Modal (Admin) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Add Comp Off</h2>
              <form onSubmit={handleAddCompOff}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Employee *
                  </label>
                  <select
                    value={addFormData.user_id}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, user_id: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  >
                    <option value="">Select Employee</option>
                    {Array.isArray(employees) && employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Earned Date *
                  </label>
                  <input
                    type="date"
                    value={addFormData.earned_date}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, earned_date: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Days
                  </label>
                  <select
                    value={addFormData.credit_days}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, credit_days: parseFloat(e.target.value) })
                    }
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                  >
                    <option value="0.5">0.5 Day (Half Day)</option>
                    <option value="1">1 Day (Full Day)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={addFormData.reason}
                    onChange={(e) => setAddFormData({ ...addFormData, reason: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    placeholder="e.g., Holiday Work, Sunday Work"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddFormData({ user_id: '', earned_date: '', credit_days: 1, reason: '' });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Comp Off
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reduce LOP Modal */}
        {showReduceLOPModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Use Comp Off to Reduce LOP</h2>

              {reduceLOPLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <>
                  {reduceLOPData.lop_leaves.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No LOP leaves found to reduce.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        You don't have any approved leave requests with LOP days.
                      </p>
                    </div>
                  ) : reduceLOPData.available_comp_offs.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No available Comp Offs to use.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        You need earned comp offs to reduce LOP.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* LOP Leaves List */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select LOP Leave to Reduce
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                          {reduceLOPData.lop_leaves.map((leave) => (
                            <div
                              key={leave.id}
                              onClick={() => setSelectedLOPLeave(leave)}
                              className={`p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                                selectedLOPLeave?.id === leave.id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">
                                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                                  </p>
                                  <p className="text-xs text-gray-500">{leave.leave_type}</p>
                                </div>
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                                  {leave.lop_days} LOP day(s)
                                </span>
                              </div>
                              {leave.reason && (
                                <p className="text-xs text-gray-500 mt-1 truncate">{leave.reason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comp Off Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Comp Off to Use
                        </label>
                        <select
                          value={selectedCompOffForLOP}
                          onChange={(e) => setSelectedCompOffForLOP(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                        >
                          <option value="">Select Comp Off</option>
                          {reduceLOPData.available_comp_offs.map((compOff) => (
                            <option key={compOff.id} value={compOff.id}>
                              {formatDate(compOff.earned_date)} - {compOff.credit_days} day(s)
                              {compOff.reason ? ` (${compOff.reason})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Info */}
                      {selectedLOPLeave && selectedCompOffForLOP && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-orange-800">
                            This will use your selected comp off to reduce LOP by{' '}
                            {reduceLOPData.available_comp_offs.find(
                              (c) => c.id === parseInt(selectedCompOffForLOP)
                            )?.credit_days || 0}{' '}
                            day(s) from the selected leave request.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReduceLOPModal(false);
                        setSelectedLOPLeave(null);
                        setSelectedCompOffForLOP('');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    {reduceLOPData.lop_leaves.length > 0 && reduceLOPData.available_comp_offs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleReduceLOP}
                        disabled={!selectedLOPLeave || !selectedCompOffForLOP}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Reduce LOP
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompOff;
