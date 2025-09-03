// src/components/ExamManagement/AddQuestionModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  examId: number;
  onClose: () => void;
  remainingMarks: number;
  onSaved: () => void;
};

type OptionRow = {
  option_text: string;
  is_correct: boolean;
};

// Always 4 options for MCQ
const DEFAULT_OPTIONS: OptionRow[] = [
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
];

const AddQuestionModal: React.FC<Props> = ({ examId, onClose, onSaved, remainingMarks }) => {
  // form state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("mcq"); // default
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy"
  );
  const [marks, setMarks] = useState<number>(1);
  const [explanation, setExplanation] = useState<string>("");

  // mcq options
  const [options, setOptions] = useState<OptionRow[]>(DEFAULT_OPTIONS);

  // meta: existing question types
  const [types, setTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // submit state
  const [submitting, setSubmitting] = useState(false);

  // Load distinct question types from backend
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoadingTypes(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/exams/meta/question-types`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error("Failed to load question types");
        const json = await res.json();
        if (live && Array.isArray(json)) setTypes(json.filter(Boolean));
      } catch (e) {
        console.error(e);
        if (live) setTypes([]);
      } finally {
        if (live) setLoadingTypes(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Helpers
  const setOptionText = (idx: number, text: string) =>
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], option_text: text };
      return next;
    });

  const setCorrectIndex = (idx: number) =>
    setOptions((prev) => prev.map((o, i) => ({ ...o, is_correct: i === idx })));

  const isMCQ = useMemo(
    () => String(questionType).trim().toLowerCase() === "mcq",
    [questionType]
  );

  // Basic validation
  const validate = () => {
    if (!questionText.trim()) return "Question is required";
    if (!questionType || !String(questionType).trim())
      return "Question type is required";
    if (!difficulty) return "Difficulty is required";
    if (marks == null || Number.isNaN(Number(marks)) || Number(marks) <= 0)
      return "Marks must be a positive number";
    if (marks > remainingMarks)
      return `Only ${remainingMarks} marks remaining for this exam`;
    if (isMCQ) {
      const haveText = options.every((o) => o.option_text.trim().length > 0);
      if (!haveText) return "All 4 MCQ options must have text";
      if (!options.some((o) => o.is_correct))
        return "Select a correct option for MCQ";
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload: any = {
        question_text: questionText.trim(),
        question_type: String(questionType).trim().toLowerCase(),
        difficulty,
        marks: Number(marks),
      };
      if (explanation && explanation.trim().length > 0) {
        payload.explanation = explanation.trim();
      }
      if (isMCQ) {
        payload.options = options.map((o) => ({
          option_text: o.option_text,
          is_correct: !!o.is_correct,
        }));
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/exams/${examId}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to add question");
      }

      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">Add Question</h2>

          <button
            type="button"
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-5 py-4 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Question */}
          <div
            className={`mt-1 text-sm font-semibold ${
              remainingMarks <= 0 ? "text-red-600" : "text-gray-700"
            }`}
          >
            Remaining marks: {remainingMarks}
          </div>
          <div> 
            <label className="block text-sm font-medium mb-1">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type the question here…"
            />
          </div>

          {/* Question Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Question Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={types.includes(questionType) ? questionType : ""}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <option value="">
                  {loadingTypes ? "Loading…" : "Select"}
                </option>
                {types.map((t) => (
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
                placeholder="New type"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          {/* Difficulty & Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Difficulty <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as "easy" | "medium" | "hard")
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value || 0))}
              />
            </div>
          </div>

          {/* Options (always 4 for MCQ) */}
          {isMCQ && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Options</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 w-full group"
                  >
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={opt.option_text}
                      onChange={(e) => setOptionText(idx, e.target.value)}
                    />
                    <input
                      type="radio"
                      name="correct"
                      title="Mark as correct"
                      checked={opt.is_correct}
                      onChange={() => setCorrectIndex(idx)}
                      className="h-5 w-5"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Exactly 4 options required. Choose one correct.
              </p>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Explanation (optional)
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Add rationale / solution steps…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            onClick={submit}
            disabled={
              submitting ||
              remainingMarks <= 0 || 
              Number(marks) > remainingMarks
            }
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
