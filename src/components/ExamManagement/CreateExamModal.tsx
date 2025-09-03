// src/components/ExamManagement/CreateExamModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Calendar } from "lucide-react";
import { toast } from "react-toastify";

type ExamFormat = "single" | "comprehensive";

type Props = {
  onClose: () => void;
  onCreated: () => void;
  onCreatedAndManage?: (exam: {
    id: number;
    title: string;
    type: string;
    exam_format: ExamFormat;
    totalMarks: number;
    duration: number;
    date: string;
    time: string;
    description?: string;
  }) => void;
};

const ALL_SUBJECTS_DEFAULT = ["Physics", "Chemistry", "Biology", "Mathematics"];

const CreateExamModal: React.FC<Props> = ({ onClose, onCreated, onCreatedAndManage }) => {
  // meta
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  // --- NEW: single-value set_type for Realtime ---
  const [setType, setSetType] = useState<string>("");

  // subjects (you can fetch if you have an endpoint; default list works too)
  const [allSubjects, setAllSubjects] = useState<string[]>(ALL_SUBJECTS_DEFAULT);

  // form model
  const [title, setTitle] = useState("");
  const [type, setTypeVal] = useState<string>(""); // exam_type (free text + select)
  const [category, setCategory] = useState<string>("");
  const [examFormat, setExamFormat] = useState<ExamFormat>("single"); // "single" | "comprehensive"
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [duration, setDuration] = useState<number>(60);
  const [date, setDate] = useState<string>(""); // yyyy-mm-dd
  const [time, setTime] = useState<string>(""); // HH:mm
  const [venue, setVenue] = useState<string>("Online Platform");
  const [status, setStatus] = useState<"draft" | "scheduled">("scheduled");
  const [description, setDescription] = useState<string>("");

  // subjects for this exam
  const [subjects, setSubjects] = useState<string[]>([]); // for single: [one]; for comprehensive: multiple
  const [subjectMarks, setSubjectMarks] = useState<Record<string, number>>({}); // only for comprehensive

  // --- NEW: after-create “another set” helper state ---
  const [lastCreatedExamId, setLastCreatedExamId] = useState<number | null>(null);
  const [newSetType, setNewSetType] = useState("");
  const [creatingAnother, setCreatingAnother] = useState(false);

  const isRealtime = (category || "").trim().toLowerCase() === "realtime";

  // load distinct exam types + categories
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoadingTypes(true);
        const token = localStorage.getItem("token") || "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/exams/meta/exam-types`,
          { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
        );
        if (res.ok) {
          const json = await res.json();
          if (live && Array.isArray(json)) setExamTypes(json.filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to load exam types", e);
      } finally {
        if (live) setLoadingTypes(false);
      }

      try {
        setLoadingCats(true);
        const token = localStorage.getItem("token") || "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/exams/meta/exam-categories`,
          { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
        );
        if (res.ok) {
          const json = await res.json();
          if (live && Array.isArray(json)) setCategories(json.filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to load categories", e);
      } finally {
        if (live) setLoadingCats(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // helpers
  const remainingMarks = useMemo(() => {
    if (examFormat === "single") return totalMarks;
    const used = Object.values(subjectMarks).reduce((s, n) => s + (Number(n) || 0), 0);
    return Math.max(totalMarks - used, 0);
  }, [examFormat, totalMarks, subjectMarks]);

  const toggleSubject = (sub: string) => {
    if (examFormat === "single") {
      // exactly one subject
      setSubjects([sub]);
      // we don't need subjectMarks in single; total marks go to the single subject at submit
      return;
    }
    // comprehensive: multi-select
    setSubjects((prev) => {
      const has = prev.includes(sub);
      if (has) {
        const next = prev.filter((s) => s !== sub);
        // remove marks entry too
        setSubjectMarks((m) => {
          const clone = { ...m };
          delete clone[sub];
          return clone;
        });
        return next;
      } else {
        return [...prev, sub];
      }
    });
  };

  const setMarksForSubject = (sub: string, val: number) => {
    setSubjectMarks((prev) => ({ ...prev, [sub]: Math.max(0, Number(val) || 0) }));
  };

  // optional: quick rebalance utility (when comprehensive)
  const rebalanceMarks = () => {
    if (examFormat !== "comprehensive" || subjects.length === 0) return;
    const equal = Math.floor(totalMarks / subjects.length);
    const remainder = totalMarks % subjects.length;
    const next: Record<string, number> = {};
    subjects.forEach((s, i) => {
      next[s] = equal + (i < remainder ? 1 : 0);
    });
    setSubjectMarks(next);
  };

  // validation
  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!String(type || "").trim()) return "Exam Type is required";
    if (!String(category || "").trim()) return "Category is required";
    if (isRealtime && !String(setType || "").trim()) return "Set is required for Realtime category";
    if (!duration || duration <= 0) return "Duration must be a positive number";
    if (!totalMarks || totalMarks <= 0) return "Total marks must be a positive number";
    if (!date) return "Start date is required";
    if (!time) return "Start time is required";

    if (examFormat === "single") {
      if (subjects.length !== 1) return "Please select a subject for single-subject exam";
      return null;
    }

    // comprehensive
    if (subjects.length === 0) return "Please select at least one subject";
    const used = Object.values(subjectMarks).reduce((s, n) => s + (Number(n) || 0), 0);
    if (used !== totalMarks) return `Distributed marks (${used}) must equal total marks (${totalMarks})`;
    const hasZero = subjects.some((s) => !subjectMarks[s] || subjectMarks[s] <= 0);
    if (hasZero) return "Each selected subject must have > 0 marks";
    return null;
  };

  const submit = async (goManageAfterCreate = false) => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      const payload: any = {
        title: title.trim(),
        exam_type: String(type).trim(),
        exam_format: examFormat,
        total_marks: Number(totalMarks),
        duration: Number(duration),
        category: String(category).trim(),
        set_type: isRealtime ? String(setType).trim() : null,
        start_date: date, // yyyy-mm-dd
        start_time: time, // HH:mm
        venue: venue?.trim() || "Online Platform",
        status, // 'scheduled' | 'draft'
        description: description?.trim() || null,
      };

      if (examFormat === "single") {
        payload.subjects = [{ subject: subjects[0], marks: Number(totalMarks) }];
      } else {
        payload.subjects = subjects.map((s) => ({
          subject: s,
          marks: Number(subjectMarks[s] || 0),
        }));
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      // --- NEW: Handle duplicate-set (409) nicely ---
      if (res.status === 409) {
        const { message } = await res.json().catch(() => ({ message: "" }));
        toast.error(message || "This set already exists for this exam group.");
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to create exam");
      }

      const json = await res.json().catch(() => ({}));
      toast.success("Exam created");

      // Save created id for "Create another set"
      const createdId = json?.exam_id ?? json?.id ?? 0;
      setLastCreatedExamId(createdId);

      onCreated?.();

      if (goManageAfterCreate && onCreatedAndManage) {
        onCreatedAndManage({
          id: createdId,
          title,
          type,
          exam_format: examFormat,
          totalMarks,
          duration,
          date,
          time,
          description,
        });
        // if going to manage, we can close
        onClose?.();
        return;
      }

      // For Realtime, keep modal open so user can add another set quickly.
      if (!isRealtime) {
        onClose?.();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create exam");
    }
  };

  // --- NEW: create another set by cloning the just-created exam ---
  const createAnotherSet = async () => {
    if (!lastCreatedExamId) return;
    if (!newSetType.trim()) {
      toast.error("Please enter the new set");
      return;
    }
    const token = localStorage.getItem("token") || "";
    try {
      setCreatingAnother(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/exams/${lastCreatedExamId}/create-set`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ set_type: newSetType.trim() }),
        }
      );

      if (res.status === 409) {
        const { message } = await res.json().catch(() => ({ message: "" }));
        toast.error(message || "This set already exists for this exam group.");
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to create new set");
      }

      await res.json().catch(() => ({}));
      toast.success("Another set created");
      setNewSetType("");
      onCreated?.(); // refresh parent list if needed
    } catch (e: any) {
      toast.error(e?.message || "Failed to create new set");
    } finally {
      setCreatingAnother(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Exam</h2>
          <button
            className="p-2 rounded text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., New Type exam test"
            />
          </div>

          {/* Exam Type: select existing or type new */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Exam Type <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={examTypes.includes(type) ? type : ""}
                onChange={(e) => setTypeVal(e.target.value)}
              >
                <option value="">{loadingTypes ? "Loading…" : "Select"}</option>
                {examTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 invisible md:visible">
                New type
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="or type a new exam type"
                value={type}
                onChange={(e) => setTypeVal(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          {/* Category: select existing or type new */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={categories.includes(category) ? category : ""}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{loadingCats ? "Loading…" : "Select"}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 invisible md:visible">
                New category
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="or type a new category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          {/* --- NEW: Set (only when Category = Realtime) --- */}
          {isRealtime && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Set <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={setType}
                onChange={(e) => setSetType(e.target.value)}
                placeholder="e.g., Set 1"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide the single set value for this exam (e.g., Set 1).
              </p>
            </div>
          )}

          {/* Exam Format */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Exam Format</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={examFormat}
                onChange={(e) => {
                  const v = e.target.value as ExamFormat;
                  setExamFormat(v);
                  if (v === "single") {
                    // collapse to one subject; keep first if any
                    setSubjects((prev) => (prev[0] ? [prev[0]] : []));
                    setSubjectMarks({});
                  }
                }}
              >
                <option value="single">Single Subject</option>
                <option value="comprehensive">Comprehensive (Multi-Subject)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Total Marks <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg px-3 py-2"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (minutes) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg px-3 py-2"
                value={duration}
                onChange={(e) => setDuration(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>
          </div>

          {/* Subject picker for SINGLE format */}
          {examFormat === "single" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Subject <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {allSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`px-3 py-1 rounded-lg border transition ${
                      subjects[0] === sub
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
              <div
                className={`mt-1 text-sm font-semibold ${
                  totalMarks <= 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                Remaining marks: {totalMarks /* all go to the single subject */}
              </div>
              <p className="text-xs text-gray-500">
                The entire {totalMarks} marks will be assigned to <b>{subjects[0] ?? "—"}</b>.
              </p>
            </div>
          )}

          {/* Subject selection for COMPREHENSIVE */}
          {examFormat === "comprehensive" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Subjects & Marks <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={rebalanceMarks}
                  className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                >
                  Auto-distribute
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {allSubjects.map((sub) => {
                  const active = subjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`px-3 py-1 rounded-lg border transition ${
                        active
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {subjects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map((s) => (
                    <div key={s} className="border rounded-lg p-3">
                      <div className="text-sm font-medium mb-2">{s}</div>
                      <input
                        type="number"
                        min={0}
                        className="w-full border rounded-lg px-3 py-2"
                        value={subjectMarks[s] ?? 0}
                        onChange={(e) => setMarksForSubject(s, Number(e.target.value || 0))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`mt-1 text-sm font-semibold ${
                  remainingMarks <= 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                Remaining marks: {remainingMarks}
              </div>
              <p className="text-xs text-gray-500">
                Distributed marks across selected subjects must equal <b>{totalMarks}</b>.
              </p>
            </div>
          )}

          {/* Schedule & venue */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Start Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Time <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                className="w-full border rounded-lg px-3 py-2"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Venue</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Online Platform"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "scheduled")}
              >
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description…"
            />
          </div>

          {/* --- NEW: Quick “Create another set” panel (only after creating a Realtime exam) --- */}
          {isRealtime && lastCreatedExamId && (
            <div className="mt-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="New Set (e.g., Set 2)"
                  value={newSetType}
                  onChange={(e) => setNewSetType(e.target.value)}
                  maxLength={50}
                />
                <button
                  type="button"
                  disabled={creatingAnother || !newSetType.trim()}
                  onClick={createAnotherSet}
                  className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-60"
                >
                  Create another set
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Clones the created exam (and subjects) into a new row with this set.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
            onClick={() => submit(false)}
          >
            Create
          </button>
          {onCreatedAndManage && (
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-60"
              onClick={() => submit(true)}
            >
              Create & Manage
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateExamModal;
