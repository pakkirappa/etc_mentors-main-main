// src/components/ExamManagement/questions/EditQuestionModal.tsx
import React from "react";

export interface ApiOption {
  option_id?: number;
  question_id?: number;
  option_text: string;
  is_correct: 0 | 1 | boolean;
  option_order: number;
}

export interface ApiQuestion {
  question_id: number;
  exam_id: number;
  question_text: string;
  question_type: string; // 'mcq' | 'descriptive' | ...
  difficulty: "easy" | "medium" | "hard" | string;
  marks: number;
  explanation?: string | null;
  options?: ApiOption[];
  created_at?: string;
}

type UIQuestion = {
  id: number;
  examId: number;
  question: string;
  type: string;
  difficulty: "easy" | "medium" | "hard" | string;
  marks: number;
  explanation?: string | null;
  options?: string[];
  correctAnswer?: number; // index
};

interface EditQuestionModalProps {
  open: boolean;
  initial?: ApiQuestion | null;
  onClose: () => void;
  onUpdateApi?: (
    payload: Partial<ApiQuestion> & { question_id: number }
  ) => Promise<void> | void;
  onUpdateUi?: (ui: UIQuestion) => Promise<void> | void;

  /** Max marks you can set for this question = remaining for the exam incl. the question’s current marks */
  remainingMarks: number;
}

const emptyUI: UIQuestion = {
  id: 0,
  examId: 0,
  question: "",
  type: "mcq",
  difficulty: "easy",
  marks: 1,
  explanation: "",
  options: [],
  correctAnswer: undefined,
};

function looksLikeMCQ(typeName?: string): boolean {
  if (!typeName) return false;
  const v = String(typeName).trim().toLowerCase();
  return v === "mcq" || v === "multiple_choice" || v === "multiple-choice";
}

/** Map API → UI */
function fromApi(q?: ApiQuestion | null): UIQuestion {
  if (!q) return emptyUI;
  const base: UIQuestion = {
    id: q.question_id,
    examId: q.exam_id,
    question: q.question_text ?? "",
    type: (q.question_type ?? "").toLowerCase(),
    difficulty: (q.difficulty as any) ?? "easy",
    marks: Number.isFinite(q.marks) ? Number(q.marks) : 1,
    explanation: q.explanation ?? null,
  };
  if (looksLikeMCQ(q.question_type)) {
    const sorted = [...(q.options ?? [])].sort(
      (a, b) => (a.option_order ?? 0) - (b.option_order ?? 0)
    );
    const options = sorted.map((o) => o.option_text ?? "");
    const correctIdx = sorted.findIndex((o) => !!o.is_correct);
    return {
      ...base,
      options: options.length ? options : ["", ""],
      correctAnswer: correctIdx >= 0 ? correctIdx : undefined,
    };
  }
  return base;
}

/** Map UI → API payload for PUT */
function toApi(
  ui: UIQuestion,
  original?: ApiQuestion | null
): Partial<ApiQuestion> & { question_id: number } {
  const payload: Partial<ApiQuestion> & { question_id: number } = {
    question_id: ui.id,
    exam_id: ui.examId,
    question_text: ui.question,
    question_type: ui.type,
    difficulty: ui.difficulty as any,
    marks: ui.marks,
    explanation: ui.explanation ?? null,
  };

  if (looksLikeMCQ(ui.type)) {
    const opts = ui.options ?? [];
    const correctIdx = ui.correctAnswer ?? -1;
    const originalSorted = original?.options
      ? [...original.options].sort(
          (a, b) => (a.option_order ?? 0) - (b.option_order ?? 0)
        )
      : [];

    payload.options = opts.map((text, i) => {
      const existing = originalSorted[i];
      return {
        option_id: existing?.option_id ?? 0,
        question_id: ui.id,
        option_text: text,
        is_correct: i === correctIdx ? 1 : 0,
        option_order: i,
      } as ApiOption;
    });
  }

  return payload;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  open,
  initial,
  onClose,
  onUpdateApi,
  onUpdateUi,
  remainingMarks,
}) => {
  const [form, setForm] = React.useState<UIQuestion>(() => fromApi(initial));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(fromApi(initial));
      setErrors({});
    }
  }, [open, initial]);

  /** Validation */
  const getErrors = React.useCallback(
    (f?: UIQuestion) => {
      const e: Record<string, string> = {};
      const q = f ?? form ?? emptyUI;

      if (!q.question?.trim()) e.question = "Question text is required.";

      if (!Number.isFinite(q.marks) || q.marks <= 0) {
        e.marks = "Marks must be a positive number.";
      } else if (q.marks > remainingMarks) {
        e.marks = `This question can be at most ${remainingMarks} marks.`;
      }

      if (looksLikeMCQ(q.type)) {
        const opts = q.options ?? [];
        if (opts.length < 2) {
          e.options = "Provide at least two options.";
        } else {
          const emptyIdx = opts.findIndex((o) => !o || !o.trim());
          if (emptyIdx !== -1) {
            e.options = `Option ${String.fromCharCode(65 + emptyIdx)} is empty.`;
          }
        }
        if (
          q.correctAnswer == null ||
          q.correctAnswer < 0 ||
          q.correctAnswer >= (q.options?.length ?? 0)
        ) {
          e.correctAnswer = "Select a valid correct option.";
        }
      }

      return e;
    },
    [form, remainingMarks]
  );

  const canSave = React.useMemo(() => {
    const e = getErrors(form);
    return Object.keys(e).length === 0;
  }, [form, getErrors]);

  const validateAndSet = React.useCallback(() => {
    const e = getErrors(form);
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, getErrors]);

  /** Field handlers */
  const handleField =
    <K extends keyof UIQuestion>(key: K) =>
    (val: UIQuestion[K]) => {
      setForm((prev) => ({ ...(prev ?? emptyUI), [key]: val }));
    };

  const handleOptionChange = (idx: number, val: string) => {
    setForm((prev) => {
      const base = prev ?? emptyUI;
      const next = [...(base.options ?? [])];
      next[idx] = val;
      return { ...base, options: next };
    });
  };

  const addOption = () => {
    setForm((prev) => {
      const base = prev ?? emptyUI;
      return { ...base, options: [...(base.options ?? []), ""] };
    });
  };

  const removeOption = (idx: number) => {
    setForm((prev) => {
      const base = prev ?? emptyUI;
      const next = [...(base.options ?? [])];
      next.splice(idx, 1);
      let nextCorrect = base.correctAnswer;
      if (nextCorrect != null) {
        if (idx === nextCorrect) nextCorrect = undefined;
        else if (idx < nextCorrect) nextCorrect = nextCorrect - 1;
      }
      return { ...base, options: next, correctAnswer: nextCorrect };
    });
  };

  /** Save */
  const handleUpdate = async () => {
    if (!validateAndSet()) return;
    try {
      setSaving(true);
      if (onUpdateApi) {
        const payload = toApi(form, initial ?? undefined);
        await onUpdateApi(payload);
      } else if (onUpdateUi) {
        await onUpdateUi(form);
      } else {
        console.warn("No onUpdate handler provided to EditQuestionModal.");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">Edit Question</h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Remaining helper */}
          <div className="text-sm">
            <span className="px-2 py-1 rounded bg-gray-100">
              You can assign up to {remainingMarks} marks to this question.
            </span>
          </div>

          {/* Question */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded border p-2"
              rows={3}
              value={form.question ?? ""}
              onChange={(e) => handleField("question")(e.target.value)}
              onBlur={validateAndSet}
            />
            {errors.question && (
              <p className="text-xs text-red-600">{errors.question}</p>
            )}
          </div>

          {/* Type & Difficulty (type is static here) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Type (read-only)
              </label>
              <input
                className="w-full rounded border p-2 bg-gray-50"
                value={String(form.type || "").toUpperCase()}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Difficulty
              </label>
              <select
                className="w-full rounded border p-2"
                value={form.difficulty}
                onChange={(e) =>
                  handleField("difficulty")(
                    e.target.value as UIQuestion["difficulty"]
                  )
                }
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>
          </div>

          {/* Marks */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded border p-2"
              value={form.marks}
              onChange={(e) => handleField("marks")(Number(e.target.value || 0))}
              onBlur={validateAndSet}
            />
            {errors.marks && (
              <p className="text-xs text-red-600">{errors.marks}</p>
            )}
          </div>

          {/* MCQ options */}
          {looksLikeMCQ(form.type) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Options</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded bg-gray-800 px-2 py-1 text-sm text-white"
                    onClick={addOption}
                  >
                    + Add option
                  </button>
                </div>
              </div>

              {(form.options ?? []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="w-full rounded border p-2"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    onBlur={validateAndSet}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  />
                  <input
                    type="radio"
                    name="correct"
                    checked={form.correctAnswer === idx}
                    onChange={() => handleField("correctAnswer")(idx)}
                    title="Mark as correct"
                  />
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
                    onClick={() => removeOption(idx)}
                    aria-label="Remove option"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {errors.options && (
                <p className="text-xs text-red-600">{errors.options}</p>
              )}
              {errors.correctAnswer && (
                <p className="text-xs text-red-600">{errors.correctAnswer}</p>
              )}
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Explanation (optional)
            </label>
            <textarea
              className="w-full rounded border p-2"
              rows={3}
              value={form.explanation ?? ""}
              onChange={(e) => handleField("explanation")(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            onClick={handleUpdate}
            disabled={
              saving ||
              Number(form.marks) > remainingMarks ||  
              !canSave
            }
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
