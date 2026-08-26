"use client";

import { ChevronDown } from "lucide-react";

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function FormSelect({
  label,
  name,
  value,
  options,
  onChange,
}: FormSelectProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className="font-din text-sm font-normal text-white">{label}</span>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-din w-full appearance-none border-b border-white/20 bg-transparent pb-3 pr-8 text-sm text-white outline-none transition-colors focus:border-white"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-stone-950 text-white">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-0 bottom-3 text-white"
        />
      </div>
    </label>
  );
}
