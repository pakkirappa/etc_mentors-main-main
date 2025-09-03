// src/components/ExamManagement/ExamCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Edit, Trash2, Calendar, Clock, Users, Target, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Exam } from './ExamManagement';

type Props = {
  exam: Exam;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageQuestions: () => void;
  onRefresh: () => void;            
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'scheduled': return 'bg-gray-100 text-gray-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const MAX_SETS = 4;

const ExamCard: React.FC<Props> = ({ exam, onView, onEdit, onDelete, onManageQuestions, onRefresh }) => {
  const displaySubjects = (exam.subjects && exam.subjects.length) ? exam.subjects.join(', ') : 'N/A';
  const readOnly = ["active", "completed"].includes(String(exam.status || "").toLowerCase());
  const isRealtime = String(exam.category || '').toLowerCase() === 'realtime';

  // --- NEW: group sets state ---
  const [loadingSets, setLoadingSets] = useState(false);
  const [sets, setSets] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newSet, setNewSet] = useState('');

  const canAddMore = useMemo(() => sets.length < MAX_SETS, [sets.length]);

  // Fetch existing sets for this exam group (title + start_date + category)
  useEffect(() => {
    if (!isRealtime) return;
    let live = true;
    (async () => {
      try {
        setLoadingSets(true);
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/sets`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (live && Array.isArray(json?.sets)) {
            setSets(json.sets.filter(Boolean));
          }
        }
      } catch (e) {
        console.error('Failed to load sets', e);
      } finally {
        if (live) setLoadingSets(false);
      }
    })();
    return () => { live = false; };
  }, [exam.id, isRealtime]);

  const handleAddSet = async () => {
    const label = (newSet || '').trim();
    if (!label) {
      toast.error('Please enter the set (e.g., Set 2)');
      return;
    }
    if (sets.includes(label)) {
      toast.error('This set already exists for this exam group.');
      return;
    }
    if (!canAddMore) return;

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/create-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ set_type: label })
      });

      if (res.status === 409) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toast.error(message || 'This set already exists for this exam group.');
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to create set');
      }

      await res.json().catch(() => ({}));
      toast.success('Set created');
      // update local list
      setSets((prev) => [...prev, label]);
      setNewSet('');
      setAddOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create set');
    }
  };

   const handleDeleteExam = async () => {
    await onDelete();                
    onRefresh();                   
  };


  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exam.title}</h3>
          <p className="text-sm text-gray-600">{displaySubjects}</p>

          <div className="flex gap-2 mt-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${exam.type === 'IIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
              {exam.type}
            </span>
            
            {isRealtime && exam.set_type && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-200 text-purple-900 border border-purple-300">
                {exam.set_type}
              </span>
            )}
            {/* Category badge (optional) */}
            {exam.category && (
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {exam.category}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
          {exam.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {exam.date
            ? new Date(exam.date).toLocaleDateString("en-GB")
            : "—"}
        </div>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{exam.time ?? '—'} ({exam.duration ?? 0} min)</div>
        <div className="flex items-center gap-2"><Users className="w-4 h-4" />{exam.participants ?? 0} participants</div>
        <div className="flex items-center gap-2"><Target className="w-4 h-4" />{exam.totalMarks ?? 0} marks</div>
      </div>

      {/* Questions */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Questions: {exam.questionCount ?? 0}</span>
        <button
          onClick={onManageQuestions}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          title={readOnly ? "View only" : "Manage questions"}
        >
          {readOnly ? "View Questions →" : "Manage Questions →"}
        </button>
      </div>

      {/* NEW: Group Sets section (Realtime only) */}
      {isRealtime && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-900">Sets in this exam group</span>
            <span className="text-xs text-indigo-900/70">
              {loadingSets ? 'Loading…' : `${sets.length}/${MAX_SETS}`}
            </span>
          </div>

          {/* Existing sets as chips */}
         <div className="mt-2 flex flex-wrap gap-2">
            {sets.length === 0 && !loadingSets && (
              <span className="text-xs text-indigo-900/70">No sets yet.</span>
            )}
            {sets.map((s) => {
              const isCurrent = s === exam.set_type;
              return (
                <span
                  key={s}
                  className={`px-2 py-1 text-xs rounded-full border ${
                    isCurrent
                      ? "bg-purple-600 text-white border-purple-700 font-semibold"
                      : "bg-white border-indigo-200 text-indigo-900"
                  }`}
                >
                  {s}
                </span>
              );
            })}
          </div>

          {/* Add another set (until 4) */}
          {!readOnly && (
            <div className="mt-3">
              {!addOpen ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-indigo-200 bg-white hover:bg-indigo-100 disabled:opacity-50"
                  onClick={() => setAddOpen(true)}
                  disabled={!canAddMore}
                  title={canAddMore ? "Add another set" : "Maximum sets reached"}
                >
                  <Plus className="w-3 h-3" /> Add another set
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder={`e.g., Set ${sets.length + 1}`}
                    value={newSet}
                    maxLength={50}
                    onChange={(e) => setNewSet(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-indigo-200 bg-white hover:bg-indigo-100"
                    onClick={handleAddSet}
                    disabled={!newSet.trim() || !canAddMore}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    onClick={() => { setAddOpen(false); setNewSet(''); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-500">{exam.venue ?? 'Online Platform'}</span>
        <div className="flex gap-2">
          <button onClick={onView} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
          <button onClick={handleDeleteExam} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
