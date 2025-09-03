import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, Award, Clock, RotateCcw } from 'lucide-react';

interface Stats {
  total_students: number;
  total_exams: number;
  avg_score: number;
  completion_rate: number;
}

interface RecentExam {
  id: number;
  title: string;
  type: string;
  students: number;
  date: string;
  status: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    total_students: 0,
    total_exams: 0,
    avg_score: 0,
    completion_rate: 0
  });
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);

  // Date filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateError, setDateError] = useState<string>(''); // validation error msg

  // Handle start date
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && new Date(value) > new Date(endDate)) {
      setDateError('Start date cannot be later than end date.');
    } else {
      setDateError('');
    }
  };

  // Handle end date
  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value && new Date(value) < new Date(startDate)) {
      setDateError('End date cannot be earlier than start date.');
    } else {
      setDateError('');
    }
  };

  // Reset both dates
  const resetDates = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
  };

  useEffect(() => {
    // Skip API calls if invalid date range
    if (dateError) return;

    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found. Please log in.');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Build query params (avoid trailing ?)
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      const q = query.toString();

      try {
        // Fetch stats
        const statsRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/dashboard/stats${q ? `?${q}` : ''}`,
          { headers }
        );
        if (!statsRes.ok) throw new Error(`Failed to fetch stats: ${statsRes.statusText}`);
        const statsData = await statsRes.json();
        setStats({
          total_students: Number(statsData.total_students) || 0,
          total_exams: Number(statsData.total_exams) || 0,
          avg_score: Number(statsData.avg_score) || 0,
          completion_rate: Number(statsData.completion_rate) || 0,
        });

        // Fetch recent exams
        const examsRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/dashboard/recent-exams${q ? `?${q}` : ''}`,
          { headers }
        );
        if (!examsRes.ok) throw new Error(`Failed to fetch recent exams: ${examsRes.statusText}`);
        const examsData = await examsRes.json();
        const mapped: RecentExam[] = examsData.map((exam: any) => ({
          id: exam.exam_id,
          title: exam.title,
          type: exam.exam_type,
          students: exam.participants,
          date: exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : '',
          status: exam.status ? exam.status.charAt(0).toUpperCase() + exam.status.slice(1) : ''
        }));
        setRecentExams(mapped);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, [startDate, endDate, dateError]);

  const statItems = [
    { title: 'Total Students', value: stats.total_students.toString(), icon: Users,    color: 'bg-blue-500' },
    { title: 'Total Exams',    value: stats.total_exams.toString(),    icon: BookOpen, color: 'bg-green-500' },
    { title: 'Avg Score',      value: `${Number(stats.avg_score).toFixed(1)}%`, icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'Completion Rate',value: `${Number(stats.completion_rate).toFixed(1)}%`, icon: Award,     color: 'bg-orange-500' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            max={endDate || undefined}
            className="border rounded p-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            min={startDate || undefined}
            className="border rounded p-2"
          />
        </div>
        {/* Reset Button */}
        <button
          onClick={resetDates}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Validation Error */}
      {dateError && (
        <p className="text-red-500 text-sm mt-2">{dateError}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Exams Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Exams</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        exam.type === 'IIT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {exam.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {exam.students}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {exam.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        exam.status === 'Active' || exam.status === 'Scheduled'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentExams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent exams found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
