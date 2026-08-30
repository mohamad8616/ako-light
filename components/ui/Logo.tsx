interface AkoLightingLogoProps {
  className?: string;
}

export default function Logo({ className }: AkoLightingLogoProps) {
  return (
    <svg
      // xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 24"
      className={className}
      role="img"
      aria-label="AKO Lighting"
    >
      <text
        x="0"
        y="19"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="19"
        fontWeight="500"
        letterSpacing="2.5"
      >
        HOME FORM
      </text>
    </svg>
  );
}
