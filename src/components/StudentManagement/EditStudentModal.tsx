import React from 'react';
import { Student } from './StudentManagement';

interface Props {
  student: Student;
  onChange: (field: keyof Student, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const EditStudentModal: React.FC<Props> = ({
  student,
  onChange,
  onSave,
  onCancel,
  isSaving,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4">Edit Student: {student.name}</h2>

      <label className="block mb-2 font-medium">Status</label>
      <select
        value={student.status}
        onChange={(e) => onChange('status', e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="Suspended">Suspended</option>
      </select>

      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
);

export default EditStudentModal;
