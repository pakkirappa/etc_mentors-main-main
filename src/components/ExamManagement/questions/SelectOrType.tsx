import React, { useEffect, useState } from 'react';

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  fetchUrl: string;            // e.g. /api/exams/meta/question-types
  disabled?: boolean;
  placeholder?: string;
};

const SelectOrType: React.FC<Props> = ({ label, value, onChange, fetchUrl, disabled, placeholder }) => {
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [custom, setCustom] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(fetchUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (alive && Array.isArray(data)) {
          const names = data.map((d: any) => typeof d === 'string' ? d : d.name);
          setChoices(names.sort((a, b) => a.localeCompare(b)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchUrl]);

  // when custom is set, prefer it
  const effectiveValue = custom || value;

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      <div className="flex gap-2 items-center">
        <select
          className="flex-1 px-3 py-2 border rounded-lg"
          value={custom ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="" disabled>
            {loading ? "Loading…" : "Select type"}
          </option>
          {choices.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded-lg"
          value={custom}
          placeholder={placeholder || "New type"}
          onChange={(e) => {
            setCustom(e.target.value);
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default SelectOrType;
