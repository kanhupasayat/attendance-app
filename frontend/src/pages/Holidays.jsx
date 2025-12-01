import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../services/api';
import Layout from '../components/Layout';

const Holidays = () => {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    is_optional: false,
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await leaveAPI.getHolidays();
      setHolidays(response.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.createHoliday(formData);
      toast.success('Holiday added successfully!');
      setShowAddModal(false);
      setFormData({ name: '', date: '', is_optional: false });
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add holiday');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await leaveAPI.deleteHoliday(id);
        toast.success('Holiday deleted');
        fetchHolidays();
      } catch (error) {
        toast.error('Failed to delete holiday');
      }
    }
  };

  const filteredHolidays = holidays.filter(h =>
    new Date(h.date).getFullYear() === selectedYear
  );

  const upcomingHolidays = filteredHolidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastHolidays = filteredHolidays
    .filter(h => new Date(h.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 0) return `In ${diff} days`;
    return '';
  };

  const groupByMonth = (holidayList) => {
    const grouped = {};
    holidayList.forEach(holiday => {
      const date = new Date(holiday.date);
      const monthKey = date.getMonth();
      const monthName = date.toLocaleDateString('en-IN', { month: 'long' });
      if (!grouped[monthKey]) {
        grouped[monthKey] = { name: monthName, holidays: [] };
      }
      grouped[monthKey].holidays.push(holiday);
    });
    return Object.entries(grouped).sort((a, b) => a[0] - b[0]);
  };

  const monthGroups = groupByMonth(filteredHolidays);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Holiday Calendar</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Add Holiday
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Holidays Banner */}
        {upcomingHolidays.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">Upcoming Holidays</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {upcomingHolidays.slice(0, 3).map((holiday) => (
                <div key={holiday.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-lg text-gray-800 truncate">{holiday.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {new Date(holiday.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      {getDaysUntil(holiday.date)}
                    </span>
                  </div>
                  {holiday.is_optional && (
                    <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                      Optional
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{filteredHolidays.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Upcoming</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{upcomingHolidays.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Past</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-600">{pastHolidays.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Optional</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">
              {filteredHolidays.filter(h => h.is_optional).length}
            </p>
          </div>
        </div>

        {/* Holiday List by Month */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : monthGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {monthGroups.map(([monthKey, { name, holidays }]) => (
              <div key={monthKey} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 px-4 py-2 sm:py-3">
                  <h3 className="font-semibold text-white text-sm sm:text-base">{name}</h3>
                </div>
                <div className="divide-y">
                  {holidays.map((holiday) => {
                    const isPast = new Date(holiday.date) < new Date();
                    return (
                      <div
                        key={holiday.id}
                        className={`p-3 sm:p-4 ${isPast ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className={`font-medium text-sm truncate ${isPast ? 'text-gray-500' : 'text-gray-800'}`}>
                                {holiday.name}
                              </h4>
                              {holiday.is_optional && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(holiday.date).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(holiday.id)}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
            No holidays found for {selectedYear}.
            {isAdmin && (
              <p className="mt-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-blue-600 hover:underline"
                >
                  Add the first holiday
                </button>
              </p>
            )}
          </div>
        )}

        {/* Add Holiday Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Add Holiday</h2>
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    placeholder="e.g., Diwali"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-base"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_optional}
                      onChange={(e) => setFormData({ ...formData, is_optional: e.target.checked })}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Optional Holiday</span>
                  </label>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({ name: '', date: '', is_optional: false });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Holiday
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

export default Holidays;
