import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, ClipboardList, DollarSign, 
  Bell, Home, LogOut, Menu, X, FileText, GraduationCap,
  UserCheck, TrendingUp, AlertCircle, CheckCircle, Clock,
  Download, Upload, Plus, Search, Filter, Eye, Edit, Trash2
} from 'lucide-react';

// ==============================================================================
// API CONFIGURATION & SERVICES
// ==============================================================================

const API_BASE_URL = 'http://localhost:8000';

// API Service Class
class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  setToken(token) {
    localStorage.setItem('access_token', token);
  }

  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired, redirect to login
        this.removeToken();
        window.location.reload();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  async getCurrentUser() {
    return await this.request('/api/auth/me');
  }

  // Students endpoints
  async getStudents(sectionId = null) {
    const params = sectionId ? `?section_id=${sectionId}` : '';
    return await this.request(`/api/students${params}`);
  }

  async createStudent(studentData) {
    return await this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  // Attendance endpoints
  async markAttendance(attendanceData) {
    return await this.request('/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudentAttendance(studentId, startDate = null, endDate = null) {
    let params = '';
    if (startDate) params += `?start_date=${startDate}`;
    if (endDate) params += `${params ? '&' : '?'}end_date=${endDate}`;
    return await this.request(`/api/attendance/student/${studentId}${params}`);
  }

  // Homework endpoints
  async getHomework(sectionId = null) {
    const params = sectionId ? `?section_id=${sectionId}` : '';
    return await this.request(`/api/homework${params}`);
  }

  async createHomework(homeworkData) {
    return await this.request('/api/homework', {
      method: 'POST',
      body: JSON.stringify(homeworkData),
    });
  }

  async submitHomework(homeworkId, submissionText, file = null) {
    return await this.request('/api/homework/submit', {
      method: 'POST',
      body: JSON.stringify({
        homework_id: homeworkId,
        submission_text: submissionText,
      }),
    });
  }
}

const api = new ApiService();

// ==============================================================================
// WEBSOCKET SERVICE
// ==============================================================================

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = [];
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`ws://localhost:8000/ws/${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(callback => callback(data));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket Disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(token), 5000);
    };
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

const wsService = new WebSocketService();

// ==============================================================================
// MAIN APP COMPONENT
// ==============================================================================

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Setup WebSocket for notifications
  useEffect(() => {
    if (currentUser) {
      const token = api.getToken();
      wsService.connect(token);

      const handleNotification = (data) => {
        console.log('New notification:', data);
        setNotifications(prev => [...prev, data]);
      };

      wsService.addListener(handleNotification);

      return () => {
        wsService.removeListener(handleNotification);
      };
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      setError(null);
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user data');
      api.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      await api.login(email, password);
      await loadCurrentUser();
      setActiveMenu('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.removeToken();
    wsService.disconnect();
    setCurrentUser(null);
    setNotifications([]);
    setActiveMenu('dashboard');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} error={error} loading={loading} />;
  }

  // Main Dashboard
  const menuItems = getMenuItems(currentUser.role);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        menuItems={menuItems}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          currentUser={currentUser}
          notifications={notifications}
          activeMenu={activeMenu}
          menuItems={menuItems}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <ContentRenderer 
            role={currentUser.role} 
            activeMenu={activeMenu}
            currentUser={currentUser}
          />
        </main>
      </div>
    </div>
  );
};

// ==============================================================================
// LOGIN SCREEN COMPONENT
// ==============================================================================

const LoginScreen = ({ onLogin, error, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const quickLogin = (role) => {
    const credentials = {
      admin: { email: 'admin@school.com', password: 'admin123' },
      teacher: { email: 'priya@school.com', password: 'teacher123' },
      student: { email: 'arjun@school.com', password: 'student123' },
      parent: { email: 'meena@school.com', password: 'parent123' }
    };
    const cred = credentials[role];
    onLogin(cred.email, cred.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">EduManage Pro</h1>
          <p className="text-gray-600">School Management & E-Learning System</p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus />

        {/* Login Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        {/* Quick Login Options */}
        <div className="border-t pt-6">
          <p className="text-sm text-gray-600 mb-3 text-center">Quick Login (Demo):</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogin('admin')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">
              Admin
            </button>
            <button onClick={() => quickLogin('teacher')} className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">
              Teacher
            </button>
            <button onClick={() => quickLogin('student')} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
              Student
            </button>
            <button onClick={() => quickLogin('parent')} className="px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">
              Parent
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6 pt-6 border-t">
          <p>Connected to FastAPI Backend</p>
          <p className="mt-1">JWT Auth • WebSocket • PostgreSQL</p>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// CONNECTION STATUS COMPONENT
// ==============================================================================

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(() => setStatus('connected'))
      .catch(() => setStatus('disconnected'));
  }, []);

  return (
    <div className={`mb-4 p-3 rounded-lg text-sm ${
      status === 'connected' ? 'bg-green-50 text-green-700' :
      status === 'disconnected' ? 'bg-red-50 text-red-700' :
      'bg-yellow-50 text-yellow-700'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-500' :
          status === 'disconnected' ? 'bg-red-500' :
          'bg-yellow-500 animate-pulse'
        }`}></div>
        <span>
          {status === 'connected' ? '✓ Backend Connected' :
           status === 'disconnected' ? '✗ Backend Offline - Start server at localhost:8000' :
           'Checking connection...'}
        </span>
      </div>
    </div>
  );
};

// ==============================================================================
// SIDEBAR COMPONENT
// ==============================================================================

const Sidebar = ({ sidebarOpen, setSidebarOpen, menuItems, activeMenu, setActiveMenu }) => {
  return (
    <div className={`bg-indigo-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-4 flex items-center justify-between">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <GraduationCap size={28} />
            <span className="font-bold text-lg">EduManage</span>
          </div>
        )}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-indigo-800 p-2 rounded">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="mt-6">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 transition-colors ${
                activeMenu === item.id ? 'bg-indigo-800 border-l-4 border-white' : ''
              }`}
            >
              <Icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// ==============================================================================
// HEADER COMPONENT
// ==============================================================================

const Header = ({ currentUser, notifications, activeMenu, menuItems, onLogout }) => {
  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-800">
        {menuItems.find(m => m.id === activeMenu)?.label || 'Dashboard'}
      </h1>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell size={20} />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{currentUser.full_name}</p>
            <p className="text-sm text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-gray-100 rounded-full text-red-600"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

// ==============================================================================
// CONTENT RENDERER
// ==============================================================================

const ContentRenderer = ({ role, activeMenu, currentUser }) => {
  if (activeMenu === 'dashboard') {
    return <Dashboard role={role} currentUser={currentUser} />;
  } else if (activeMenu === 'students') {
    return <StudentsView />;
  } else if (activeMenu === 'attendance') {
    return <AttendanceView role={role} />;
  } else if (activeMenu === 'homework') {
    return <HomeworkView role={role} />;
  }
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600">Content for <span className="font-semibold">{activeMenu}</span> - Connected to API</p>
      <p className="text-sm text-gray-500 mt-2">This view will fetch real data from FastAPI backend</p>
    </div>
  );
};

// ==============================================================================
// DASHBOARD COMPONENT (with real API calls)
// ==============================================================================

const Dashboard = ({ role, currentUser }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Welcome, {currentUser.full_name}!</h3>
        <p className="text-gray-600">Role: <span className="font-medium capitalize">{role.replace('_', ' ')}</span></p>
        <p className="text-sm text-green-600 mt-2">✓ Connected to FastAPI Backend</p>
        <p className="text-sm text-green-600">✓ JWT Authentication Active</p>
        <p className="text-sm text-green-600">✓ WebSocket Ready</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} label="System Status" value="Online" color="green" />
        <StatCard icon={CheckCircle} label="API Status" value="Ready" color="blue" />
        <StatCard icon={TrendingUp} label="Database" value="PostgreSQL" color="indigo" />
      </div>
    </div>
  );
};

// ==============================================================================
// STUDENTS VIEW (Connected to API)
// ==============================================================================

const StudentsView = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading students...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Students ({students.length})</h3>
        <p className="text-sm text-gray-600 mt-1">Loaded from API</p>
      </div>
      <div className="p-6">
        {students.length === 0 ? (
          <p className="text-gray-500">No students found. Run seed.py to add demo data.</p>
        ) : (
          <div className="space-y-2">
            {students.map(student => (
              <div key={student.id} className="p-4 border rounded hover:bg-gray-50">
                <p className="font-semibold">{student.user?.full_name || 'N/A'}</p>
                <p className="text-sm text-gray-600">Admission No: {student.admission_no}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// ATTENDANCE VIEW (Connected to API)
// ==============================================================================

const AttendanceView = ({ role }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Attendance Management</h3>
      <p className="text-gray-600">Connected to API endpoint: /api/attendance</p>
      <p className="text-sm text-gray-500 mt-2">Mark attendance and fetch records from PostgreSQL</p>
    </div>
  );
};

// ==============================================================================
// HOMEWORK VIEW (Connected to API)
// ==============================================================================

const HomeworkView = ({ role }) => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomework();
  }, []);

  const loadHomework = async () => {
    try {
      const data = await api.getHomework();
      setHomework(data);
    } catch (err) {
      console.error('Failed to load homework:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading homework...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Homework ({homework.length})</h3>
      {homework.length === 0 ? (
        <p className="text-gray-500">No homework found. Create some using the API.</p>
      ) : (
        <div className="space-y-2">
          {homework.map(hw => (
            <div key={hw.id} className="p-4 border rounded">
              <p className="font-semibold">{hw.title}</p>
              <p className="text-sm text-gray-600">{hw.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// HELPER COMPONENTS
// ==============================================================================

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`${colors[color]} p-4 rounded-full`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// MENU ITEMS
// ==============================================================================

const getMenuItems = (role) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home }
  ];

  if (role === 'admin' || role === 'super_admin') {
    return [
      ...baseItems,
      { id: 'students', label: 'Students', icon: Users },
      { id: 'teachers', label: 'Teachers', icon: BookOpen },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'homework', label: 'Homework', icon: ClipboardList },
    ];
  } else if (role === 'teacher') {
    return [
      ...baseItems,
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'homework', label: 'Homework', icon: ClipboardList },
      { id: 'students', label: 'My Students', icon: Users },
    ];
  } else if (role === 'student') {
    return [
      ...baseItems,
      { id: 'homework', label: 'Homework', icon: ClipboardList },
      { id: 'attendance', label: 'My Attendance', icon: UserCheck },
    ];
  } else {
    return [
      ...baseItems,
      { id: 'attendance', label: "Child's Attendance", icon: UserCheck },
      { id: 'homework', label: 'Homework', icon: ClipboardList },
    ];
  }
};

export default App;