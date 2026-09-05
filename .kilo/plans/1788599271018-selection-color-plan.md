# Change Text Selection Color to #979B99

## Goal
Replace the default browser text selection blue background with `#979B99`.

## Affected file
- `app/globals.css`

## Change
In `app/globals.css`, add a `::selection` rule. A good fit is inside the existing `@layer base { ... }` block or just after it. Use dark text (`#171719`) for contrast against `#979B99`.

```css
::selection {
  background-color: #979B99;
  color: #171719;
}
```

## Validation
1. Run the dev server and select text on any page.
2. Confirm the selection background is `#979B99` and text remains readable.
3. Run `npx tsc --noEmit` to confirm no TypeScript/CSS type issues.
