# RelatedProdSection image not rendering — diagnosis and fix

## Current state
- `components/products/prod/RelatedProdSection.tsx` now mirrors `ProjectsSections.tsx` layout exactly (fill Image, overlay, PlusTextBtn, motion stagger).
- `next.config.ts` already includes `picsum.photos` in `images.remotePatterns`.
- User restarted dev server after config change but reports images still not visible.

## Root-cause hypothesis
Next.js image-optimization cache (`.next/cache/images`) or an incomplete dev-server restart is still using the old config where `picsum.photos` was blocked. This is the most common cause after editing `next.config.ts`.

## Fix plan

1. **Hard-stop the dev server** and delete the `.next` cache.
   - Run: `npx next dev` fresh (not just restart).
   - Or manually delete `.next/` before restarting.

2. **Confirm the effective config** by checking the server startup output for:
   - `images.remotePatterns` listing `picsum.photos`.

3. **Verify in the browser**:
   - Open DevTools → Network tab.
   - Filter by `img` or `/_next/image`.
   - Confirm requests to `/_next/image?url=https%3A%2F%2Fpicsum.photos%2F...` return `200` (not `400`).
   - If they return `400`, the config is still not being picked up.

4. **If cache/restart does not resolve it**, add `qualities: [75]` explicitly to `next.config.ts` (required field in Next.js 16 — default is `[75]`, but being explicit removes ambiguity).

5. **Fallback validation** — open one of the raw image URLs directly in the browser:
   - `https://picsum.photos/seed/lighting-sconce/1200/900`
   - If this returns an image, the source is fine; the blocker is Next.js image config/cache.
