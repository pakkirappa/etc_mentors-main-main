// src/components/ExamManagement/questions/BulkUploadModal.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import type { Exam } from '../ExamManagement';

type Props = { exam: Exam; onClose: () => void; };

const BulkUploadModal: React.FC<Props> = ({ exam, onClose }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rowsCount, setRowsCount] = useState<number | null>(null);

  const validateSheet = (sheetData: any[][]) => {
    // Expect at least header + one row and column A (question) and B (type)
    if (!sheetData || sheetData.length < 2) return 'Excel must contain header and at least one data row.';
    const header = sheetData[0].map((h: any) => (h || '').toString().trim().toLowerCase());
    if (header.length < 2) return 'Excel header must include at least two columns.';
    if (!header[0] || header[0].indexOf('question') === -1) return 'First column should be Question text.';
    if (!header[1] || header[1].indexOf('type') === -1) return 'Second column should be Question Type (mcq/descriptive/numerical).';
    return null;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) { setError('Select a file'); return; }
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const validationError = validateSheet(json);
      if (validationError) {
        setError(validationError);
        return;
      }
      setRowsCount(Math.max(0, json.length - 1));
      // If passes basic validation, proceed to upload rows
      setUploading(true);
      const token = localStorage.getItem('token');

      for (let r = 1; r < json.length; r++) {
        const [question_text, question_type, optionA, optionB, optionC, optionD, correct, marks, difficulty] = json[r] || [];
        if (!question_text || !question_type) continue;
        const body: any = {
          question_text,
          question_type,
          difficulty: difficulty || 'medium',
          marks: parseInt(marks || '4', 10) || 4,
          explanation: null
        };
        if (String(question_type).toLowerCase() === 'mcq' || String(question_type).toLowerCase() === 'mcq'.toLowerCase()) {
          if (optionA && optionB && optionC && optionD && correct) {
            const opts = [optionA, optionB, optionC, optionD];
            const correctIndex = String(correct).trim().toUpperCase().charCodeAt(0) - 65;
            body.options = opts.map((o: any, idx: number) => ({ option_text: o, is_correct: idx === correctIndex, option_order: idx }));
          } else {
            // skip invalid mcq row
            console.warn('Skipping MCQ row due to missing options or correct:', r + 1);
            continue;
          }
        }

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${exam.id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          console.warn('Row upload failed', r + 1);
        }
      }

      setUploading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to parse or upload file.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Bulk Upload Questions - {exam.title}</h3>
          <button onClick={onClose} className="text-gray-400">Close</button>
        </div>

        <div className="p-6 border-dashed border-2 border-gray-200 rounded-lg text-center">
          <input id="bulk-file" type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
          <label htmlFor="bulk-file" className="cursor-pointer">
            <div className="text-gray-500">Click to upload Excel file</div>
            <div className="mt-2 text-sm text-blue-600">{fileName ?? 'No file selected'}</div>
            <div className="mt-3 text-xs text-gray-500">Columns expected: Question | Type | OptA | OptB | OptC | OptD | Correct (A/B/C/D) | Marks | Difficulty</div>
          </label>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            {rowsCount !== null && <div className="text-sm text-gray-600 mt-1">Rows detected: {rowsCount}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">Close</button>
            <button disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60">{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
