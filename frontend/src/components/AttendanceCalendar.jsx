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

  // Get status label (short version for mobile)
  const getStatusLabel = (record, date, isFuture, short = false) => {
    if (isFuture) return '';
    if (!record) {
      const dayOfWeek = new Date(year, month - 1, date).getDay();
      if (dayOfWeek === 0) return short ? 'Off' : 'Holiday';
      return short ? 'A' : 'Absent';
    }

    switch (record.status) {
      case 'present': return short ? 'P' : 'Present';
      case 'half_day': return short ? 'HD' : 'Half Day';
      case 'on_leave': return short ? 'L' : 'Leave';
      case 'absent': return short ? 'A' : 'Absent';
      default: return short ? record.status[0] : record.status;
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

      const shortLabel = getStatusLabel(record, date, isFuture, true);

      days.push(
        <div
          key={date}
          className={`p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] border rounded-lg ${statusClass} ${isToday ? 'ring-2 ring-blue-500' : ''} overflow-hidden relative`}
        >
          <div className="font-bold text-sm sm:text-lg">{date}</div>
          {/* WFH indicator */}
          {record?.is_wfh && (
            <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1" title="Work From Home">
              <span className="text-[8px] sm:text-[10px] bg-purple-500 text-white px-1 rounded">
                <span className="hidden sm:inline">WFH</span>
                <span className="sm:hidden">🏠</span>
              </span>
            </div>
          )}
          {/* Show short label on mobile, full on desktop */}
          <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{statusLabel}</span>
          </div>
          {record?.punch_in && (
            <div className="text-[9px] sm:text-xs mt-0.5 sm:mt-1 truncate hidden sm:block">
              In: {new Date(record.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {record?.punch_out && (
            <div className="text-[9px] sm:text-xs truncate hidden sm:block">
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
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Attendance Calendar</h2>
        <div className="flex space-x-2 sm:space-x-4">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-green-100 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-green-800">{summary.present}</div>
          <div className="text-[10px] sm:text-xs text-green-600">Present</div>
        </div>
        <div className="bg-red-100 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-800">{summary.absent}</div>
          <div className="text-[10px] sm:text-xs text-red-600">Absent</div>
        </div>
        <div className="bg-yellow-100 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-yellow-800">{summary.halfDay}</div>
          <div className="text-[10px] sm:text-xs text-yellow-600">Half Day</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-blue-800">{summary.onLeave}</div>
          <div className="text-[10px] sm:text-xs text-blue-600">Leave</div>
        </div>
        <div className="bg-purple-100 rounded-lg p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-purple-800">{summary.holidays}</div>
          <div className="text-[10px] sm:text-xs text-purple-600">Holiday</div>
        </div>
      </div>

      {/* Legend - Hidden on very small screens */}
      <div className="hidden sm:flex flex-wrap gap-4 mb-4 text-sm">
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
        <div className="flex items-center">
          <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
          <span>WFH</span>
        </div>
      </div>
      {/* Mobile Legend */}
      <div className="flex sm:hidden flex-wrap gap-2 mb-3 text-xs">
        <span className="bg-green-100 px-2 py-1 rounded">P=Present</span>
        <span className="bg-red-100 px-2 py-1 rounded">A=Absent</span>
        <span className="bg-yellow-100 px-2 py-1 rounded">HD=Half</span>
        <span className="bg-blue-100 px-2 py-1 rounded">L=Leave</span>
        <span className="bg-purple-500 text-white px-2 py-1 rounded">🏠=WFH</span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-1 sm:py-2 text-xs sm:text-sm">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {generateCalendarDays()}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceCalendar;
