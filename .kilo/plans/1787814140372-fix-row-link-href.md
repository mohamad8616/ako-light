# Fix broken `href` in `Row.tsx`

## Root cause

`Row.tsx` builds the link href as:

```tsx
href={`/${route ? route : ""}/${slug ? slug : ""}`}
```

Five `Row` consumers currently produce broken URLs:

| Component | `route` passed | `slug` available | Resulting href |
|---|---|---|---|
| `FlagshipList` | missing | `slug` from data | `/henge-milan/undefined` |
| `DesignersList` | missing | `slug` from data | `/massimo-castagna/undefined` |
| `CollectionsList` | missing | `id` from data (no `slug`) | `/undefined/undefined` |
| `MaterialsList` | `materials/${metal}` | undefined | `/materials/leather/undefined` |
| `ProjectList` | `materials` (wrong) | `id` from data (no `slug`) | `/materials/h-istra/undefined` |

Detail pages exist at:
- `/flagship/[slug]`
- `/designers/[slug]`
- `/materials/[material]`
- `/projects/[project]`
- No collection detail page yet.

## Fix

Pass explicit `route` and `slug` props in each List component.

1. **`components/flagship/FlagshipList.tsx`** — add `route="flagship"` to each `<Row>`.
2. **`components/designers/DesignersList.tsx`** — add `route="designers"` to each `<Row>`.
3. **`components/collections/CollectionsList.tsx`** — add `route="collections"` and `slug={collection.id}` to each `<Row>`. (Link is well-formed but currently 404s because no `/collections/[id]` page exists — out of scope.)
4. **`components/materials/MaterialsList.tsx`** — change `route={`materials/${material.metal}`}` to `route="materials"`, and add `slug={material.id}`.
5. **`components/projects/ProjectList.tsx`** — change `route="materials"` to `route="projects"`, and add `slug={project.id}`.

## Validation

1. Visit `/flagship` → click a row → navigates to `/flagship/henge-milan`.
2. Visit `/designers` → click a row → navigates to `/designers/massimo-castagna`.
3. Visit `/materials` → click a row → navigates to `/materials/breccia-medicea`.
4. Visit `/projects` → click a row → navigates to `/projects/h-istra`.
5. Visit `/collections` → click a row → navigates to `/collections/ritual-gravity` (404 until detail page is built).
