import React, { useState, useEffect } from 'react';
import {
  Filter,
  RotateCcw
} from 'lucide-react';
import StudentStats from './StudentStats';
// import SearchFilter from './SearchFilter';
import StudentsTable from './StudentsTable';
import ViewStudentModal from './ViewStudentModal';
import EditStudentModal from './EditStudentModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export interface Student {
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
  const [stateFilter, setStateFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [collegeFilter, setCollegeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [collegeOptions, setCollegeOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

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

  // Fetch students function (same as before) ...
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
      const params = new URLSearchParams();
      if (stateFilter)    params.append('state', stateFilter);
      if (districtFilter) params.append('district', districtFilter);
      if (regionFilter)   params.append('region', regionFilter);
      if (collegeFilter)  params.append('college', collegeFilter);
      if (statusFilter)  params.append('status', statusFilter);
      
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/students${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });

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
            phone: '+91 N/A',
            class: '12th',
            stream: 'Science',
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

    const fetchFilterOptions = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/students/filters`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setStateOptions(data.states || []);
      setDistrictOptions(data.districts || []);
      setRegionOptions(data.regions || []);
      setCollegeOptions(data.colleges || []);
      setStatusOptions(data.statuses || []);
    };


  useEffect(() => {
    fetchFilterOptions();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [stateFilter, districtFilter, regionFilter, collegeFilter, statusFilter]);

  // Edit handlers
  const handleEditChange = (field: keyof Student, value: string) => {
    if (editStudent) {
      setEditStudent({ ...editStudent, [field]: value });
    }
  };
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

  // Delete handler
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
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
        {/* <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors">
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </button> */}
      </div>

      <StudentStats students={students} />

      {/* <SearchFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
      /> */}
      <div className="bg-white rounded-xl shadow p-4 border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>
           <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setStateFilter(''); setDistrictFilter(''); setRegionFilter(''); }}
            className="border rounded-lg px-3 py-2"
          >
           <option value="">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setDistrictFilter(''); setRegionFilter(''); }}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All States</option>
            {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Districts</option>
            {districtOptions
              .filter(d => !stateFilter || true )
              .map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Regions</option>
            {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Colleges</option>
            {collegeOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
           onClick={() => { setStateFilter(''); setDistrictFilter(''); setRegionFilter(''); setCollegeFilter(''); setStatusFilter(''); }}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        </div>
      </div>

      <StudentsTable
        students={filteredStudents}
        onView={setViewStudent}
        onEdit={setEditStudent}
        onDelete={setDeleteStudentId}
      />

      {viewStudent && (
        <ViewStudentModal student={viewStudent} onClose={() => setViewStudent(null)} />
      )}

      {editStudent && (
        <EditStudentModal
          student={editStudent}
          onChange={handleEditChange}
          onSave={handleEditSave}
          onCancel={() => setEditStudent(null)}
          isSaving={isEditSaving}
        />
      )}

      {deleteStudentId !== null && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteStudentId(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default StudentManagement;
