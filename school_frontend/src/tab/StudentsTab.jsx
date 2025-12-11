import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, User, Trash2, Edit3, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "./components/Modal.jsx";

// Make sure you have defined these CSS classes globally or in Tailwind config:
// .form-input, .btn, .btn-primary

const StudentsTab = () => {
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { id, name }

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      class: "",
      section: "",
      rollNo: "",
      admissionNo: "",
    },
  });

  const loadStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const data = await api.request("/api/students", "GET", null, token);
      setStudents(data.students || []);
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (editingStudent) {
        await api.request(`/api/students/${editingStudent.id}`, "PUT", values, token);
        toast.success("Student updated successfully!");
      } else {
        await api.request("/api/students", "POST", values, token);
        toast.success("Student added successfully!");
      }
      setShowModal(false);
      setEditingStudent(null);
      reset();
      loadStudents();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const onEdit = (student) => {
    setEditingStudent(student);
    reset(student);
    setShowModal(true);
  };

  const openDeleteModal = (id, name) => {
    setDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.request(`/api/students/${deleteModal.id}`, "DELETE", null, token);
      toast.success(`${deleteModal.name} deleted`);
      loadStudents();
    } catch (err) {
      toast.error("Failed to delete student");
    } finally {
      setDeleteModal(null);
    }
  };

  // Avatar initials helper
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Students</h2>
        <button
          onClick={() => {
            setEditingStudent(null);
            reset();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      {/* Student Grid */}
      {students.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No students added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {students.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col"
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {getInitials(s.name)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-600">
                    {s.class}-{s.section}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-700 space-y-1 mb-4">
                <p><span className="font-medium">Roll:</span> {s.rollNo}</p>
                <p><span className="font-medium">Admission:</span> {s.admissionNo}</p>
                <p><span className="font-medium">Phone:</span> {s.phone}</p>
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => onEdit(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openDeleteModal(s.id, s.name)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? "Edit Student" : "Add New Student"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                {...register("name", { required: "Name is required" })}
                className={`form-input ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
                })}
                className={`form-input ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                {...register("phone", { required: "Phone is required" })}
                className={`form-input ${errors.phone ? "border-red-500" : ""}`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phone.message}</p>}
            </div>

            {/* Admission No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission No *</label>
              <input
                {...register("admissionNo", { required: "Admission number is required" })}
                className={`form-input ${errors.admissionNo ? "border-red-500" : ""}`}
              />
              {errors.admissionNo && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.admissionNo.message}</p>}
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <input
                {...register("class", { required: "Class is required" })}
                className={`form-input ${errors.class ? "border-red-500" : ""}`}
              />
              {errors.class && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.class.message}</p>}
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
              <input
                {...register("section", { required: "Section is required" })}
                className={`form-input ${errors.section ? "border-red-500" : ""}`}
              />
              {errors.section && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.section.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : editingStudent ? (
                "Update Student"
              ) : (
                "Add Student"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <span className="font-bold text-red-600">{deleteModal?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModal(null)}
              className="btn"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default StudentsTab;