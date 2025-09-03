import React from 'react';
import type { Exam } from './ExamManagement';
import { Calendar, Clock, Users, Target } from 'lucide-react';

type Props = {
  exam: Exam;
  onClose: () => void;
};

const ViewExamModal: React.FC<Props> = ({ exam, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{exam.title}</h2>
            <p className="text-sm text-gray-600">Read-only exam details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Close</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="font-medium">{exam.type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Format</div>
              <div className="font-medium">{exam.exam_format ?? exam.exam_format ?? 'single'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">{exam.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{exam.date ? new Date(exam.date).toLocaleDateString("en-GB") : "—"}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{exam.time ?? '—'} ({exam.duration ?? 0} min)</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" />{exam.participants ?? 0} participants</div>
            <div className="flex items-center gap-2"><Target className="w-4 h-4" />{exam.totalMarks ?? 0} marks</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Subjects & Marks</div>
            <div className="mt-2">
              {exam.subjects && exam.subjects.length ? (
                <div className="flex flex-wrap gap-2">
                  {exam.subjects.map(s => (
                    <div key={s} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="text-sm font-medium">{s}</div>
                      <div className="text-xs text-gray-500">{(exam.subjectMarks && exam.subjectMarks[s]) ?? '—'} marks</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No subjects configured</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Description</div>
            <div className="mt-2 text-gray-700">{exam.description || '—'}</div>
          </div>

          <div className="text-right">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewExamModal;
