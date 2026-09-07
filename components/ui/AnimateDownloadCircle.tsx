import { ArrowDown } from "lucide-react";

export default function AnimatedDownloadCircle() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-background flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
        <div className="relative h-4 w-4 overflow-hidden">
          <ArrowDown
            size={16}
            strokeWidth={1.5}
            className="absolute inset-0 text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-full"
          />
          <ArrowDown
            size={16}
            strokeWidth={1.5}
            className="absolute inset-0 -translate-y-full text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
          />
        </div>
      </div>
    </div>
  );
}
