"use client";

interface FormFieldProps {
  label: string;
  required?: boolean;
  type?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormField({
  label,
  required,
  type = "text",
  name,
  value,
  onChange,
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className="font-din text-sm font-normal text-white">
        {label} {required && <span aria-hidden="true">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-din border-b border-white/20 bg-transparent pb-3 text-sm text-white outline-none transition-colors focus:border-white"
      />
    </label>
  );
}
