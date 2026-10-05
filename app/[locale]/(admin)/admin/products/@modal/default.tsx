/**
 * Fallback for the products @modal slot — renders nothing.
 *
 * Next.js calls this on every hard navigation where the modal route is not
 * active (the Products list itself, a refresh, a direct entry to any other
 * products URL), which is exactly why the edit modal only appears over the
 * list on a soft navigation and never on its own.
 */
export default function Default() {
  return null;
}
