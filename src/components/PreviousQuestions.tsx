import React, { useEffect, useMemo, useState } from 'react';
import { toast } from "react-toastify";
import { confirmDialog } from '../common/confirm';

type PQS = {
  pqs_id: number;
  course: string;
  subject_mode: 'single' | 'multiple';
  subjects_json: any[];
  exam_conducted_on: string | null;
  resource_url: string;
  notes?: string | null;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  uploader_username?: string;
  uploader_name?: string;
};

const courses = ['IIT','NEET']; // extend freely

type PreviewState = {
  open: boolean;
  mode: 'image' | 'pdf' | 'doc' | 'unknown';
  src: string;          // iframe/img src
  title?: string;
};

export default function PreviousQuestions() {
  const [course, setCourse] = useState<string>('IIT');
  const [subjectMode, setSubjectMode] = useState<'single' | 'multiple'>('single');
  const [subjects, setSubjects] = useState<{name: string; chapter?: string}[]>([{ name: '' }]);
  const [examDate, setExamDate] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [list, setList] = useState<PQS[]>([]);
  const [filters, setFilters] = useState<{course?: string; subject_mode?: string; q?: string}>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [preview, setPreview] = useState<PreviewState>({ open: false, mode: 'unknown', src: '' });

  // --------- Subject validation (client-side) ----------
  const nonEmptySubjects = useMemo(
    () => subjects.map(s => ({...s, name: s.name.trim()})).filter(s => s.name),
    [subjects]
  );

  const subjectValidation = useMemo(() => {
    if (subjectMode === 'single') {
      if (nonEmptySubjects.length !== 1) {
        return 'In Single mode, you must enter exactly one subject.';
      }
    } else {
      if (nonEmptySubjects.length < 2) {
        return 'In Multiple mode, please enter at least two subjects.';
      }
    }
    return '';
  }, [subjectMode, nonEmptySubjects]);

  const canSubmit = useMemo(() =>
    !!course &&
    !!subjectMode &&
    !!url &&
    subjectValidation === '',
  [course, subjectMode, url, subjectValidation]);

  const addSubjectRow = () => {
    // Prevent adding more than one row in "single" mode
    setSubjects(s => {
      if (subjectMode === 'single' && s.length >= 1) return s;
      return [...s, { name: '' }];
    });
  };

  const updateSubject = (i: number, key: 'name'|'chapter', value: string) => {
    setSubjects(s => s.map((row, idx) => idx === i ? { ...row, [key]: value } : row));
  };

  const removeSubject = (i: number) => {
    setSubjects(s => {
      const next = s.filter((_, idx) => idx !== i);
      // Ensure at least one row exists
      return next.length ? next : [{ name: '' }];
    });
  };

  const resetForm = () => {
    setCourse('IIT');
    setSubjectMode('single');
    setSubjects([{ name: '' }]);
    setExamDate('');
    setUrl('');
    setNotes('');
  };

  const fetchList = async (pageArg = page) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const query = new URLSearchParams();
    if (filters.course) query.append('course', filters.course);
    if (filters.subject_mode) query.append('subject_mode', filters.subject_mode);
    if (filters.q) query.append('q', filters.q);
    query.append('page', String(pageArg));
    query.append('pageSize', String(pageSize));

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/previous-questions?` + query.toString(),
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) { console.error('List fetch failed'); return; }
    const data = await res.json();
    setList(data.data || []);
    setTotal(data.total || 0);
    setPage(data.page || 1);
  };

  useEffect(() => { fetchList(1); }, [filters.course, filters.subject_mode, filters.q]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final client-side guard for single/multiple rules
    if (subjectValidation) {
      toast.error(subjectValidation);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const body = {
      course,
      subject_mode: subjectMode,
      subjects: nonEmptySubjects,
      exam_conducted_on: examDate || null,
      resource_url: url,
      notes: notes || null
    };

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/previous-questions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) { 
      const msg = await res.text().catch(()=> 'Save failed');
      toast.error(msg || 'Save failed');
      return; 
    }
    resetForm();
    fetchList(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ---------- Preview + Download helpers ----------
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  const getExt = (u: string) => {
    try {
      const clean = new URL(u).pathname.split('/').pop() || '';
      const pure = clean.split('?')[0].toLowerCase();
      return pure.includes('.') ? pure.split('.').pop()! : '';
    } catch {
      const pure = u.split('?')[0].toLowerCase();
      return pure.includes('.') ? pure.split('.').pop()! : '';
    }
  };

  const classify = (u: string): PreviewState['mode'] => {
    const ext = getExt(u);
    if (['png','jpg','jpeg','gif','webp','bmp','svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc','docx','ppt','pptx','xls','xlsx','txt','rtf','odt','ods','odp'].includes(ext)) return 'doc';
    return 'unknown';
  };

  // UPDATED: point the proxy at this router (/api/previous-questions/proxy)
  const proxyUrl = (u: string, opts?: { download?: boolean }) => {
    const q = new URLSearchParams({ url: u, download: opts?.download ? '1' : '0' });
    return `${apiBase}/api/previous-questions/proxy?${q.toString()}`;
  };

  const googleDocsUrl = (u: string) =>
    `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(u)}`;

  const openInApp = (row: PQS) => {
    const u = row.resource_url;
    const mode = classify(u);

    // Prefer proxy for iframe/img to avoid CORS/frame-ancestors issues
    let src = proxyUrl(u, { download: false });

    // For Office docs, Google viewer gives nicer UI; keep proxy as fallback
    if (mode === 'doc') {
      src = googleDocsUrl(u);
    }

    setPreview({
      open: true,
      mode,
      src,
      title: `${row.course} — ${row.exam_conducted_on ?? 'Unknown date'}`
    });
  };

  const downloadFile = async (row: PQS) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You are not logged in.');
        return;
      }

      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/api/previous-questions/proxy-download?url=${encodeURIComponent(row.resource_url)}`;

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        toast.error(`Download failed: ${res.status} ${msg}`);
        return;
      }

      // Try to extract filename from Content-Disposition (if provided)
      const cd = res.headers.get('Content-Disposition') || '';
      let filename = 'file';
      const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
      if (m && m[1]) {
        try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
      } else {
        // fallback from the original URL
        try {
          const u = new URL(row.resource_url);
          const last = (u.pathname.split('/').pop() || '').split('?')[0];
          if (last) filename = decodeURIComponent(last);
        } catch (_) {}
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('Unexpected error while downloading.');
    }
  };

  const deleteRow = async (row: PQS) => {
     const ok = await confirmDialog("Delete this record? This cannot be undone.", { danger: true, confirmText: "Delete" });
      if (!ok) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You are not logged in.');
      return;
    }

    const endpoint = `${import.meta.env.VITE_API_BASE_URL}/api/previous-questions/${row.pqs_id}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      let msg = '';
      try {
        const data = await res.json();
        msg = data.message || '';
      } catch {
        msg = await res.text().catch(() => '');
      }
      console.log('msg in the previous', msg);
      toast.error(msg || 'Delete failed');
      return;
    }

    toast.success('Deleted successfully');
    fetchList(page);
  };

  // When switching to Single mode, collapse to one row
  useEffect(() => {
    if (subjectMode === 'single' && subjects.length > 1) {
      // Keep the first non-empty subject (or first row)
      const first = nonEmptySubjects[0] || subjects[0] || { name: '' };
      setSubjects([ { name: first.name || '', chapter: first.chapter || '' } ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectMode]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Previous Questions</h1>
      </div>

      {/* Create Form */}
      <form onSubmit={onSubmit} className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Course</label>
            <select value={course} onChange={(e)=>setCourse(e.target.value)} className="border rounded p-2">
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Subject Mode</label>
            <select
              value={subjectMode}
              onChange={(e)=>setSubjectMode(e.target.value as any)}
              className="border rounded p-2"
            >
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Exam Conducted On</label>
            <input type="date" value={examDate} onChange={(e)=>setExamDate(e.target.value)} className="border rounded p-2" />
          </div>

          <div className="flex flex-col md:col-span-1">
            <label className="text-sm text-gray-600">Upload File (photo/pdf/doc)</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file);

                const token = localStorage.getItem("token");
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/previous-questions/upload`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });

                if (!res.ok) {
                  toast.error("Upload failed");
                  return;
                }

                const data = await res.json();
                setUrl(data.url); // now resource_url will be a full Spaces URL
              }}
            />
            {url && (
              <p className="text-xs text-green-600 mt-1">
                Uploaded: <a href={url} target="_blank" rel="noreferrer">{url}</a>
              </p>
            )}
          </div>
        </div>

        {/* Subjects editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Subjects</label>
            <button
              type="button"
              onClick={addSubjectRow}
              disabled={subjectMode === 'single' && subjects.length >= 1}
              className={`border rounded px-3 py-1 ${subjectMode === 'single' && subjects.length >= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              title={subjectMode === 'single' ? 'Single mode allows only one subject' : 'Add Subject'}
            >
              + Add Subject
            </button>
          </div>

          {subjects.map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                className="border rounded p-2"
                placeholder="Subject name (e.g., Physics)"
                value={s.name}
                onChange={(e)=>updateSubject(i,'name',e.target.value)}
                required={i === 0} />
              <input
                className="border rounded p-2"
                placeholder="Chapter / details (optional)"
                value={s.chapter || ''}
                onChange={(e)=>updateSubject(i,'chapter',e.target.value)} />
              <div className="flex items-center">
                <button
                  type={subjects.length > 1 ? 'button' : 'button'}
                  onClick={()=>removeSubject(i)}
                  disabled={subjects.length === 1}
                  className={`border rounded px-3 py-2 ${subjects.length === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  title={subjects.length === 1 ? 'At least one subject row is required' : 'Remove'}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Inline validation message */}
          {subjectValidation && (
            <div className="text-sm text-red-600">{subjectValidation}</div>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-600">Notes (optional)</label>
          <textarea className="border rounded p-2 w-full" rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <button
            disabled={!canSubmit}
            className={`px-4 py-2 rounded-lg text-white ${canSubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
            Save
          </button>
        </div>
      </form>

      {/* Filters in one line */}
      <div className="bg-white border rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Course</label>
            <select
              value={filters.course || ''}
              onChange={(e)=>setFilters(f=>({...f, course: e.target.value || undefined}))}
              className="border rounded p-2 min-w-[160px]">
              <option value="">All</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Subject Mode</label>
            <select
              value={filters.subject_mode || ''}
              onChange={(e)=>setFilters(f=>({...f, subject_mode: e.target.value || undefined}))}
              className="border rounded p-2 min-w-[160px]">
              <option value="">All</option>
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Search</label>
            <input
              className="border rounded p-2 min-w-[220px]"
              placeholder="Search notes / URL"
              value={filters.q || ''}
              onChange={(e)=>setFilters(f=>({...f, q: e.target.value || undefined}))}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.map(row => (
              <tr key={row.pqs_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{row.course}</td>
                <td className="px-4 py-3 capitalize">{row.subject_mode}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(row.subjects_json) ? row.subjects_json : []).map((s: any, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {s.name}{s.chapter ? ` — ${s.chapter}` : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{row.exam_conducted_on || '-'}</td>
                <td className="px-4 py-3 break-all">
                  <a className="text-blue-600 underline" href={row.resource_url} target="_blank" rel="noreferrer">
                    Open externally
                  </a>
                </td>
                <td className="px-4 py-3">{row.uploader_name || row.uploader_username || row.uploaded_by}</td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={()=>downloadFile(row)}
                      className="border px-3 py-1 rounded hover:bg-gray-50"
                      title="Download file"
                    >
                      Download
                    </button>
                     <button
                      onClick={()=>deleteRow(row)}
                      className="border px-3 py-1 rounded hover:bg-red-50 text-red-600 border-red-300"
                      title="Delete this record"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages} • {total} total
        </div>
        <div className="flex gap-2">
          <button
            onClick={()=>{ if(page>1){ setPage(p=>p-1); fetchList(page-1); } }}
            className="border rounded px-3 py-1 disabled:opacity-50"
            disabled={page<=1}
          >
            Prev
          </button>
          <button
            onClick={()=>{ if(page<totalPages){ setPage(p=>p+1); fetchList(page+1); } }}
            className="border rounded px-3 py-1 disabled:opacity-50"
            disabled={page>=totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {preview.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">{preview.title || 'Preview'}</div>
              <button
                className="border rounded px-3 py-1 hover:bg-gray-50"
                onClick={()=>setPreview({ open: false, mode: 'unknown', src: '' })}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {preview.mode === 'image' ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <img src={preview.src} alt="preview" className="max-h-full max-w-full" />
                </div>
              ) : (
                <iframe
                  title="preview"
                  src={preview.src}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
