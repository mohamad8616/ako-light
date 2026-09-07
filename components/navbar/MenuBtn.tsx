import { Menu, X } from "lucide-react";

function MenuButton({
  menuOpen,
  onClick,
  openLabel,
  closeLabel,
}: {
  menuOpen: boolean;
  onClick: () => void;
  openLabel: string;
  closeLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={menuOpen}
      aria-label={menuOpen ? closeLabel : openLabel}
      className="group relative flex h-4.5 w-4.5 cursor-pointer items-center justify-center text-white transition-all duration-300 hover:opacity-70"
    >
      <span
        className={`absolute transition-[opacity,transform] duration-300 ease-in-out ${
          menuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
        }`}
      >
        <Menu size={18} strokeWidth={2.5} />
      </span>
      <span
        className={`absolute transition-[opacity,transform] duration-300 ease-in-out ${
          menuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
        }`}
      >
        <X size={18} strokeWidth={2.5} />
      </span>
    </button>
  );
}

export default MenuButton;
