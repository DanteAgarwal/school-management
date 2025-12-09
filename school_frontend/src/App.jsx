import React, { useState, useEffect } from "react";
import {
  Calendar,
  Bell,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  DollarSign,
  MessageSquare,
  LogOut,
  Menu,
  Home,
  CheckSquare,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// API Configuration
const API_BASE = "https://glorious-waddle-wgg444x5jrx29v4w-8000.app.github.dev";

// API client for FastAPI backend
const api = {
  async request(endpoint, method = "GET", data = null) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const options = {
        method,
        headers,
      };

      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.reload();
        }
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("API Error:", err);
      return api.getMockData(endpoint, method, data);
    }
  },

  getMockData(endpoint, method, data) {
    if (endpoint === "/api/auth/login") {
      const validUsers = {
        "admin@school.com": {
          id: 1,
          name: "Admin User",
          role: "admin",
          email: "admin@school.com",
        },
        "teacher@school.com": {
          id: 2,
          name: "John Teacher",
          role: "teacher",
          email: "teacher@school.com",
        },
        "student@school.com": {
          id: 3,
          name: "Alice Student",
          role: "student",
          email: "student@school.com",
        },
        "parent@school.com": {
          id: 4,
          name: "Bob Parent",
          role: "parent",
          email: "parent@school.com",
        },
      };

      const user = validUsers[data?.email];
      if (
        user &&
        (data?.password === "admin123" ||
          data?.password === "teacher123" ||
          data?.password === "student123" ||
          data?.password === "parent123")
      ) {
        return { token: "demo-jwt-token-" + user.role, user };
      }
      throw new Error("Invalid credentials");
    }

    if (endpoint.startsWith("/api/dashboard/")) {
      const role = endpoint.split("/").pop();
      return {
        stats:
          role === "admin"
            ? {
                totalStudents: 847,
                totalTeachers: 52,
                totalClasses: 36,
                attendanceToday: 94.5,
              }
            : role === "teacher"
            ? {
                classesAssigned: 4,
                homeworkPending: 12,
                studentsTotal: 156,
              }
            : role === "student"
            ? {
                attendanceRate: 96.5,
                pendingHomework: 3,
                upcomingExams: 2,
              }
            : {
                childrenCount: 2,
                pendingFees: 0,
                lastAttendance: "98%",
              },
        recentActivity: [
          {
            id: 1,
            text: "New homework assigned in Mathematics",
            time: "2 hours ago",
          },
          {
            id: 2,
            text: "Attendance marked for Class 10-A",
            time: "5 hours ago",
          },
        ],
        notifications: [
          {
            id: 1,
            message: "Parent-Teacher meeting on Dec 15",
            type: "info",
            time: "1 day ago",
            read: false,
          },
        ],
      };
    }

    if (endpoint === "/api/students") {
      return {
        students: [
          {
            id: 1,
            name: "Alice Johnson",
            class: "10",
            section: "A",
            rollNo: 15,
            attendance: 96.5,
          },
          {
            id: 2,
            name: "Bob Smith",
            class: "10",
            section: "A",
            rollNo: 16,
            attendance: 94.2,
          },
          {
            id: 3,
            name: "Charlie Brown",
            class: "10",
            section: "B",
            rollNo: 12,
            attendance: 98.1,
          },
          {
            id: 4,
            name: "Diana Prince",
            class: "9",
            section: "A",
            rollNo: 8,
            attendance: 95.7,
          },
        ],
      };
    }

    if (endpoint === "/api/homework") {
      return {
        homework: [
          {
            id: 1,
            title: "Algebra Problems Chapter 5",
            subject: "Mathematics",
            dueDate: "2025-12-15",
            status: "pending",
          },
          {
            id: 2,
            title: "Physics Lab Report",
            subject: "Physics",
            dueDate: "2025-12-12",
            status: "submitted",
          },
          {
            id: 3,
            title: "English Essay on Environment",
            subject: "English",
            dueDate: "2025-12-18",
            status: "pending",
          },
        ],
      };
    }

    return {};
  },
};

// Login Component
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.request("/api/auth/login", "POST", {
        email,
        password,
      });
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('user', JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setError("Invalid credentials. Try: admin@school.com / admin123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">School Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="user@school.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Admin: admin@school.com / admin123</p>
          <p>Teacher: teacher@school.com / teacher123</p>
          <p>Student: student@school.com / student123</p>
          <p>Parent: parent@school.com / parent123</p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const data = await api.request(`/api/dashboard/${user.role}`);
      setDashboardData(data);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
  };

  const menuItems = {
    admin: [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "students", label: "Students", icon: Users },
      { id: "teachers", label: "Teachers", icon: GraduationCap },
      { id: "classes", label: "Classes", icon: BookOpen },
      { id: "fees", label: "Fees", icon: DollarSign },
      { id: "reports", label: "Reports", icon: TrendingUp },
    ],
    teacher: [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "classes", label: "My Classes", icon: BookOpen },
      { id: "attendance", label: "Attendance", icon: CheckSquare },
      { id: "homework", label: "Homework", icon: FileText },
      { id: "marks", label: "Marks", icon: TrendingUp },
    ],
    student: [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "timetable", label: "Timetable", icon: Calendar },
      { id: "homework", label: "Homework", icon: FileText },
      { id: "attendance", label: "Attendance", icon: CheckSquare },
      { id: "marks", label: "Marks", icon: TrendingUp },
    ],
    parent: [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "children", label: "Children", icon: Users },
      { id: "attendance", label: "Attendance", icon: CheckSquare },
      { id: "fees", label: "Fees", icon: DollarSign },
      { id: "messages", label: "Messages", icon: MessageSquare },
    ],
  };

  const currentMenu = menuItems[user.role] || menuItems.student;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-indigo-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold">School Portal</h2>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-indigo-800 rounded"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  activeTab === item.id
                    ? "bg-indigo-700"
                    : "hover:bg-indigo-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-indigo-800 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-600 capitalize">{user.role}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-6 h-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "home" && (
            <HomeTab data={dashboardData} role={user.role} />
          )}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "homework" && <HomeworkTab role={user.role} />}
          {activeTab === "attendance" && <AttendanceTab role={user.role} />}
          {activeTab !== "home" &&
            activeTab !== "students" &&
            activeTab !== "homework" &&
            activeTab !== "attendance" && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">
                  Coming Soon
                </h3>
                <p className="text-gray-500 mt-2">
                  This section is under development
                </p>
              </div>
            )}
        </main>
      </div>
    </div>
  );
};

// Home Tab
const HomeTab = ({ data, role }) => {
  if (!data) return <div>Loading...</div>;

  const stats = data.stats || {};
  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {role === "admin" && (
          <>
            <StatCard
              label="Total Students"
              value={stats.totalStudents}
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              label="Total Teachers"
              value={stats.totalTeachers}
              icon={GraduationCap}
              color="bg-green-500"
            />
            <StatCard
              label="Total Classes"
              value={stats.totalClasses}
              icon={BookOpen}
              color="bg-purple-500"
            />
            <StatCard
              label="Attendance Today"
              value={`${stats.attendanceToday}%`}
              icon={CheckSquare}
              color="bg-orange-500"
            />
          </>
        )}
        {role === "teacher" && (
          <>
            <StatCard
              label="Classes Assigned"
              value={stats.classesAssigned}
              icon={BookOpen}
              color="bg-blue-500"
            />
            <StatCard
              label="Homework Pending"
              value={stats.homeworkPending}
              icon={FileText}
              color="bg-orange-500"
            />
            <StatCard
              label="Total Students"
              value={stats.studentsTotal}
              icon={Users}
              color="bg-green-500"
            />
          </>
        )}
        {role === "student" && (
          <>
            <StatCard
              label="Attendance Rate"
              value={`${stats.attendanceRate}%`}
              icon={CheckSquare}
              color="bg-green-500"
            />
            <StatCard
              label="Pending Homework"
              value={stats.pendingHomework}
              icon={FileText}
              color="bg-orange-500"
            />
            <StatCard
              label="Upcoming Exams"
              value={stats.upcomingExams}
              icon={Calendar}
              color="bg-red-500"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {(data.recentActivity || []).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0"
              >
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notifications
          </h3>
          <div className="space-y-3">
            {(data.notifications || []).map((notif) => (
              <div
                key={notif.id}
                className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0"
              >
                <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Students Tab
const StudentsTab = () => {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api
      .request("/api/students")
      .then((data) => setStudents(data.students || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Roll No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Attendance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {student.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {student.class}-{student.section}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {student.rollNo}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {student.attendance}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Homework Tab
const HomeworkTab = ({ role }) => {
  const [homework, setHomework] = useState([]);

  useEffect(() => {
    api
      .request("/api/homework")
      .then((data) => setHomework(data.homework || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Homework</h2>
        {role === "teacher" && (
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Create Homework
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {homework.map((hw) => (
          <div key={hw.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{hw.title}</h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  hw.status === "submitted"
                    ? "bg-green-100 text-green-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {hw.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{hw.subject}</p>
            <p className="text-sm text-gray-500">Due: {hw.dueDate}</p>
            {role === "student" && hw.status === "pending" && (
              <button className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                Submit Homework
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Attendance Tab
const AttendanceTab = ({ role }) => {
  const attendanceData = [
    { date: "2025-12-09", present: 45, absent: 3, total: 48 },
    { date: "2025-12-08", present: 46, absent: 2, total: 48 },
    { date: "2025-12-07", present: 44, absent: 4, total: 48 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Present
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Absent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {attendanceData.map((record, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {record.date}
                </td>
                <td className="px-6 py-4 text-sm text-green-600">
                  {record.present}
                </td>
                <td className="px-6 py-4 text-sm text-red-600">
                  {record.absent}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {record.total}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {((record.present / record.total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
