/**
 * Fallback for the implicit `children` slot of the products parallel-route
 * segment. The normal list route (`page.tsx`) and the direct edit route
 * (`[id]/page.tsx`) both take precedence over this fallback. Its purpose is to
 * prevent a hard navigation into an unmatched parallel-route state from
 * producing Next.js's implicit 404 while the @modal slot uses its own
 * `default.tsx`.
 */
export default function Default() {
  return null;
}
