import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';

const AttendanceCalendar = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchAttendance();
  }, [month, year]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getMyAttendance({ month, year });
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get attendance record for a specific date
  const getAttendanceForDate = (date) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return attendance.find(a => a.date === dateStr);
  };

  // Get status color class
  const getStatusClass = (record, date, isToday, isFuture) => {
    if (isFuture) return 'bg-gray-100 text-gray-400';
    if (!record) {
      // Check if it's Sunday
      const dayOfWeek = new Date(year, month - 1, date).getDay();
      if (dayOfWeek === 0) return 'bg-blue-100 text-blue-800'; // Sunday - Holiday
      return 'bg-red-100 text-red-800'; // Absent
    }

    switch (record.status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'half_day': return 'bg-yellow-100 text-yellow-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Get status label
  const getStatusLabel = (record, date, isFuture) => {
    if (isFuture) return '';
    if (!record) {
      const dayOfWeek = new Date(year, month - 1, date).getDay();
      if (dayOfWeek === 0) return 'Holiday';
      return 'Absent';
    }

    switch (record.status) {
      case 'present': return 'Present';
      case 'half_day': return 'Half Day';
      case 'on_leave': return 'Leave';
      case 'absent': return 'Absent';
      default: return record.status;
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const currentDate = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const days = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let date = 1; date <= daysInMonth; date++) {
      const record = getAttendanceForDate(date);
      const isToday = date === currentDate && month === currentMonth && year === currentYear;
      const isFuture = new Date(year, month - 1, date) > today;
      const statusClass = getStatusClass(record, date, isToday, isFuture);
      const statusLabel = getStatusLabel(record, date, isFuture);

      days.push(
        <div
          key={date}
          className={`p-2 min-h-[80px] border rounded-lg ${statusClass} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="font-bold text-lg">{date}</div>
          <div className="text-xs mt-1">{statusLabel}</div>
          {record?.punch_in && (
            <div className="text-xs mt-1">
              In: {new Date(record.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {record?.punch_out && (
            <div className="text-xs">
              Out: {new Date(record.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  // Calculate summary
  const calculateSummary = () => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const lastDay = month === today.getMonth() + 1 && year === today.getFullYear()
      ? today.getDate()
      : daysInMonth;

    let present = 0, absent = 0, halfDay = 0, onLeave = 0, holidays = 0;

    for (let date = 1; date <= lastDay; date++) {
      const record = getAttendanceForDate(date);
      const dayOfWeek = new Date(year, month - 1, date).getDay();

      if (dayOfWeek === 0) {
        holidays++;
      } else if (!record) {
        absent++;
      } else {
        switch (record.status) {
          case 'present': present++; break;
          case 'half_day': halfDay++; break;
          case 'on_leave': onLeave++; break;
          default: absent++;
        }
      }
    }

    return { present, absent, halfDay, onLeave, holidays };
  };

  const summary = calculateSummary();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 md:mb-0">Attendance Calendar</h2>
        <div className="flex space-x-4">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-green-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-800">{summary.present}</div>
          <div className="text-xs text-green-600">Present</div>
        </div>
        <div className="bg-red-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-800">{summary.absent}</div>
          <div className="text-xs text-red-600">Absent</div>
        </div>
        <div className="bg-yellow-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-800">{summary.halfDay}</div>
          <div className="text-xs text-yellow-600">Half Day</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-800">{summary.onLeave}</div>
          <div className="text-xs text-blue-600">On Leave</div>
        </div>
        <div className="bg-purple-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-800">{summary.holidays}</div>
          <div className="text-xs text-purple-600">Holidays</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-100 rounded mr-2"></div>
          <span>Half Day</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
          <span>Leave/Holiday</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {generateCalendarDays()}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceCalendar;
