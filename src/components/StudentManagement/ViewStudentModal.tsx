import React from 'react';
import { Student } from './StudentManagement';

interface Props {
  student: Student;
  onClose: () => void;
}

const ViewStudentModal: React.FC<Props> = ({ student, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4">View Student: {student.name}</h2>
      <p><strong>Email:</strong> {student.email}</p>
      <p><strong>Phone:</strong> {student.phone}</p>
      <p><strong>Class:</strong> {student.class}</p>
      <p><strong>Stream:</strong> {student.stream}</p>
      <p><strong>Preference:</strong> {student.preference}</p>
      <p><strong>Status:</strong> {student.status}</p>
      <p><strong>Joined:</strong> {student.joinDate ? new Date(student.joinDate).toLocaleDateString("en-GB") : "—"}</p>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default ViewStudentModal;
