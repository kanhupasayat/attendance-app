# Attendance & Leave Management System

A full-stack web application for managing employee attendance and leave built with Django (Backend) and React + Vite (Frontend).

## Features

- **Admin Setup**: First-time admin signup
- **Employee Management**: Add, edit, delete employees
- **Authentication**: Login with Password or OTP (mobile-based)
- **Attendance**:
  - Punch In/Out with GPS location validation
  - IP-based office location verification
  - Automatic working hours calculation
- **Leave Management**:
  - Multiple leave types (CL, SL, EL, LOP)
  - Apply for leave, half-day support
  - Admin approval workflow
  - Carry-forward logic for earned leaves
  - Automatic LOP marking when balance exhausted
- **Reports**:
  - Attendance reports with monthly filters
  - Leave balance reports
  - CSV export functionality
- **Month-end Processing**: Automated year-end carry-forward calculation

## Tech Stack

**Backend:**
- Django 5.x
- Django REST Framework
- Simple JWT for authentication
- SQLite (development)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hot Toast

## Project Structure

```
Attendance & Leave System/
├── backend/
│   ├── config/              # Django project settings
│   ├── accounts/            # User management, authentication
│   ├── attendance/          # Attendance tracking, punch in/out
│   ├── leaves/              # Leave management
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── context/         # React context
│   │   └── hooks/           # Custom hooks
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Setup default leave types:
   ```bash
   python manage.py setup_leave_types
   ```

6. Start the backend server:
   ```bash
   python manage.py runserver
   ```

Backend will run at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

Frontend will run at: `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/admin-signup/` - First-time admin registration
- `POST /api/auth/login/` - Login with mobile + password
- `POST /api/auth/otp/request/` - Request OTP
- `POST /api/auth/otp/verify/` - Verify OTP and login
- `GET /api/auth/profile/` - Get current user profile
- `GET /api/auth/employees/` - List employees (Admin)
- `POST /api/auth/employees/` - Create employee (Admin)

### Attendance
- `POST /api/attendance/punch-in/` - Punch in with location
- `POST /api/attendance/punch-out/` - Punch out with location
- `GET /api/attendance/today/` - Get today's attendance
- `GET /api/attendance/my-attendance/` - Get my attendance history
- `GET /api/attendance/all/` - Get all attendance (Admin)
- `GET /api/attendance/report/` - Get attendance report (Admin)
- `GET /api/attendance/export/` - Export CSV (Admin)

### Leaves
- `GET /api/leaves/types/` - List leave types
- `GET /api/leaves/my-balance/` - Get my leave balance
- `POST /api/leaves/apply/` - Apply for leave
- `GET /api/leaves/my-requests/` - Get my leave requests
- `POST /api/leaves/cancel/<id>/` - Cancel leave request
- `GET /api/leaves/all-requests/` - All leave requests (Admin)
- `POST /api/leaves/review/<id>/` - Approve/Reject leave (Admin)
- `POST /api/leaves/initialize/` - Initialize leave balances (Admin)

## Configuration

### Office Location (GPS)
Edit `backend/config/settings.py`:
```python
OFFICE_LATITUDE = 28.6139   # Your office latitude
OFFICE_LONGITUDE = 77.2090  # Your office longitude
OFFICE_RADIUS_METERS = 50   # Allowed radius
```

### Allowed Office IPs
```python
ALLOWED_OFFICE_IPS = [
    '127.0.0.1',  # localhost
    # Add your office public IP
]
```

### Leave Settings
```python
ANNUAL_CASUAL_LEAVE = 12
ANNUAL_SICK_LEAVE = 6
ANNUAL_EARNED_LEAVE = 15
MAX_CARRY_FORWARD_EARNED_LEAVE = 30
```

## Management Commands

### Setup default leave types:
```bash
python manage.py setup_leave_types
```

### Process year-end carry forward:
```bash
python manage.py process_year_end --year 2024
```

### Dry run (preview changes):
```bash
python manage.py process_year_end --dry-run
```

## Default Leave Types

| Code | Name | Annual Quota | Carry Forward |
|------|------|--------------|---------------|
| CL | Casual Leave | 12 | No |
| SL | Sick Leave | 6 | No |
| EL | Earned Leave | 15 | Yes (max 30) |
| LOP | Loss of Pay | 0 | No |

## Usage Flow

1. **First Time Setup:**
   - Visit the app, you'll be redirected to Admin Setup
   - Create admin account

2. **Admin Actions:**
   - Add employees from Employees page
   - Initialize leave balances from Reports page
   - Review leave requests from Leaves page

3. **Employee Actions:**
   - Login with mobile + password/OTP
   - Punch In/Out from Dashboard
   - Apply for leaves from Leaves page
   - View attendance history from Attendance page

## Notes

- OTP is returned in response during development (check console)
- For production, integrate with SMS gateway (Twilio/MSG91)
- Location validation can be bypassed in development mode
- For strict Wi-Fi BSSID validation, a native app would be required
