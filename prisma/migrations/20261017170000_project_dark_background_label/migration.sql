-- The word printed above the photo in the dark-background project section
-- ("H-Life"). Localized { en, fa }.
--
-- NULL keeps the built-in dictionary word (`vocla.hLife`), the same
-- "null = use the built-in" contract every other homepage override column
-- follows. Unlike `title`/`paragraphs` it is NOT derived from the linked
-- project, so it is editable in reference mode too.
ALTER TABLE "project_dark_background_feature" ADD COLUMN IF NOT EXISTS "label" JSONB;
