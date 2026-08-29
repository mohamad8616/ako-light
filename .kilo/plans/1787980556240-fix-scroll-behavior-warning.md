# Fix Next.js `data-scroll-behavior` Warning

## Problem
Next.js warns: `Detected scroll-behavior: smooth on the <html> element. To disable smooth scrolling during route transitions, add data-scroll-behavior="smooth" to your <html> element.`

Additionally, `app/globals.css` line 61 contains an invalid CSS property `data-scroll-behavior: "smooth";` which is not valid CSS syntax.

## Changes Required

### 1. `app/layout.tsx`
Add `data-scroll-behavior="smooth"` attribute to the `<html>` element:

```tsx
<html
  lang="en"
  dir="ltr"
  data-scroll-behavior="smooth"
  className={cn(
```

### 2. `app/globals.css`
Remove the invalid line `data-scroll-behavior: "smooth";` (and its comment) from the `html` block inside `@layer base`:

```css
/* Remove these lines */
    /* Always reserve the scrollbar gutter so hiding the scrollbar
       (e.g. when the fullscreen menu locks scroll) never shifts the
       layout sideways. */
    data-scroll-behavior: "smooth";

/* Keep this */
    scrollbar-gutter: stable;
```

## Validation
- Restart the dev server
- Confirm the warning no longer appears in the terminal
