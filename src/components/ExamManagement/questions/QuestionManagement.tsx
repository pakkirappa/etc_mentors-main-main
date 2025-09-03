// src/components/ExamManagement/questions/QuestionManagement.tsx
import React, { useEffect, useState } from 'react';
import type { Exam } from '../ExamManagement';
import { ArrowLeft, Plus, FileSpreadsheet, Download } from 'lucide-react';
import AddQuestionModal from './AddQuestionModal';
import EditQuestionModal from './EditQuestionModal';
import BulkUploadModal from './BulkUploadModal';
import { toast } from "react-toastify";
import { confirmDialog } from '../../../common/confirm';
import { FileText } from 'lucide-react';

type Question = {
  id: number;
  question: string;
  type: 'mcq' | 'descriptive' | 'numerical';
  options?: string[];
  correctAnswer?: number;
  marks?: number;
  difficulty?: string;
  explanation?: string;           
};

type Props = { exam: Exam; onClose: () => void; };

const QuestionManagement: React.FC<Props> = ({ exam, onClose }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const usedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const totalMarks = Number(exam.totalMarks || 0);
  const remainingMarks = Math.max(totalMarks - usedMarks, 0);
  const isReadOnly = ["active", "completed"].includes(String(exam.status || "").toLowerCase());
  useEffect(() => {
    fetchQuestions();
  }, [exam]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/questions`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      // Normalize if needed
      const mapped: Question[] = (data || []).map((q: any) => ({
        id: q.question_id ?? q.id,
        question: q.question_text ?? q.question,
        type: q.question_type ?? q.type,
        options: q.options ? q.options.map((o: any) => o.option_text ?? o) : (q.options_list || []),
        correctAnswer: q.options ? q.options.findIndex((o: any) => o.is_correct) : q.correctAnswer ?? 0,
        marks: q.marks,
        difficulty: q.difficulty,
        explanation: q.explanation
      }));
      setQuestions(mapped);
    } catch (err) {
      console.error(err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: number) => {
    const ok = await confirmDialog('Delete this question?', { danger: true, confirmText: "Delete" });
    if (!ok) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/questions/${questionId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Failed to delete question');
      await fetchQuestions();
      toast.success('Question deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete question');
    }
  };

  // --- Sample CSV download placed BEFORE Bulk Upload ---
  const downloadSample = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/questions/template.csv`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questions_template_exam_${exam.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('Could not download sample file.');
    }
  };

  const downloadAnswerKeyPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/answer-key.pdf`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${exam.id}_answer_key.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('Could not download answer key.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700"><ArrowLeft /></button>
            <div>
              <h2 className="text-xl font-semibold">{exam.title}</h2>
              <p className="text-sm text-gray-600">Question Management</p>
              {isReadOnly && (
                <div className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
                  This exam is {String(exam.status).toLowerCase()}. Questions are view-only.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {/* Download sample BEFORE Bulk Upload */}
            <button onClick={downloadSample} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg">
              <Download size={18} /> Download sample (CSV)
            </button>
            <button
              onClick={downloadAnswerKeyPdf}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg"
              title="Download Answer Key (PDF)"
            >
              <FileText size={18} /> Key (PDF)
            </button>
             {!isReadOnly && (
              <>
                <button
                  onClick={() => setShowBulk(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  <FileSpreadsheet />Bulk Upload
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
                  disabled={remainingMarks <= 0}
                  title={remainingMarks <= 0 ? "No marks remaining" : "Add a new question"}
                >
                  <Plus />Add Question
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{questions.filter(q => q.type === 'mcq').length}</div>
            <div className="text-sm text-gray-600">MCQ Questions</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{questions.filter(q => q.type !== 'mcq').length}</div>
            <div className="text-sm text-gray-600">Descriptive/Numerical</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{questions.reduce((s, q) => s + (q.marks || 0), 0)}</div>
            <div className="text-sm text-gray-600">Total Marks</div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Questions</h3>
          </div>
          <div className="divide-y">
            {loading && <div className="p-6 text-gray-500">Loading questions...</div>}
            {!loading && questions.length === 0 && (
              <div className="p-12 text-center text-gray-500">No questions yet. Add some or bulk upload.</div>
            )}

            {questions.map((q, idx) => (
              <div key={q.id} className="p-6 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">Q{idx + 1}</span>
                    <span className={`px-2 py-1 text-xs rounded ${q.type === 'mcq' ? 'bg-blue-50' : 'bg-green-50'}`}>{q.type.toUpperCase()}</span>
                    <span className="text-sm text-gray-500">{q.marks ?? 0} marks</span>
                    <span className="text-sm text-gray-500">{q.difficulty}</span>
                  </div>
                  <div className="text-gray-900 font-medium mb-3">{q.question}</div>
                  {q.type === 'mcq' && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, i) => (
                        <div key={i} className={`p-2 rounded border ${q.correctAnswer === i ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {!isReadOnly && (
                    <>
                      <button
                        onClick={() => setEditing(q)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isReadOnly && showAdd && (
        <AddQuestionModal
          examId={exam.id}                        
          remainingMarks={remainingMarks}
          onClose={() => { setShowAdd(false); fetchQuestions(); }}
          onSaved={() => { fetchQuestions(); }}    
        />
      )}

      {!isReadOnly && editing && (
        <EditQuestionModal
          open={true}
          initial={{
            question_id: editing.id,
            exam_id: exam.id,
            question_text: editing.question,
            question_type: editing.type,
            difficulty: editing.difficulty || "",
            marks: editing.marks || 1,
            explanation: editing.explanation || null,
            created_at: new Date().toISOString(),
            options: editing.options
              ? editing.options.map((opt, idx) => ({
                  option_id: idx + 1,
                  question_id: editing.id,
                  option_text: opt,
                  is_correct: editing.correctAnswer === idx ? 1 : 0,
                  option_order: idx,
                }))
              : undefined,
          }}
          // NEW: allow raising up to remaining + this question’s current marks
          remainingMarks={remainingMarks + (Number(editing.marks) || 0)}
          onClose={() => { setEditing(null); fetchQuestions(); }}
          onUpdateApi={async (payload) => {
            const token = localStorage.getItem("token");
            await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/questions/${payload.question_id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
              }
            );
            await fetchQuestions();
          }}
        />
      )}
      {showBulk && <BulkUploadModal exam={exam} onClose={() => { setShowBulk(false); fetchQuestions(); }} />}
    </div>
  );
};

export default QuestionManagement;
