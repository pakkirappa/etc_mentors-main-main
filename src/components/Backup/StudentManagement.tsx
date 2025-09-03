import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  class: string;
  stream: string;
  preference: string;
  joinDate: string;
  examsTaken: number;
  avgScore: number;
  lastActive: string;
  status: string;
}

const StudentManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & action states
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format date helper
  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Fetch students with exams info
  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/students`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        if (response.status === 401) {
          console.error(
            'Unauthorized: Invalid or expired token. Redirecting to login...'
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const users = await response.json();

      // Fetch exams per student and build student data
      const studentData = await Promise.all(
        users.map(async (user: any) => {
          const examsResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/students/${user.user_id}/exams`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!examsResponse.ok) {
            if (examsResponse.status === 401) {
              console.error(
                'Unauthorized: Invalid or expired token. Redirecting to login...'
              );
            }
            throw new Error(`Failed to fetch exams for user ${user.user_id}`);
          }
          const exams = examsResponse.ok ? await examsResponse.json() : [];
          const examsTaken = exams.length;
          const avgScore =
            examsTaken > 0
              ? exams.reduce(
                  (sum: number, exam: any) => sum + (exam.percentage || 0),
                  0
                ) / examsTaken
              : 0;
          const preference = exams.some((exam: any) => exam.exam_type === 'IIT')
            ? 'IIT'
            : exams.some((exam: any) => exam.exam_type === 'NEET')
            ? 'NEET'
            : 'N/A';
          const lastActive =
            exams
              .filter((exam: any) => exam.completed_at)
              .sort(
                (a: any, b: any) =>
                  new Date(b.completed_at).getTime() -
                  new Date(a.completed_at).getTime()
              )[0]?.completed_at || user.updated_at;

          return {
            id: user.user_id,
            name: user.full_name || user.username || 'Unknown',
            email: user.email || 'N/A',
            phone: '+91 N/A', // Default value, extend if needed
            class: '12th', // Default, extend if available
            stream: 'Science', // Default, extend if available
            preference,
            joinDate: formatDate(user.created_at),
            examsTaken,
            avgScore: Number(avgScore.toFixed(1)),
            lastActive: formatDate(lastActive),
            status: user.status
              ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
              : 'Active',
          };
        })
      );

      setStudents(studentData);
    } catch (err: any) {
      setError(`Error fetching students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle edits on form fields
  const handleEditChange = (field: keyof Student, value: string) => {
    if (editStudent) {
      setEditStudent({ ...editStudent, [field]: value });
    }
  };

  // Save edited student to backend
  const handleEditSave = async () => {
    if (!editStudent) return;
    setIsEditSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/students/${editStudent.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: editStudent.status.toLowerCase(),
            // Extend this body with other editable fields if needed
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update student');
      }
      setEditStudent(null);
      fetchStudents();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsEditSaving(false);
    }
  };

  // Delete student handler
  const handleDelete = async () => {
    if (deleteStudentId === null) return;
    setIsDeleting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/students/${deleteStudentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete student');
      }
      setDeleteStudentId(null);
      fetchStudents();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered students based on search and filter dropdown
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      student.preference === filterType ||
      student.status.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">Loading...</div>
    );
  if (error)
    return (
      <div className="p-6 text-center text-red-500">Error: {error}</div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Student Management
        </h1>
        <div className="flex items-center space-x-3">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Students
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Students
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter((s) => s.status === 'Active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Performance
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length > 0
                  ? (
                      students.reduce((sum, s) => sum + s.avgScore, 0) /
                      students.length
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Students</option>
              <option value="IIT">IIT Students</option>
              <option value="NEET">NEET Students</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {student.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {student.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {student.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {student.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">
                        {student.class} - {student.stream}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.preference === 'IIT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {student.preference}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">
                        {student.examsTaken} exams
                      </div>
                      <div className="text-sm text-gray-500">
                        Avg: {student.avgScore}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.status}
                      </span>
                      <div className="text-xs text-gray-500">
                        Last: {student.lastActive}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        onClick={() => setViewStudent(student)}
                        title="View Student"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-yellow-600 hover:text-yellow-900 transition-colors"
                        onClick={() => setEditStudent(student)}
                        title="Edit Student"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900 transition-colors"
                        onClick={() => setDeleteStudentId(student.id)}
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Student Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              View Student: {viewStudent.name}
            </h2>
            <p>
              <strong>Email:</strong> {viewStudent.email}
            </p>
            <p>
              <strong>Phone:</strong> {viewStudent.phone}
            </p>
            <p>
              <strong>Class:</strong> {viewStudent.class}
            </p>
            <p>
              <strong>Stream:</strong> {viewStudent.stream}
            </p>
            <p>
              <strong>Preference:</strong> {viewStudent.preference}
            </p>
            <p>
              <strong>Status:</strong> {viewStudent.status}
            </p>
            <p>
              <strong>Joined:</strong> {viewStudent.joinDate}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewStudent(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              Edit Student: {editStudent.name}
            </h2>

            <label className="block mb-2 font-medium">Status</label>
            <select
              value={editStudent.status}
              onChange={(e) => handleEditChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditStudent(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                disabled={isEditSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={isEditSaving}
              >
                {isEditSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStudentId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
            <p>
              Are you sure you want to delete this student? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setDeleteStudentId(null)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
