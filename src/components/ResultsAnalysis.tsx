import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award, Download, Filter, Eye, X, RotateCcw, Calendar } from 'lucide-react';
import { toast } from "react-toastify";

const ResultsAnalysis = () => {
  const [selectedExam, setSelectedExam] = useState<'all' | 'IIT' | 'NEET'>('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const [selectedState, setSelectedState] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  const [examResults, setExamResults] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [subjectAnalysis, setSubjectAnalysis] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ label: string; count: number }[]>([]);

  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [subjectScores, setSubjectScores] = useState<any[]>([]);

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [regionsError, setRegionsError] = useState<string>('');
  const [subjectsError, setSubjectsError] = useState<string>('');

  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // ---------- initial load ----------
  useEffect(() => {
    fetchRegions();
    fetchResults();
  }, []);

  // ---------- subjects list (dynamic) ----------
  useEffect(() => {
    fetchSubjectsList(selectedExam === 'all' ? undefined : selectedExam);
  }, [selectedExam]);

  const fetchSubjectsList = async (examType?: 'IIT' | 'NEET') => {
    try {
      setSubjectsError('');
      const token = localStorage.getItem('token') || '';
      if (!token) {
        setSubjectsError('Not logged in: missing token');
        setSubjects([]);
        return;
      }

      const qs = examType ? `?examType=${encodeURIComponent(examType)}` : '';
      const res = await fetch(`${apiBase}/api/results/subjects-list${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Subjects request failed: ${res.status} ${res.statusText} ${text}`);
      }

      const data = await res.json();
      console.log('Subjects API response:', data); // 🔎 debug
      const list: string[] = Array.isArray(data?.subjects) ? data.subjects : [];

      // Fallback to common subjects if backend returns empty (edge-case)
      setSubjects(
        list.length > 0 ? list : ['Physics', 'Chemistry', 'Biology', 'Mathematics']
      );
    } catch (err: any) {
      console.error('Failed to fetch subjects list', err);
      setSubjectsError(err?.message || 'Failed to fetch subjects');
      setSubjects(['Physics', 'Chemistry', 'Biology', 'Mathematics']);
    }
  };

  // ---------- regions (states + districts) ----------
  const fetchRegions = async () => {
    try {
      setRegionsError('');
      const token = localStorage.getItem('token') || '';
      if (!token) {
        setRegionsError('Not logged in: missing token');
        setStates([]);
        setDistricts([]);
        return;
      }

      const res = await fetch(`${apiBase}/api/results/regions`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Regions request failed: ${res.status} ${res.statusText} ${text}`);
      }

      const data = await res.json();
      console.log('Regions API response:', data); // 🔎 debug

      setStates(Array.isArray(data.states) ? data.states : []);
      setDistricts(Array.isArray(data.districts) ? data.districts : []);
    } catch (err: any) {
      console.error('Failed to fetch regions', err);
      setRegionsError(err?.message || 'Failed to fetch regions');
      setStates([]);
      setDistricts([]);
    }
  };

  // when state changes, fetch districts for that state
  useEffect(() => {
    const fetchDistrictsForState = async () => {
      setSelectedDistrict('all');
      try {
        const token = localStorage.getItem('token') || '';
        if (!token) {
          setRegionsError('Not logged in: missing token');
          setDistricts([]);
          return;
        }

        if (selectedState === 'all') {
          // re-fetch all districts (not filtered)
          const res = await fetch(`${apiBase}/api/results/regions`, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch all districts');
          const data = await res.json();
          setDistricts(Array.isArray(data.districts) ? data.districts : []);
          return;
        }

        const res = await fetch(
          `${apiBase}/api/results/regions?state=${encodeURIComponent(selectedState)}`,
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to fetch districts for state');
        const data = await res.json();
        setDistricts(Array.isArray(data.districts) ? data.districts : []);
      } catch (e: any) {
        console.error('Failed to fetch districts by state', e);
        setRegionsError(e?.message || 'Failed to fetch districts');
        setDistricts([]);
      }
    };
    fetchDistrictsForState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  // ---------- results ----------
  const fetchResults = async (opts?: { startDate?: string; endDate?: string }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    const params = new URLSearchParams();
    if (opts?.startDate && opts?.endDate) {
      params.set('startDate', opts.startDate);
      params.set('endDate', opts.endDate);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetch(`${apiBase}/api/results${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch results: ${res.statusText}`);

      const data = await res.json();
      const mapped = data.map((item: any, index: number) => ({
        id: index + 1,
        examTitle: item.exam_title,
        type: item.exam_type,
        category: item.category || 'Easy',
        subject: item.subject, // may be comma-separated
        studentName: item.full_name,
        state: item.state || '',
        district: item.district || '',
        score: Number(item.score),
        totalMarks: Number(item.total_marks),
        percentage: Number(item.percentage),
        rank: Number(item.ranking),
        stateRank: Number(item.state_rank) || null,
        districtRank: Number(item.district_rank) || null,
        indiaRank: Number(item.india_rank) || null,
        timeSpent: item.time_spent || '2h 00m',
        completedOn: item.completed_on || new Date().toISOString().split('T')[0],
        studentExamId: item.student_exam_id,
      }));

      setExamResults(mapped);

      // Top performers
      const sorted = [...mapped].sort((a, b) => b.percentage - a.percentage);
      setTopPerformers(
        sorted.slice(0, 5).map((s) => ({
          name: s.studentName,
          score: s.percentage,
          subject: s.subject,
          exam: s.examTitle,
        }))
      );

      // Subject analysis (works even if "subject" is CSV)
      const groups = mapped.reduce((acc: any, item: any) => {
        const subjects = item.subject && item.subject.trim() !== '' ? item.subject.split(',') : ['General'];
        subjects.forEach((sub: string) => {
          const trimmedSub = sub.trim();
          if (!acc[trimmedSub]) {
            acc[trimmedSub] = { scores: [], attempts: 0, topScore: 0 };
          }
          acc[trimmedSub].scores.push(item.percentage);
          acc[trimmedSub].attempts += 1;
          acc[trimmedSub].topScore = Math.max(acc[trimmedSub].topScore, item.percentage);
        });
        return acc;
      }, {});
      const analysis = Object.keys(groups).map((sub) => ({
        subject: sub,
        avgScore: Number(
          (groups[sub].scores.reduce((a: number, b: number) => a + b, 0) / groups[sub].scores.length).toFixed(1)
        ),
        totalAttempts: groups[sub].attempts,
        topScore: Number(groups[sub].topScore.toFixed(1)),
      }));
      setSubjectAnalysis(analysis);

      // Category breakdown
      const catMap: Record<string, number> = {};
      mapped.forEach((m) => {
        const key = m.category || 'Easy';
        catMap[key] = (catMap[key] || 0) + 1;
      });
      const catArr = Object.keys(catMap).map((k) => ({ label: k, count: catMap[k] }));
      setCategoryBreakdown(catArr);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  // ---------- per-result subject scores ----------
  useEffect(() => {
    const fetchSubjectScores = async () => {
      const token = localStorage.getItem('token');
      if (!token || !selectedResult) return;
      try {
        const res = await fetch(`${apiBase}/api/results/subjects/${selectedResult.studentExamId}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch subject scores: ${res.statusText}`);
        const data = await res.json();
        setSubjectScores(data);
      } catch (err) {
        console.error('Failed to fetch subject scores:', err);
        setSubjectScores([]);
      }
    };
    fetchSubjectScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResult]);

  // ---------- date filter ----------
  const applyDateFilter = () => {
    setDateError('');
    if (startDate && !endDate) {
      setDateError('Please select an end date.');
      return;
    }
    if (!startDate && endDate) {
      setDateError('Please select a start date.');
      return;
    }
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e < s) {
        setDateError('End date cannot be earlier than start date.');
        return;
      }
      fetchResults({ startDate, endDate });
      return;
    }
    // no dates -> all
    fetchResults();
  };

  const resetFilters = () => {
    setSelectedExam('all');
    setSelectedSubject('all');
    setSelectedState('all');
    setSelectedDistrict('all');
    setSelectedCategory('all');
    setStartDate('');
    setEndDate('');
    setDateError('');
    fetchResults();
    fetchRegions(); // restore full districts list too
  };

  // ---------- derived UI values ----------
  const filteredResults = examResults.filter((result: any) => {
    const matchesExam = selectedExam === 'all' || result.type === selectedExam;
    const matchesSubject =
      selectedSubject === 'all' ||
      (result.subject &&
        result.subject
          .split(',')
          .map((s: string) => s.trim())
          .includes(selectedSubject));
    const matchesState = selectedState === 'all' || result.state === selectedState;
    const matchesDistrict = selectedDistrict === 'all' || result.district === selectedDistrict;
    const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
    return matchesExam && matchesSubject && matchesState && matchesDistrict && matchesCategory;
  });

  const averageScore =
    examResults.length > 0
      ? (examResults.reduce((sum: number, r: any) => sum + (Number(r.percentage) || 0), 0) / examResults.length).toFixed(
          1
        )
      : 0;

  const topScore = examResults.length > 0 ? Math.max(...examResults.map((r: any) => r.percentage)).toFixed(1) : 0;

  const passRate =
    examResults.length > 0
      ? Math.round((examResults.filter((r: any) => r.percentage >= 60).length / examResults.length) * 100)
      : 0;

  const exportResults = () => {
    if (filteredResults.length === 0) {
       toast.warn('No results to export');
      return;
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Student,Exam,Subject,Score,Percentage,All-India Rank,State Rank,District Rank,Time Spent,Completed On,State,District,Category']
        .concat(
          filteredResults.map(
            (r: any) =>
              `${r.studentName},${r.examTitle},${r.subject},${r.score}/${r.totalMarks},${r.percentage}%,${r.indiaRank || ''},${
                r.stateRank || ''
              },${r.districtRank || ''},${r.timeSpent},${r.completedOn},${r.state},${r.district},${r.category}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'exam_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // tiny helper for inline bars
  const maxCat = Math.max(1, ...categoryBreakdown.map((c) => c.count));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Results Analysis</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportResults}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Results</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value as 'all' | 'IIT' | 'NEET')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Exams</option>
              <option value="IIT">IIT Exams</option>
              <option value="NEET">NEET Exams</option>
            </select>
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Realtime">Realtime</option>
            </select>
          </div>

          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range + actions */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={applyDateFilter} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Apply
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              title="Reset filters"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {dateError && <p className="text-red-600 text-sm mt-2">{dateError}</p>}
        {regionsError && (
          <p className="text-amber-600 text-sm mt-2">{regionsError}. Please check your login/token and API base URL.</p>
        )}
        {subjectsError && <p className="text-amber-600 text-sm mt-2">{subjectsError}</p>}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Results</p>
              <p className="text-2xl font-bold text-gray-900">{examResults.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Score</p>
              <p className="text-2xl font-bold text-gray-900">{topScore}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
              <p className="text-2xl font-bold text-gray-900">{passRate}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 2-up: Category mini-graph + Subject Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category mini bar graph */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Category Distribution</h2>
          </div>
          <div className="p-6 space-y-4">
            {categoryBreakdown.length === 0 && <div className="text-gray-500">No data</div>}
            {categoryBreakdown.map((c) => (
              <div key={c.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{c.label}</span>
                  <span className="text-gray-500">{c.count}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full"
                    style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Subject Analysis</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {subjectAnalysis.map((subject, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{subject.subject}</h3>
                    <span className="text-sm text-gray-500">{subject.totalAttempts} attempts</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Score:</span>
                      <span className="font-medium">
                        {subject.avgScore && !isNaN(subject.avgScore) ? subject.avgScore : '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Top Score:</span>
                      <span className="font-medium">{subject.topScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${subject.avgScore}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {subjectAnalysis.length === 0 && <div className="text-gray-500">No subject data</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detailed Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  All-India Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State/District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((result: any) => (
                <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {result.studentName.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{result.examTitle}</div>
                      <div className="text-xs text-gray-500">{result.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.score}/{result.totalMarks}
                      </div>
                      <div className="text-sm text-gray-500">{result.percentage}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{result.indiaRank ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.state ? (result.stateRank ?? '-') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.district ? (result.districtRank ?? '-') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.timeSpent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.completedOn ? new Date(result.completedOn).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.state || '-'}
                    {result.district ? ` / ${result.district}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="View subject scores"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                    No results found with current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Scores Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Subject Analysis for {selectedResult.studentName} - {selectedResult.examTitle}
              </h2>
              <button
                onClick={() => {
                  setSelectedResult(null);
                  setSubjectScores([]);
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {subjectScores.length > 0 ? (
                subjectScores.map((score: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{score.subject}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Score:</span>
                        <span className="font-medium">{score.score}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Percentage:</span>
                        <span className="font-medium">{score.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-600">No subject-specific scores available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsAnalysis;
