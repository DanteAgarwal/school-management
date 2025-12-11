import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar, Bell, BookOpen, Users, GraduationCap, FileText, DollarSign,
  MessageSquare, LogOut, Menu, Home, CheckSquare, Clock, TrendingUp,
  AlertCircle, X, Plus, Edit, Trash2, Save, Upload, Download, Search,
  Filter, ChevronDown, Printer, CreditCard, Megaphone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

// WebSocket Manager
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.listeners = [];
    this.reconnectDelay = 1000;
    this.maxDelay = 30000;
  }

  connect(token) {
    if (this.ws) this.disconnect();
    const url = `${this.url}?token=${token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => { this.reconnectDelay = 1000; console.log('WS open'); };
    this.ws.onmessage = e => {
      try { const data = JSON.parse(e.data); this.listeners.forEach(cb => cb(data)); }
      catch { }
    };
    this.ws.onclose = (ev) => {
      if (ev && ev.code === 4001) { // customize server code for auth failed
        console.warn("WS auth failed; not reconnecting");
        return;
      }
      console.log("WS closed, reconnecting in", this.reconnectDelay);
      setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
        this.connect(token);
      }, this.reconnectDelay);
    };
    this.ws.onerror = () => this.ws.close();
  }

  subscribe(cb) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(x => x !== cb) } }
  send(obj) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj)); }
  disconnect() { try { this.ws.close(); } catch { } this.ws = null; }
}

const wsManager = new WebSocketManager("ws://school-management-o7bo.onrender.com/ws");

// API

const API_URL = "https://school-management-o7bo.onrender.com";
const api = {
  async request(endpoint, method = "GET", data = null, token = null, isFile = false) {
    const headers = {};

    if (!isFile) {
      headers["Content-Type"] = "application/json";
    }

    if (token) headers["Authorization"] = `Bearer ${token}`;

    let body = null;
    if (data) {
      if (isFile) body = data;
      else body = JSON.stringify(data);
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "API Error");
    }

    return await res.json();
  }
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Notification Dropdown
const NotificationDropdown = ({ notifications, onMarkRead, onMarkAllRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.notification-dropdown')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'homework': return <FileText className="w-4 h-4" />;
      case 'attendance': return <CheckSquare className="w-4 h-4" />;
      case 'fee': return <DollarSign className="w-4 h-4" />;
      case 'announcement': return <Megaphone className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="notification-dropdown relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-indigo-600 font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors duration-150
                    ${!notif.read ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}
                  `}
                  onClick={() => {
                    onMarkRead(notif.id);
                    // Optional: navigate to relevant tab
                    if (notif.action) {
                      // e.g., notif.action = "homework"
                      // You’d pass a callback like onNavigate
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!notif.read ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notif.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// Classes Tab
const ClassesTab = () => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.request("/api/classes").then(data => setClasses(data.classes || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Classes</h2>
        <button className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-bold text-xl mb-4">{cls.name}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Sections</span>
                <span className="font-semibold">{cls.sections.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Students</span>
                <span className="font-semibold">{cls.students}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Homework Tab with File Upload
const HomeworkTab = ({ role }) => {
  const [homework, setHomework] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      title: "",
      subject: "",
      dueDate: "",
      description: "",
    },
  });

  const loadHomework = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/homework", "GET", null, token);
    setHomework(data.homework || []);
  };

  useEffect(() => {
    loadHomework();
  }, []);

  // ------------------------ TEACHER CREATE HOMEWORK -----------------------
  const onCreateHomework = async (values) => {
    const token = localStorage.getItem("token");

    await api.request("/api/homework", "POST", values, token);

    reset();
    setShowCreateModal(false);
    loadHomework();
  };

  // ------------------------ STUDENT SUBMIT HOMEWORK -----------------------
  const onSubmitHomework = async (e) => {
    e.preventDefault();

    const file = e.target.file.files[0];
    const textAnswer = e.target.textAnswer.value;

    const fd = new FormData();
    fd.append("text_answer", textAnswer);
    if (file) fd.append("file", file);

    const token = localStorage.getItem("token");

    await api.request(
      `/api/homework/${selectedHomework.id}/submit`,
      "POST",
      fd,
      token,
      true
    );

    setShowSubmitModal(false);
    loadHomework();
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h2 className="text-3xl font-bold">Homework</h2>

        {role === "teacher" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Homework
          </button>
        )}
      </div>


      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {homework.map((hw) => (
          <div key={hw.id} className="bg-white p-6 rounded-xl shadow space-y-2">
            <h3 className="font-bold">{hw.title}</h3>
            <p>{hw.subject}</p>
            <p className="text-sm text-gray-500">Due: {hw.dueDate}</p>

            {role === "student" && hw.status === "pending" && (
              <button
                onClick={() => {
                  setSelectedHomework(hw);
                  setShowSubmitModal(true);
                }}
                className="btn-primary w-full"
              >
                Submit
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ===================== CREATE HOMEWORK ===================== */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Homework">
        <form onSubmit={handleSubmit(onCreateHomework)} className="space-y-4">

          <div>
            <label>Title</label>
            <input {...register("title")} className="form-input" required />
          </div>

          <div>
            <label>Subject</label>
            <input {...register("subject")} className="form-input" required />
          </div>

          <div>
            <label>Due Date</label>
            <input type="date" {...register("dueDate")} className="form-input" required />
          </div>

          <div>
            <label>Description</label>
            <textarea {...register("description")} className="form-input" rows={4} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>

        </form>
      </Modal>

      {/* ===================== SUBMIT HOMEWORK ===================== */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Homework">
        <form onSubmit={onSubmitHomework} className="space-y-4">

          <div>
            <label>Text Answer</label>
            <textarea name="textAnswer" className="form-input" rows={4}></textarea>
          </div>

          <div>
            <label>Upload File</label>
            <input name="file" type="file" className="form-input" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit
            </button>
          </div>

        </form>
      </Modal>

    </div>
  );
};

// Attendance Tab with Marking Interface
const AttendanceTab = ({ role }) => {
  const [selectedClass, setSelectedClass] = useState("10-A");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState({
    "Alice Johnson": "present",
    "Bob Smith": "present",
    "Charlie Brown": "absent",
    "Diana Prince": "present",
  });

  const handleAttendanceChange = (student, status) => {
    setAttendanceData({ ...attendanceData, [student]: status });
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    await api.request("/api/attendance/mark", "POST", {
      class: selectedClass,
      date: selectedDate,
      attendance: attendanceData,
    }, token);

    toast.success("✅ Attendance saved successfully!");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Attendance</h2>

      {role === "teacher" && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="10-A">Class 10-A</option>
                <option value="10-B">Class 10-B</option>
                <option value="9-A">Class 9-A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            {Object.keys(attendanceData).map((student) => (
              <div key={student} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{student}</span>
                <div className="flex gap-2">
                  {["present", "absent", "late"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleAttendanceChange(student, status)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${attendanceData[student] === status
                        ? status === "present"
                          ? "bg-green-600 text-white"
                          : status === "absent"
                            ? "bg-red-600 text-white"
                            : "bg-yellow-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Attendance
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Present</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Absent</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">2025-12-09</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">45</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold">3</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">93.8%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Marks Tab with Report Card
const MarksTab = ({ role }) => {
  const [showReportCard, setShowReportCard] = useState(false);
  const marks = [
    { subject: "Mathematics", exam: "Mid Term", obtained: 85, total: 100, grade: "A" },
    { subject: "Physics", exam: "Mid Term", obtained: 78, total: 100, grade: "B+" },
    { subject: "Chemistry", exam: "Mid Term", obtained: 92, total: 100, grade: "A+" },
  ];

  const totalObtained = marks.reduce((sum, m) => sum + m.obtained, 0);
  const totalMax = marks.reduce((sum, m) => sum + m.total, 0);
  const percentage = ((totalObtained / totalMax) * 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Marks</h2>
        <button
          onClick={() => setShowReportCard(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center gap-2"
        >
          <Printer className="w-5 h-5" />
          View Report Card
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Exam</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Marks</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {marks.map((mark, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{mark.subject}</td>
                <td className="px-6 py-4 text-sm">{mark.exam}</td>
                <td className="px-6 py-4 text-sm">{mark.obtained}/{mark.total}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                    {mark.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showReportCard} onClose={() => setShowReportCard(false)} title="Report Card">
        <div className="space-y-6">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold text-indigo-900">Spring Valley School</h2>
            <p className="text-gray-600">Academic Year 2024-25</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Student Name:</span> Alice Johnson
            </div>
            <div>
              <span className="font-semibold">Class:</span> 10-A
            </div>
            <div>
              <span className="font-semibold">Roll No:</span> 15
            </div>
            <div>
              <span className="font-semibold">Exam:</span> Mid Term
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-bold">Marks</th>
                <th className="px-4 py-2 text-left text-xs font-bold">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {marks.map((mark, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm">{mark.subject}</td>
                  <td className="px-4 py-2 text-sm">{mark.obtained}/{mark.total}</td>
                  <td className="px-4 py-2 text-sm font-semibold">{mark.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total:</span>
              <span className="text-2xl font-bold text-indigo-900">{percentage}%</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="font-semibold">Overall Grade:</span>
              <span className="text-xl font-bold text-green-600">A</span>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print Report Card
          </button>
        </div>
      </Modal>
    </div>
  );
};

// Fees Tab with Payment
const FeesTab = ({ role }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: "", mode: "cash", transactionId: "" });

  const fees = [
    { id: 1, head: "Tuition Fee", amount: 15000, paid: 15000, status: "paid", dueDate: "2025-11-30" },
    { id: 2, head: "Lab Fee", amount: 2000, paid: 0, status: "pending", dueDate: "2025-12-15" },
    { id: 3, head: "Library Fee", amount: 1000, paid: 500, status: "partial", dueDate: "2025-12-10" },
  ];

  const totalDue = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
  const totalPending = totalDue - totalPaid;

  const handlePayment = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    await api.request(`/api/fees/${selectedFee.id}/pay`, "POST", paymentData, token);
    setShowPaymentModal(false);
    setPaymentData({ amount: "", mode: "cash", transactionId: "" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Fees</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-6">
          <p className="text-sm font-medium opacity-90">Total Due</p>
          <p className="text-3xl font-bold mt-2">₹{totalDue}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-6">
          <p className="text-sm font-medium opacity-90">Total Paid</p>
          <p className="text-3xl font-bold mt-2">₹{totalPaid}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg p-6">
          <p className="text-sm font-medium opacity-90">Pending</p>
          <p className="text-3xl font-bold mt-2">₹{totalPending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fees.map(fee => (
          <div key={fee.id} className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg">{fee.head}</h3>
              <span
                className={`px-3 py-1 text-xs rounded-full font-semibold ${fee.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : fee.status === "partial"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                  }`}
              >
                {fee.status}
              </span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">₹{fee.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold text-green-600">₹{fee.paid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-red-600">₹{fee.amount - fee.paid}</span>
              </div>
            </div>
            {fee.status !== "paid" && (
              <button
                onClick={() => {
                  setSelectedFee(fee);
                  setPaymentData({ ...paymentData, amount: fee.amount - fee.paid });
                  setShowPaymentModal(true);
                }}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay Now
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Make Payment">
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select
              value={paymentData.mode}
              onChange={(e) => setPaymentData({ ...paymentData, mode: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          {paymentData.mode !== "cash" && (
            <div>
              <label className="block text-sm font-medium mb-1">Transaction ID</label>
              <input
                type="text"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Process Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Timetable Tab
const TimetableTab = () => {
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    api.request("/api/timetable", "GET", null, token).then(data => setTimetable(data.timetable || []));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Timetable</h2>

      <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Period</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Mon</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tue</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Wed</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Thu</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Fri</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase">Sat</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {timetable.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-bold">{row.period}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{row.time}</td>
                <td className="px-4 py-4 text-sm">{row.monday}</td>
                <td className="px-4 py-4 text-sm">{row.tuesday}</td>
                <td className="px-4 py-4 text-sm">{row.wednesday}</td>
                <td className="px-4 py-4 text-sm">{row.thursday}</td>
                <td className="px-4 py-4 text-sm">{row.friday}</td>
                <td className="px-4 py-4 text-sm">{row.saturday}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Other Tabs (simplified)
const HomeTab = ({ data, role }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const stats = data.stats || {};
  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-4 rounded-xl ${color} shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {role === "admin" && (
          <>
            <StatCard label="Total Students" value={stats.totalStudents} icon={Users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
            <StatCard label="Total Teachers" value={stats.totalTeachers} icon={GraduationCap} color="bg-gradient-to-br from-green-500 to-green-600" />
            <StatCard label="Total Classes" value={stats.totalClasses} icon={BookOpen} color="bg-gradient-to-br from-purple-500 to-purple-600" />
            <StatCard label="Attendance Today" value={`${stats.attendanceToday}%`} icon={CheckSquare} color="bg-gradient-to-br from-orange-500 to-orange-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {(data.recentActivity || []).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notifications
          </h3>
          <div className="space-y-3">
            {(data.notifications || []).map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{notif.message}</p>
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
      const result = await api.request("/api/auth/login", "POST", { email, password });
      localStorage.setItem("token", result.access_token);
      onLogin(result.user);
    } catch {
      setError("Invalid credentials. Try: admin@school.com / admin123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-4 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            School Portal
          </h1>
          <p className="text-gray-600 mt-2">Welcome back! Please sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs">
          <p className="font-bold mb-2">Demo Credentials:</p>
          <p>Admin: admin@school.com / admin123</p>
          <p>Teacher: teacher@school.com / teacher123</p>
          <p>Student: student@school.com / student123</p>
        </div>
      </div>
    </div>
  );
};

const TeachersTab = () => {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "teacher123",

      subject: "",
      experience: "",
      qualification: "",
      classes: "",
    },
  });

  const loadTeachers = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/teachers", "GET", null, token);
    setTeachers(data.teachers || []);
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const onSubmit = async (values) => {
    const token = localStorage.getItem("token");

    if (editTeacher) {
      await api.request(`/api/teachers/${editTeacher.id}`, "PUT", values, token);
    } else {
      await api.request("/api/teachers", "POST", values, token);
    }

    setShowModal(false);
    reset();
    setEditTeacher(null);
    loadTeachers();
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h2 className="text-3xl font-bold">Teachers</h2>

        <button
          onClick={() => {
            setEditTeacher(null);
            reset();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Teacher
        </button>
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-xl shadow space-y-2">
            <h3 className="font-bold text-lg">{t.name}</h3>
            <p>Subject: {t.subject}</p>
            <p>Exp: {t.experience}</p>
            <p>Qualification: {t.qualification}</p>
            <p>Classes: {t.classes}</p>

            <button
              onClick={() => {
                setEditTeacher(t);
                reset(t);
                setShowModal(true);
              }}
              className="btn mt-3 bg-blue-600 text-white"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTeacher ? "Edit Teacher" : "Add Teacher"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {!editTeacher && (
            <>
              <label>Name</label>
              <input {...register("name")} className="form-input" required />

              <label>Email</label>
              <input {...register("email")} className="form-input" required />

              <label>Phone</label>
              <input {...register("phone")} className="form-input" required />

              <label>Password</label>
              <input {...register("password")} className="form-input" required />
            </>
          )}

          <label>Subject</label>
          <input {...register("subject")} className="form-input" required />

          <label>Experience</label>
          <input {...register("experience")} className="form-input" />

          <label>Qualification</label>
          <input {...register("qualification")} className="form-input" />

          <label>Classes (comma separated)</label>
          <input {...register("classes")} className="form-input" />

          <div className="flex justify-end pt-4 gap-2">
            <button className="btn" type="button" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" type="submit">Save</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

const StudentsTab = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      class_id: "",
      section_id: "",
      roll_no: "",
      admission_no: "",
    },
  });

  const selectedClass = watch("class_id");

  // LOAD STUDENTS
  const loadStudents = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/students", "GET", null, token);
    setStudents(data.students || []);
  };

  // LOAD CLASSES FOR DROPDOWN
  const loadClasses = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/classes", "GET", null, token);
    setClasses(data.classes || []);
  };

  // LOAD SECTIONS WHEN CLASS SELECTED
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      return;
    }

    const c = classes.find((cls) => cls.id == selectedClass);
    if (c) setSections(c.sections.map((s) => ({ id: s, name: s })));
  }, [selectedClass, classes]);

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  // SUBMIT
  const onSubmit = async (values) => {
    const token = localStorage.getItem("token");

    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      admission_no: values.admission_no,
      class_: values.class_id,
      section: values.section_id,
      roll_no: Number(values.roll_no),
    };

    if (editingStudent) {
      await api.request(`/api/students/${editingStudent.id}`, "PUT", payload, token);
    } else {
      await api.request("/api/students", "POST", payload, token);
    }

    setShowModal(false);
    setEditingStudent(null);
    reset();
    loadStudents();
  };

  const onEdit = (s) => {
    setEditingStudent(s);

    reset({
      name: s.name,
      email: s.email,
      phone: s.phone,
      class_id: s.class,
      section_id: s.section,
      roll_no: s.rollNo,
      admission_no: s.admissionNo,
    });

    setShowModal(true);
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Students</h2>

        <button
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl flex items-center gap-2 shadow"
          onClick={() => {
            setEditingStudent(null);
            reset();
            setShowModal(true);
          }}
        >
          <Plus className="w-5 h-5" /> Add Student
        </button>
      </div>

      {/* STUDENT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow p-6 space-y-2 border border-gray-100">
            <h3 className="font-bold text-lg">{s.name}</h3>

            <p className="text-sm text-gray-600">
              Class {s.class}-{s.section}
            </p>
            <p className="text-sm">Roll: {s.rollNo}</p>
            <p className="text-xs text-gray-500">Admission: {s.admissionNo}</p>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => onEdit(s)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? "Edit Student" : "Add Student"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* NAME */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Name</label>
              <input {...register("name")} className="form-input rounded-lg" required />
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Email</label>
              <input {...register("email")} className="form-input rounded-lg" required />
            </div>

            {/* PHONE */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Phone</label>
              <input {...register("phone")} className="form-input rounded-lg" required />
            </div>

            {/* ADMISSION NO */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Admission No</label>
              <input {...register("admission_no")} className="form-input rounded-lg" required />
            </div>

            {/* CLASS DROPDOWN */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Class</label>
              <select {...register("class_id")} className="form-input rounded-lg" required>
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SECTION DROPDOWN */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Section</label>
              <select {...register("section_id")} className="form-input rounded-lg" required>
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ROLL NO */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Roll No</label>
              <input {...register("roll_no")} type="number" className="form-input rounded-lg" required />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-5 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
            >
              {editingStudent ? "Update" : "Create"}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
};


const ReportsTab = () => (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold">Reports</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { name: "Attendance Report", type: "Attendance", date: "2025-12-01" },
        { name: "Fee Collection", type: "Finance", date: "2025-12-01" },
        { name: "Academic Performance", type: "Academics", date: "2025-11-30" },
      ].map((report, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-md p-6">
          <FileText className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-bold text-lg mb-2">{report.name}</h3>
          <p className="text-sm text-gray-600 mb-4">{report.date}</p>
          <button className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            Download
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ChildrenTab = () => (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold">My Children</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { id: 1, name: "Alice Student", class: "10-A", rollNo: 15, attendance: 96.5 },
        { id: 2, name: "Bob Student", class: "8-B", rollNo: 22, attendance: 94.2 },
      ].map((child) => (
        <div key={child.id} className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {child.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-bold text-lg">{child.name}</h3>
              <p className="text-sm text-gray-600">Class {child.class}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Roll No:</span>
              <span className="font-semibold">{child.rollNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Attendance:</span>
              <span className="font-semibold text-green-600">{child.attendance}%</span>
            </div>
          </div>
          <button className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold">
            View Details
          </button>
        </div>
      ))}
    </div>
  </div>
);

const MessagesTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold">Messages</h2>
      <button className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold">
        Compose
      </button>
    </div>
    <div className="bg-white rounded-2xl shadow-md divide-y">
      {[
        { from: "John Teacher", subject: "Parent-Teacher Meeting", date: "2025-12-08", unread: true },
        { from: "Admin Office", subject: "Fee Payment Reminder", date: "2025-12-07", unread: false },
      ].map((msg, i) => (
        <div key={i} className={`p-6 hover:bg-gray-50 cursor-pointer ${msg.unread ? 'bg-blue-50' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold">{msg.from}</h3>
                {msg.unread && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
              </div>
              <p className="text-sm font-medium text-gray-700">{msg.subject}</p>
              <p className="text-xs text-gray-500 mt-1">{msg.date}</p>
            </div>
            <MessageSquare className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Dashboard Component
const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    wsManager.connect(localStorage.getItem("token"));

    const unsubscribe = wsManager.subscribe((data) => {
      if (data.type === "notification") {
        setNotifications((prev) => [data.notification, ...prev]);
      }
    });

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [user]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request(`/api/dashboard/${user.role}`, "GET", null, token);
    setDashboardData(data);
  };

  const loadNotifications = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/notifications", "GET", null, token);
    setNotifications(data.notifications || []);
  };

  const handleMarkRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const menuItems = {
    admin: [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "students", label: "Students", icon: Users },
      { id: "teachers", label: "Teachers", icon: GraduationCap },
      { id: "classes", label: "Classes", icon: BookOpen },
      { id: "subjects", label: "Subjects", icon: FileText },
      { id: "announcements", label: "Announcements", icon: Megaphone },
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
      { id: "fees", label: "Fees", icon: DollarSign },
      { id: "messages", label: "Messages", icon: MessageSquare },
    ],
  };

  const currentMenu = useMemo(() => menuItems[user.role] || menuItems.student, [user.role]);


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-72 bg-gradient-to-b from-indigo-900 via-indigo-800 to-purple-900 text-white transition-transform duration-300 flex flex-col shadow-2xl`}
      >
        <div className="p-6 flex items-center justify-between border-b border-indigo-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold">School Portal</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-indigo-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                  ? "bg-white text-indigo-900 shadow-lg font-semibold"
                  : "hover:bg-indigo-700 text-indigo-100"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-700 rounded-xl transition text-indigo-100"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-xs md:text-sm text-gray-600 capitalize">{user.role}</p>
            </div>
          </div>
          <NotificationDropdown
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === "home" && <HomeTab data={dashboardData} role={user.role} />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "teachers" && <TeachersTab />}
          {activeTab === "classes" && <ClassesTab />}
          {activeTab === "subjects" && <SubjectsTab />}
          {activeTab === "announcements" && <AnnouncementsTab user={user} />}
          {activeTab === "homework" && <HomeworkTab role={user.role} />}
          {activeTab === "attendance" && <AttendanceTab role={user.role} />}
          {activeTab === "fees" && <FeesTab role={user.role} />}
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "marks" && <MarksTab role={user.role} />}
          {activeTab === "timetable" && <TimetableTab />}
          {activeTab === "children" && <ChildrenTab />}
          {activeTab === "messages" && <MessagesTab />}
        </main>
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
    localStorage.setItem("user", JSON.stringify(userData));
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

// Subjects Tab
const SubjectsTab = () => {
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // RHF
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: "", code: "", classId: "" }
  });

  const loadSubjects = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/subjects", "GET", null, token);
    setSubjects(data.subjects || []);
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // CREATE handler
  const onSubmit = async (data) => {
    const token = localStorage.getItem("token");
    await api.request("/api/subjects", "POST", data, token);

    reset();
    setShowModal(false);
    loadSubjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Subjects</h2>

        <button
          onClick={() => {
            reset();
            setShowModal(true);
          }}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-bold text-xl mb-2">{subject.name}</h3>
            <p className="text-gray-600">Code: {subject.code}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Subject">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">Subject Name</label>
            <input
              {...register("name", { required: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject Code</label>
            <input
              {...register("code", { required: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
};


// Announcements Tab
const AnnouncementsTab = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { title: "", message: "", target: "all" }
  });

  const loadAnnouncements = async () => {
    const token = localStorage.getItem("token");
    const data = await api.request("/api/announcements", "GET", null, token);
    setAnnouncements(data.announcements || []);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const onSubmit = async (data) => {
    const token = localStorage.getItem("token");
    await api.request("/api/announcements", "POST", data, token);

    reset();
    setShowModal(false);
    loadAnnouncements();
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Announcements</h2>

        {user.role === "admin" && (
          <button
            onClick={() => {
              reset();
              setShowModal(true);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold flex items-center gap-2"
          >
            <Megaphone className="w-5 h-5" />
            New Announcement
          </button>
        )}
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{announcement.title}</h3>
                <p className="text-sm text-gray-500">{announcement.date}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                {announcement.target}
              </span>
            </div>
            <p className="text-gray-700">{announcement.message}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Announcement">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              {...register("title", { required: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              {...register("message", { required: true })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <select
              {...register("target")}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="teachers">Teachers</option>
              <option value="students">Students</option>
              <option value="parents">Parents</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
};

