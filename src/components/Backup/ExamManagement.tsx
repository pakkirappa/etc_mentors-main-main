import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Calendar, Clock, Users, BookOpen, FileText, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Search, Filter, Target, ArrowLeft, Save, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx'; // Assume xlsx library is installed for bulk upload parsing

const ExamManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [questionType, setQuestionType] = useState('mcq');
  const [examType, setExamType] = useState('single'); // 'single' or 'comprehensive'
  const [selectedSubjects, setSelectedSubjects] = useState(['Physics']);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [exams, setExams] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    questionType: 'mcq',
    options: ['', '', '', ''],
    correctAnswer: 0,
    marks: 4,
    difficulty: 'medium',
    explanation: ''
  });

  const [editQuestion, setEditQuestion] = useState({
    question: '',
    questionType: 'mcq',
    options: ['', '', '', ''],
    correctAnswer: 0,
    marks: 4,
    difficulty: 'medium',
    explanation: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchQuestions(selectedExam.id);
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error(`Failed to fetch exams: ${res.statusText}`);
      }
      const data = await res.json();
      const mappedExams = data.map(exam => ({
        id: exam.exam_id,
        title: exam.title,
        type: exam.exam_type,
        date: exam.start_date,
        time: exam.start_time,
        duration: exam.duration,
        totalMarks: exam.total_marks,
        participants: exam.participants,
        status: exam.status,
        venue: exam.venue,
        subjects: exam.subjects ? exam.subjects.split(',') : [],
        subjectMarks: parseSubjectMarks(exam.subject_marks_str),
        questionCount: exam.question_count,
        questions: [] // Questions fetched separately
      }));
      setExams(mappedExams);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  const fetchQuestions = async (examId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${examId}/questions`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to fetch questions');
      }
      const data = await res.json();
      setCurrentQuestions(data);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setCurrentQuestions([]);
    }
  };

  const parseSubjectMarks = (str) => {
    if (!str) return {};
    return str.split(',').reduce((acc, part) => {
      const [subject, marks] = part.split(':');
      if (subject && marks) {
        acc[subject.trim()] = parseInt(marks.trim(), 10);
      }
      return acc;
    }, {});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Easy':
        return 'bg-blue-100 text-blue-800';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Realtime':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (exam.subject && exam.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || exam.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleAddQuestion = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    // Validate required fields
    if (!newQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }
    
    if (newQuestion.questionType === 'mcq') {
      const hasEmptyOptions = newQuestion.options.some(option => !option.trim());
      if (hasEmptyOptions) {
        alert('Please fill all options for MCQ questions');
        return;
      }
    }

    const body = {
      question_text: newQuestion.question,
      question_type: newQuestion.questionType,
      difficulty: newQuestion.difficulty,
      marks: newQuestion.marks,
      explanation: newQuestion.explanation || null
    };

    if (newQuestion.questionType === 'mcq') {
      body.options = newQuestion.options.map((opt, idx) => ({
        option_text: opt,
        is_correct: idx === newQuestion.correctAnswer,
        option_order: idx
      }));
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${selectedExam.id}/questions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to add question');
      }
      await fetchQuestions(selectedExam.id);
      setNewQuestion({
        question: '',
        questionType: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: 4,
        difficulty: 'medium',
        explanation: ''
      });
      setShowAddQuestionModal(false);
      alert('Question added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add question');
    }
  };

  const handleEditQuestion = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    // Validate required fields
    if (!editQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }
    
    if (editQuestion.questionType === 'mcq') {
      const hasEmptyOptions = editQuestion.options.some(option => !option.trim());
      if (hasEmptyOptions) {
        alert('Please fill all options for MCQ questions');
        return;
      }
    }

    const body = {
      question_text: editQuestion.question,
      question_type: editQuestion.questionType,
      difficulty: editQuestion.difficulty,
      marks: editQuestion.marks,
      explanation: editQuestion.explanation || null
    };

    if (editQuestion.questionType === 'mcq') {
      body.options = editQuestion.options.map((opt, idx) => ({
        option_text: opt,
        is_correct: idx === editQuestion.correctAnswer,
        option_order: idx
      }));
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${selectedExam.id}/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to update question');
      }
      await fetchQuestions(selectedExam.id);
      setShowEditQuestionModal(false);
      setEditingQuestion(null);
      alert('Question updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${selectedExam.id}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to delete question');
      }
      await fetchQuestions(selectedExam.id);
      alert('Question deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to delete question');
    }
  };

  const openEditModal = (question) => {
    setEditingQuestion(question);
    setEditQuestion({
      question: question.question,
      questionType: question.type,
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer || 0,
      marks: question.marks,
      difficulty: question.difficulty,
      explanation: question.explanation || ''
    });
    setShowEditQuestionModal(true);
  };

  const handleBulkUpload = async (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      for (let row = 1; row < json.length; row++) {
        const [question_text, question_type, optionA, optionB, optionC, optionD, correct, marks, difficulty] = json[row] || [];

        if (!question_text || !question_type) continue;

        const body = {
          question_text,
          question_type,
          difficulty: difficulty || 'medium',
          marks: parseInt(marks) || 4,
          explanation: null // Can add column if needed
        };

        if (question_type === 'mcq' && optionA && optionB && optionC && optionD && correct) {
          const optionsTexts = [optionA, optionB, optionC, optionD];
          const correctIndex = correct.charCodeAt(0) - 65; // A=0, B=1, etc.
          body.options = optionsTexts.map((opt, idx) => ({
            option_text: opt,
            is_correct: idx === correctIndex,
            option_order: idx
          }));
        }

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${selectedExam.id}/questions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
            // Optionally: localStorage.removeItem('token'); navigate('/login');
          }
          throw new Error('Failed to upload questions');
        }
      }

      await fetchQuestions(selectedExam.id);
      setShowBulkUploadModal(false);
      alert('Questions uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload questions');
    }
  };

  const handleSubjectToggle = (subject) => {
    if (examType === 'single') {
      setSelectedSubjects([subject]);
    } else {
      setSelectedSubjects(prev => 
        prev.includes(subject) 
          ? prev.filter(s => s !== subject)
          : [...prev, subject]
      );
    }
  };

  const getSubjectOptions = (type) => {
    // All subjects available for all exam types
    return ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  };

  const handleDeleteExam = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to delete exam');
      }
      await fetchExams();
      alert('Exam deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to delete exam');
    }
  };

  const ExamCard = ({ exam }) => {
    if (!exam) return null;
    
    const displaySubject = exam.subjects ? exam.subjects.join(', ') : exam.subject;
    const hasSubjectMarks = exam.subjectMarks && Object.keys(exam.subjectMarks).length > 1;
    
    return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exam.title}</h3>
          <p className="text-sm text-gray-600">{displaySubject}</p>
          {hasSubjectMarks && (
            <div className="mt-2 text-xs text-gray-500">
              {Object.entries(exam.subjectMarks).map(([subject, marks]) => (
                <span key={subject} className="inline-block mr-3">
                  {subject}: {marks}m
                </span>
              ))}
            </div>
          )}
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
            exam.type === 'IIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {exam.type}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
          {getStatusIcon(exam.status)}
          {exam.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          {exam.date}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {exam.time} ({exam.duration} min)
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          {exam.participants} participants
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Target className="w-4 h-4" />
          {exam.totalMarks} marks
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Questions: {exam.questionCount}</span>
          <button
            onClick={() => {
              setSelectedExam(exam);
              setActiveTab('questions');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage Questions →
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-500">{exam.venue}</span>
        <div className="flex gap-2">
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDeleteExam(exam.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    );
  };

  const QuestionManagement = () => {
    if (!selectedExam) {
      return (
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Exam Selected</h2>
            <p className="text-gray-600">Please select an exam to manage questions.</p>
            <button
              onClick={() => setActiveTab('overview')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Exams
            </button>
          </div>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{selectedExam?.title}</h2>
            <p className="text-sm text-gray-600">Question Management</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowAddQuestionModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Question Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{currentQuestions.length}</div>
          <div className="text-sm text-gray-600">Total Questions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {currentQuestions.filter(q => q.type === 'mcq').length}
          </div>
          <div className="text-sm text-gray-600">MCQ Questions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {currentQuestions.filter(q => q.type === 'descriptive').length}
          </div>
          <div className="text-sm text-gray-600">Descriptive</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">
            {currentQuestions.reduce((sum, q) => sum + q.marks, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Marks</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {currentQuestions.map((question, index) => (
            <div key={question.id} className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.type === 'mcq' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {question.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {question.difficulty}
                    </span>
                    <span className="text-sm text-gray-500">{question.marks} marks</span>
                  </div>
                  <p className="text-gray-900 font-medium mb-3">{question.question}</p>
                  
                  {question.type === 'mcq' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`p-2 rounded border ${
                          optIndex === question.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <span className="text-sm">
                            {String.fromCharCode(65 + optIndex)}. {option}
                            {optIndex === question.correctAnswer && (
                              <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => openEditModal(question)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {currentQuestions.length === 0 && (
            <div className="p-12 text-center">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions added yet</h3>
              <p className="text-gray-600 mb-4">Start by adding questions to this exam</p>
              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Question
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals - Render at QuestionManagement level */}
      {showAddQuestionModal && <AddQuestionModal />}
      {showBulkUploadModal && <BulkUploadModal />}
      {showEditQuestionModal && <EditQuestionModal />}
    </div>
    );
  };

  const AddQuestionModal = () => {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Add Question to: {selectedExam?.title}
            </h2>
            <button
              onClick={() => setShowAddQuestionModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
              <select
                value={newQuestion.questionType}
                onChange={(e) => setNewQuestion({...newQuestion, questionType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="descriptive">Descriptive</option>
                <option value="numerical">Numerical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={newQuestion.difficulty}
                onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
              <input
                type="number"
                value={newQuestion.marks}
                onChange={(e) => setNewQuestion({...newQuestion, marks: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
            <textarea
              value={newQuestion.question}
              onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your question here..."
            />
          </div>

          {newQuestion.questionType === 'mcq' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {newQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={newQuestion.correctAnswer === index}
                    onChange={() => setNewQuestion({...newQuestion, correctAnswer: index})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[index] = e.target.value;
                      setNewQuestion({...newQuestion, options: newOptions});
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
            <textarea
              value={newQuestion.explanation}
              onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide explanation for the answer..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowAddQuestionModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const EditQuestionModal = () => {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Question - {selectedExam?.title}
            </h2>
            <button
              onClick={() => {
                setShowEditQuestionModal(false);
                setEditingQuestion(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
              <select
                value={editQuestion.questionType}
                onChange={(e) => setEditQuestion({...editQuestion, questionType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="descriptive">Descriptive</option>
                <option value="numerical">Numerical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={editQuestion.difficulty}
                onChange={(e) => setEditQuestion({...editQuestion, difficulty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
              <input
                type="number"
                value={editQuestion.marks}
                onChange={(e) => setEditQuestion({...editQuestion, marks: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
            <textarea
              value={editQuestion.question}
              onChange={(e) => setEditQuestion({...editQuestion, question: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your question here..."
            />
          </div>

          {editQuestion.questionType === 'mcq' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {editQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="editCorrectAnswer"
                    checked={editQuestion.correctAnswer === index}
                    onChange={() => setEditQuestion({...editQuestion, correctAnswer: index})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editQuestion.options];
                      newOptions[index] = e.target.value;
                      setEditQuestion({...editQuestion, options: newOptions});
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
            <textarea
              value={editQuestion.explanation}
              onChange={(e) => setEditQuestion({...editQuestion, explanation: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide explanation for the answer..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowEditQuestionModal(false);
                setEditingQuestion(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditQuestion}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Update Question
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const BulkUploadModal = () => {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Bulk Upload Questions to: {selectedExam?.title}
            </h2>
            <button
              onClick={() => setShowBulkUploadModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Excel File</h3>
            <p className="text-gray-600 mb-4">Upload questions in bulk using an Excel file</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleBulkUpload}
              className="hidden"
              id="bulk-upload"
            />
            <label
              htmlFor="bulk-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <span className="text-lg font-medium text-gray-900 mb-2">
                Click to upload Excel file
              </span>
              <span className="text-sm text-gray-500">
                Supports .xlsx and .xls files
              </span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Excel Format Guidelines:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Column A: Question Text</li>
              <li>• Column B: Question Type (mcq/descriptive/numerical)</li>
              <li>• Column C: Option A (for MCQ)</li>
              <li>• Column D: Option B (for MCQ)</li>
              <li>• Column E: Option C (for MCQ)</li>
              <li>• Column F: Option D (for MCQ)</li>
              <li>• Column G: Correct Answer (A/B/C/D for MCQ)</li>
              <li>• Column H: Marks</li>
              <li>• Column I: Difficulty (easy/medium/hard)</li>
            </ul>
          </div>

          <div className="flex justify-between items-center">
            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
              <Download className="w-4 h-4" />
              Download Sample Template
            </button>
            <button
              onClick={() => setShowBulkUploadModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const CreateExamModal = () => {
    if (!showCreateModal) return null;

    const [newExam, setNewExam] = useState({
      title: '',
      type: 'IIT',
      examType: 'single',
      subjects: ['Physics'],
      subjectMarks: { Physics: 100 },
      totalMarks: 300,
      date: '',
      time: '',
      duration: 180,
      description: ''
    });

    const handleExamTypeChange = (type) => {
      if (type === 'single') {
        const defaultSubject = 'Physics';
        setNewExam(prev => ({
          ...prev,
          examType: type,
          subjects: [defaultSubject],
          subjectMarks: { [defaultSubject]: prev.totalMarks }
        }));
      } else {
        setNewExam(prev => ({
          ...prev,
          examType: type,
          subjects: [],
          subjectMarks: {}
        }));
      }
    };

    const handleSubjectChange = (subject) => {
      if (newExam.examType === 'single') {
        setNewExam(prev => ({ 
          ...prev, 
          subjects: [subject],
          subjectMarks: { [subject]: prev.totalMarks }
        }));
      } else {
        setNewExam(prev => {
          const isSelected = prev.subjects.includes(subject);
          const newSubjects = isSelected
            ? prev.subjects.filter(s => s !== subject)
            : [...prev.subjects, subject];
          
          const newSubjectMarks = { ...prev.subjectMarks };
          if (isSelected) {
            delete newSubjectMarks[subject];
          } else {
            const defaultMarks = Math.floor(prev.totalMarks / (newSubjects.length));
            newSubjectMarks[subject] = defaultMarks;
          }
          
          return {
            ...prev,
            subjects: newSubjects,
            subjectMarks: newSubjectMarks
          };
        });
      }
    };

    const handleSubjectMarksChange = (subject, marks) => {
      setNewExam(prev => ({
        ...prev,
        subjectMarks: {
          ...prev.subjectMarks,
          [subject]: parseInt(marks) || 0
        }
      }));
    };

    const handleTotalMarksChange = (totalMarks) => {
      const total = parseInt(totalMarks) || 0;
      
      if (newExam.examType === 'single' && newExam.subjects.length > 0) {
        setNewExam(prev => ({
          ...prev,
          totalMarks: total,
          subjectMarks: { [prev.subjects[0]]: total }
        }));
      } else {
        setNewExam(prev => ({ ...prev, totalMarks: total }));
      }
    };

    const getTotalAllocatedMarks = () => {
      return Object.values(newExam.subjectMarks).reduce((sum, marks) => sum + (marks || 0), 0);
    };

    const isMarksAllocationValid = () => {
      const totalAllocated = getTotalAllocatedMarks();
      return totalAllocated === newExam.totalMarks;
    };
    
    const handleCreateExam = async (e) => {
      e.preventDefault();
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found. Please log in.');
        return;
      }

      if (!newExam.title || !newExam.date || !newExam.time || newExam.subjects.length === 0) {
        alert('Please fill all required fields and select at least one subject');
        return;
      }

      if (newExam.examType === 'comprehensive' && !isMarksAllocationValid()) {
        alert(`Total allocated marks (${getTotalAllocatedMarks()}) must equal total exam marks (${newExam.totalMarks})`);
        return;
      }

      const subjectsData = newExam.subjects.map(s => ({
        subject: s,
        marks: newExam.subjectMarks[s]
      }));

      const body = {
        title: newExam.title,
        exam_type: newExam.type,
        exam_format: newExam.examType,
        total_marks: newExam.totalMarks,
        duration: newExam.duration,
        start_date: newExam.date,
        start_time: newExam.time,
        venue: 'Online Platform',
        status: 'scheduled',
        description: newExam.description,
        subjects: subjectsData
      };

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
            // Optionally: localStorage.removeItem('token'); navigate('/login');
          }
          throw new Error('Failed to create exam');
        }
        await fetchExams();
        setShowCreateModal(false);
        alert('Exam created successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to create exam');
      }
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Create New Exam</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleCreateExam} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input
                  type="text"
                  value={newExam.title}
                  onChange={(e) => setNewExam({...newExam, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter exam title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                <select 
                  value={newExam.type}
                  onChange={(e) => setNewExam({...newExam, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="IIT">IIT</option>
                  <option value="NEET">NEET</option>
                </select>
              </div>
            </div>

            {/* Exam Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Exam Format</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => handleExamTypeChange('single')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    newExam.examType === 'single' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={newExam.examType === 'single'}
                      onChange={() => handleExamTypeChange('single')}
                      className="w-4 h-4 text-blue-600 mr-2"
                    />
                    <h3 className="font-medium text-gray-900">Single Subject</h3>
                  </div>
                  <p className="text-sm text-gray-600">Focus on one specific subject</p>
                </div>
                
                <div 
                  onClick={() => handleExamTypeChange('comprehensive')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    newExam.examType === 'comprehensive' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={newExam.examType === 'comprehensive'}
                      onChange={() => handleExamTypeChange('comprehensive')}
                      className="w-4 h-4 text-blue-600 mr-2"
                    />
                    <h3 className="font-medium text-gray-900">Comprehensive</h3>
                  </div>
                  <p className="text-sm text-gray-600">Multiple subjects in one exam</p>
                </div>
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {newExam.examType === 'single' ? 'Select Subject' : 'Select Subjects'}
              </label>
              
              {newExam.examType === 'single' ? (
                <select
                  value={newExam.subjects[0] || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {getSubjectOptions(newExam.type).map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {getSubjectOptions(newExam.type).map(subject => (
                    <label key={subject} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newExam.subjects.includes(subject)}
                        onChange={() => handleSubjectChange(subject)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{subject}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {newExam.examType === 'comprehensive' && newExam.subjects.length === 0 && (
                <p className="text-sm text-red-600 mt-1">Please select at least one subject</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={newExam.totalMarks}
                  onChange={(e) => handleTotalMarksChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="300"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={newExam.duration}
                  onChange={(e) => setNewExam({...newExam, duration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="180"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newExam.date}
                  onChange={(e) => setNewExam({...newExam, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={newExam.time}
                  onChange={(e) => setNewExam({...newExam, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Subject-wise Marks Allocation for Comprehensive Exams */}
            {newExam.examType === 'comprehensive' && newExam.subjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Subject-wise Marks Allocation</label>
                <div className="space-y-3">
                  {newExam.subjects.map(subject => (
                    <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{subject}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={newExam.subjectMarks[subject] || 0}
                          onChange={(e) => handleSubjectMarksChange(subject, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                          min="0"
                          max={newExam.totalMarks}
                        />
                        <span className="text-sm text-gray-500">marks</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-semibold text-blue-900">Total Allocated:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        isMarksAllocationValid() ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {getTotalAllocatedMarks()}
                      </span>
                      <span className="text-blue-700">/ {newExam.totalMarks} marks</span>
                    </div>
                  </div>
                  
                  {!isMarksAllocationValid() && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {getTotalAllocatedMarks() > newExam.totalMarks 
                          ? 'Allocated marks exceed total marks' 
                          : 'Please allocate all marks to subjects'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newExam.description}
                onChange={(e) => setNewExam({...newExam, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Exam description..."
              />
            </div>

            {/* Preview Section */}
            {newExam.subjects.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Exam Preview:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Title:</strong> {newExam.title || 'Untitled Exam'}</p>
                  <p><strong>Type:</strong> {newExam.type}</p>
                  <p><strong>Format:</strong> {newExam.examType === 'single' ? 'Single Subject' : 'Comprehensive'}</p>
                  <p><strong>Subjects:</strong> {newExam.subjects.join(', ')}</p>
                  {newExam.examType === 'comprehensive' && (
                    <div>
                      <p><strong>Subject-wise Marks:</strong></p>
                      <ul className="ml-4 mt-1">
                        {newExam.subjects.map(subject => (
                          <li key={subject}>
                            • {subject}: {newExam.subjectMarks[subject] || 0} marks
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p><strong>Duration:</strong> {newExam.duration} minutes</p>
                  <p><strong>Total Marks:</strong> {newExam.totalMarks}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newExam.examType === 'comprehensive' && !isMarksAllocationValid()}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  newExam.examType === 'comprehensive' && !isMarksAllocationValid()
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Create Exam
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    );
  };

  if (activeTab === 'questions' && selectedExam) {
    return <QuestionManagement />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600 mt-1">Create, schedule, and manage examinations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Exams</p>
              <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{exams.filter(e => e.status === 'scheduled').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{exams.filter(e => e.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{exams.reduce((sum, exam) => sum + exam.questionCount, 0)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <HelpCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredExams.map(exam => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && <CreateExamModal />}
    </div>
  );
};

export default ExamManagement;