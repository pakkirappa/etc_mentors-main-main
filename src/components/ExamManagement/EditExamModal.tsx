// src/components/ExamManagement/EditExamModal.tsx
import React, { useEffect, useState } from 'react';
import type { Exam } from './ExamManagement';
import { confirmDialog } from '../../common/confirm';

type Props = { exam: Exam; onClose: () => void; onUpdated: () => void; };

const allSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

// helper to ensure date is always in yyyy-MM-dd format
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const EditExamModal: React.FC<Props> = ({ exam, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    title: exam.title || '',
    type: (exam.type as 'IIT' | 'NEET') || 'IIT',
    examType: (exam.exam_format as 'single' | 'comprehensive') || 'single',
    subjects: exam.subjects ? [...exam.subjects] : [],
    subjectMarks: { ...(exam.subjectMarks || {}) } as Record<string, number>,
    totalMarks: exam.totalMarks || 300,
    date: formatDate(exam.date || ''),
    time: exam.time || '',
    duration: exam.duration || 180,
    description: exam.description || '',
    status: exam.status || 'scheduled',
    venue: exam.venue || 'Online Platform'
  });

  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: exam.title || '',
      type: (exam.type as 'IIT' | 'NEET') || 'IIT',
      examType: (exam.exam_format as 'single' | 'comprehensive') || 'single',
      subjects: exam.subjects ? [...exam.subjects] : [],
      subjectMarks: { ...(exam.subjectMarks || {}) },
      totalMarks: exam.totalMarks || 300,
      date: formatDate(exam.date || ''),
      time: exam.time || '',
      duration: exam.duration || 180,
      description: exam.description || '',
      status: exam.status || 'scheduled',
      venue: exam.venue || 'Online Platform'
    });
    setErrors({});
  }, [exam]);

  const rebalanceMarks = (marksObj: Record<string, number>, subjectsList: string[], total: number) => {
    if (subjectsList.length === 0) return {};
    const base = Math.floor(total / subjectsList.length);
    let remainder = total - base * subjectsList.length;
    const result: Record<string, number> = {};
    for (let i = 0; i < subjectsList.length; i++) {
      const s = subjectsList[i];
      result[s] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
    return result;
  };

  const toggleSubject = (s: string) => {
    if (form.examType === 'single') {
      setForm(prev => ({ ...prev, subjects: [s], subjectMarks: { [s]: prev.totalMarks } }));
      setErrors({});
      return;
    }
    setForm(prev => {
      const isSelected = prev.subjects.includes(s);
      const newSubjects = isSelected ? prev.subjects.filter(x => x !== s) : [...prev.subjects, s];
      const newMarks = { ...prev.subjectMarks };
      if (isSelected) {
        delete newMarks[s];
        if (prev.examType === 'comprehensive') {
          const rebalanced = rebalanceMarks(newMarks, newSubjects, prev.totalMarks);
          return { ...prev, subjects: newSubjects, subjectMarks: rebalanced };
        }
      } else {
        newMarks[s] = Math.max(1, Math.floor(prev.totalMarks / (newSubjects.length || 1)));
        if (prev.examType === 'comprehensive') {
          const rebalanced = rebalanceMarks(newMarks, newSubjects, prev.totalMarks);
          return { ...prev, subjects: newSubjects, subjectMarks: rebalanced };
        }
      }
      return { ...prev, subjects: newSubjects, subjectMarks: newMarks };
    });
  };

  const deleteSubject = async (s: string) => {
    const ok = await confirmDialog(`Delete subject "${s}" from exam?`, {
      danger: true,
      confirmText: "Delete",
    });
    if (!ok) return;
    setForm(prev => {
      const newSubjects = prev.subjects.filter(x => x !== s);
      const newMarksObj = { ...prev.subjectMarks };
      delete newMarksObj[s];
      if (prev.examType === 'comprehensive') {
        const rebalanced = rebalanceMarks(newMarksObj, newSubjects, prev.totalMarks);
        return { ...prev, subjects: newSubjects, subjectMarks: rebalanced };
      }
      return { ...prev, subjects: newSubjects, subjectMarks: newMarksObj };
    });
    setErrors({});
  };

  const updateMark = (subject: string, str: string) => {
    const v = parseInt(str || '0', 10);
    setForm(prev => ({ ...prev, subjectMarks: { ...prev.subjectMarks, [subject]: v } }));
    setErrors(prev => ({ ...prev, subjectMarks: '' }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.time) e.time = 'Time is required';
    if (!form.subjects || form.subjects.length === 0) e.subjects = 'At least one subject is required';
    if (!Number.isInteger(form.totalMarks) || form.totalMarks <= 0) e.totalMarks = 'Total marks must be a positive integer';
    if (form.examType === 'comprehensive') {
      const sum = Object.values(form.subjectMarks || {}).reduce((a, b) => a + (b || 0), 0);
      if (sum !== form.totalMarks) e.subjectMarks = `Sum of subject marks (${sum}) must equal total marks (${form.totalMarks})`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const subjectsPayload = form.subjects.map(s => ({ subject: s, marks: form.subjectMarks[s] || 0 }));
      const body = {
        title: form.title,
        exam_type: form.type,
        exam_format: form.examType,
        total_marks: form.totalMarks,
        duration: form.duration,
        start_date: form.date,
        start_time: form.time,
        venue: form.venue,
        status: form.status,
        description: form.description,
        subjects: subjectsPayload
      };
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${(exam as any).id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        let msg = `Failed to update (${res.status})`;
        try { const j = await res.json(); if (j && j.message) msg = j.message; } catch {}
        setErrors({ server: msg });
        return;
      }
      onUpdated();
    } catch (err) {
      console.error(err);
      setErrors({ server: 'Network error while updating exam' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit Exam</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Close</button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm">Title</label>
            <input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            {errors.title && <div className="text-xs text-red-600 mt-1">{errors.title}</div>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm">Exam Type</label>
              <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="IIT">IIT</option>
                <option value="NEET">NEET</option>
              </select>
            </div>

            <div>
              <label className="block text-sm">Format</label>
              <select value={form.examType} onChange={(e) => setForm(prev => ({ ...prev, examType: e.target.value as any }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="single">Single</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm">Total Marks</label>
              <input type="number" value={form.totalMarks} onChange={(e) => setForm(prev => ({ ...prev, totalMarks: parseInt(e.target.value || '0', 10) }))} className="w-full px-3 py-2 border rounded-lg" />
              {errors.totalMarks && <div className="text-xs text-red-600 mt-1">{errors.totalMarks}</div>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              {errors.date && <div className="text-xs text-red-600 mt-1">{errors.date}</div>}
            </div>
            <div>
              <label className="block text-sm">Time</label>
              <input type="time" value={form.time} onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              {errors.time && <div className="text-xs text-red-600 mt-1">{errors.time}</div>}
            </div>
            <div>
              <label className="block text-sm">Duration (min)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm(prev => ({ ...prev, duration: parseInt(e.target.value || '0', 10) }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm">Subjects</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {allSubjects.map(s => (
                <button key={`all-${s}`} type="button" onClick={() => toggleSubject(s)} className={`px-3 py-1 rounded-lg border ${form.subjects.includes(s) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            {errors.subjects && <div className="text-xs text-red-600 mt-1">{errors.subjects}</div>}

            <div className="space-y-2">
              {form.subjects.map(s => (
                <div key={`selected-${s}`} className="flex items-center gap-2">
                  <div className="w-32 text-sm">{s}</div>
                  <input type="number" value={form.subjectMarks[s] ?? 0} onChange={(e) => updateMark(s, e.target.value)} className="px-3 py-2 border rounded-lg w-36" />
                  <div className="text-sm text-gray-500">marks</div>
                  <button type="button" onClick={() => deleteSubject(s)} className="ml-4 text-red-500 text-sm">Delete</button>
                </div>
              ))}
            </div>
            {errors.subjectMarks && <div className="text-xs text-red-600 mt-1">{errors.subjectMarks}</div>}
          </div>

          <div>
            <label className="block text-sm">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {errors.server && <div className="text-sm text-red-600">{errors.server}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60">
              {saving ? 'Updating...' : 'Update Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExamModal;
