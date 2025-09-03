// src/components/ExamManagement/ExamManagement.tsx
import React, { useEffect, useState } from 'react';
import ExamCard from './ExamCard';
import CreateExamModal from './CreateExamModal';
import EditExamModal from './EditExamModal';
import ViewExamModal from './ViewExamModal';
import QuestionManagement from './questions/QuestionManagement';
import { RotateCcw } from 'lucide-react';
import { toast } from "react-toastify";
import { confirmDialog } from '../../common/confirm';
export type Exam = {
  id: number;
  title: string;
  type: string;
  exam_format?: string;
  date?: string;          // may be 'YYYY-MM-DD' or ISO with time
  time?: string;
  duration?: number;
  totalMarks?: number;
  participants?: number;
  status?: string;
  venue?: string;
  subjects?: string[];
  subjectMarks?: Record<string, number>;
  questionCount?: number;
  description?: string;
  category?: string; // NEW
  set_type?: string | null;
};

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [viewExam, setViewExam] = useState<Exam | null>(null);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<Exam | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  // Date filters + validation
  const [startDateFilter, setStartDateFilter] = useState(''); // stored as yyyy-mm-dd
  const [endDateFilter, setEndDateFilter] = useState('');     // stored as yyyy-mm-dd
  const [dateError, setDateError] = useState('');

  const [categories, setCategories] = useState<string[]>([]); // NEW
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // NEW

  // --- helpers ---
  const normalizeToYMD = (val: string) => {
    if (!val) return '';
    // accept dd-mm-yyyy (or dd/mm/yyyy), convert to yyyy-mm-dd
    const m = val.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // accept yyyy-mm-dd already
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // try to parse anything else into ISO yyyy-mm-dd
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  };

  // convert any exam.date (date or ISO datetime) to yyyy-mm-dd for comparisons
  const examDateToYMD = (val?: string) => {
    if (!val) return '';
    // if it's already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // if looks like ISO "yyyy-mm-ddThh:mm:ssZ"
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return val.slice(0, 10);
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    fetchExams(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // validate & refetch when dates change (only when valid)
  useEffect(() => {
    if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) {
      setDateError('Start date cannot be after end date');
      return;
    }
    setDateError('');
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

    useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/exams/meta/exam-categories`;
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) throw new Error('Failed to load categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    };
    loadCategories();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter)   params.append('endDate', endDateFilter);
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory); // NEW
      }

      const url = `${import.meta.env.VITE_API_BASE_URL}/api/exams${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Failed to fetch exams');
      const data = await res.json();

      const mapped = (data || []).map((e: any) => ({
        id: e.exam_id ?? e.id,
        title: e.title,
        type: e.exam_type ?? e.type,
        exam_format: e.exam_format ?? e.exam_format,
        date: (e.start_date ?? e.date) ? (e.start_date ?? e.date) : undefined,
        time: e.start_time ?? e.time,
        duration: e.duration,
        totalMarks: e.total_marks ?? e.totalMarks,
        participants: e.participants ?? e.participants_count ?? 0,
        status: e.status,
        venue: e.venue,
        subjects: e.subjects
          ? (typeof e.subjects === 'string' ? e.subjects.split(',') : e.subjects)
          : (e.subjects_list ?? []),
        subjectMarks: e.subject_marks || parseSubjectMarks(e.subject_marks_str || ''),
        questionCount: e.questions_count ?? e.questionCount ?? 0,
        description: e.description ?? '',
        category: e.category ?? undefined,
          set_type: e.set_type ?? null // NEW
      }));
      setExams(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const parseSubjectMarks = (str: string) => {
    if (!str) return {};
    return str.split(',').reduce((acc: Record<string, number>, part) => {
      const [subject, marks] = part.split(':');
      if (subject && marks) acc[subject.trim()] = parseInt(marks.trim(), 10);
      return acc;
    }, {});
  };

  // summary calculations (over the fetched list)
  const totalExams = exams.length;
  const scheduledCount = exams.filter(e => e.status === 'scheduled').length;
  const activeCount = exams.filter(e => e.status === 'active').length;
  const totalQuestions = exams.reduce((sum, e) => sum + (e.questionCount ?? 0), 0);

  const handleDeleteExam = async (id: number) => {
    const ok = await confirmDialog('Are you sure you want to delete this exam?', { danger: true, confirmText: "Delete" });
    if (!ok) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Failed to delete exam');
      await fetchExams();
      toast.success('Exam deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete exam');
    }
  };

  // client-side filtering (search + status + date range as a safety net)
  const filtered = exams.filter(exam => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.subjects || []).join(', ').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;

    // date safety filter (inclusive)
    const examYMD = examDateToYMD(exam.date);
    let matchesDate = true;
    if (startDateFilter) matchesDate = matchesDate && !!examYMD && examYMD >= startDateFilter;
    if (endDateFilter)   matchesDate = matchesDate && !!examYMD && examYMD <= endDateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Reset date filters
  const handleResetDates = () => {
    setStartDateFilter('');
    setEndDateFilter('');
    setDateError('');
    setSelectedCategory('all');
    fetchExams();
  };

  // controlled inputs that normalize to yyyy-mm-dd
  const onChangeStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDateFilter(normalizeToYMD(e.target.value));
  };
  const onChangeEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDateFilter(normalizeToYMD(e.target.value));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Exam Management</h1>
          <p className="text-sm text-gray-600 mt-1">Create, view, edit and manage questions for exams.</p>
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or subject..."
            className="px-3 py-2 border rounded-lg"
          />
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Create Exam
          </button>
        </div>
      </div>

      {/* Date filters row */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500">Start Date</label>
          <input
            type="date"
            value={startDateFilter}
            onChange={onChangeStart}
            placeholder="dd-mm-yyyy"
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">End Date</label>
          <input
            type="date"
            value={endDateFilter}
            onChange={onChangeEnd}
            placeholder="dd-mm-yyyy"
            className="px-3 py-2 border rounded-lg"
          />
        </div>
          {/* NEW: Category filter */}
        <div>
          <label className="block text-xs text-gray-500">Category</label>
          <select
            className="px-3 py-2 border rounded-lg"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleResetDates}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border"
          title="Clear dates and show all exams"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        {dateError && <div className="text-red-600 text-sm">{dateError}</div>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="text-sm text-gray-500">Total Exams</div>
          <div className="text-2xl font-bold">{totalExams}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="text-sm text-gray-500">Scheduled</div>
          <div className="text-2xl font-bold">{scheduledCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold">{activeCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="text-sm text-gray-500">Total Questions</div>
          <div className="text-2xl font-bold">{totalQuestions}</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Filter:</span>
          <button onClick={() => setFilterStatus('all')} className={`px-3 py-1 rounded ${filterStatus === 'all' ? 'bg-blue-50' : 'bg-white'}`}>All</button>
          <button onClick={() => setFilterStatus('scheduled')} className={`px-3 py-1 rounded ${filterStatus === 'scheduled' ? 'bg-blue-50' : 'bg-white'}`}>Scheduled</button>
          <button onClick={() => setFilterStatus('active')} className={`px-3 py-1 rounded ${filterStatus === 'active' ? 'bg-blue-50' : 'bg-white'}`}>Active</button>
          <button onClick={() => setFilterStatus('completed')} className={`px-3 py-1 rounded ${filterStatus === 'completed' ? 'bg-blue-50' : 'bg-white'}`}>Completed</button>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading exams...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(exam => (
          <ExamCard
            key={exam.id}
            exam={exam}
            onView={() => setViewExam(exam)}
            onEdit={() => setEditingExam(exam)}
            onDelete={() => handleDeleteExam(exam.id)}
            onManageQuestions={() => setSelectedExamForQuestions(exam)}
            onRefresh={fetchExams}   // <-- 🔥 Add this
          />
        ))}
      </div>

     {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchExams(); }}
          onCreatedAndManage={(created) => {
            // created: { id, title, type, exam_format, totalMarks, duration, date, time, description }
            setShowCreate(false);
            // open QuestionManagement with the just-created exam
            setSelectedExamForQuestions({
              id: created.id,
              title: created.title,
              type: created.type,
              exam_format: created.exam_format,
              totalMarks: created.totalMarks,
              duration: created.duration,
              date: created.date,
              time: created.time,
              description: created.description,
              subjects: [], // will be fetched on QuestionManagement load
            });
            // also refresh the list in the background
            fetchExams();
          }}
        />
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onUpdated={() => { setEditingExam(null); fetchExams(); }}
        />
      )}

      {viewExam && <ViewExamModal exam={viewExam} onClose={() => setViewExam(null)} />}

      {selectedExamForQuestions && (
        <QuestionManagement
          exam={selectedExamForQuestions}
          onClose={() => { setSelectedExamForQuestions(null); fetchExams(); }}
        />
      )}
    </div>
  );
};

export default ExamManagement;
