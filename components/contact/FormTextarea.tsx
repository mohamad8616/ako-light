"use client";

interface FormTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormTextarea({
  label,
  name,
  value,
  onChange,
}: FormTextareaProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className="font-din text-sm font-normal text-white">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="font-din resize-none border-b border-white/20 bg-transparent pb-3 text-sm text-white outline-none transition-colors focus:border-white"
      />
    </label>
  );
}
