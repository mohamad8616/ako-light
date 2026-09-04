// No "use client" needed anymore — this is now plain CSS, no framer-motion,
// no hooks, so it can render as a server component too.

const ScrollIndicator = () => {
  return (
    <div className="absolute bottom-0 left-8 z-10 h-10 w-px overflow-hidden bg-white/15 md:h-12">
      <span className="scroll-indicator-bar block h-full w-full bg-white" />

      <style>{`
        .scroll-indicator-bar {
          animation: scroll-indicator-sweep 1.7s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        /* Same idea as UnderLineEffect's scale-x-0 → scale-x-100 wipe, just
           vertical and looping: grows top-to-bottom (origin: top), then at
           the exact instant it's full-height (scaleY(1) — where top-origin
           and bottom-origin describe the identical box, so the switch is
           invisible) the origin flips to bottom and it shrinks back to 0,
           which reads as continuing downward rather than snapping back up. */
        @keyframes scroll-indicator-sweep {
          0% {
            transform: scaleY(0);
            transform-origin: top;
          }
          50% {
            transform: scaleY(1);
            transform-origin: top;
          }
          50.01% {
            transform-origin: bottom;
          }
          100% {
            transform: scaleY(0);
            transform-origin: bottom;
          }
        }
      `}</style>
    </div>
  );
};

export default ScrollIndicator;
