-- Enforce the five supported regiment factions on an existing database.
-- Existing rows with older factions are left untouched; new inserts/updates are restricted.
ALTER TABLE public.empire_regiments
  DROP CONSTRAINT IF EXISTS empire_regiments_faction_check;

ALTER TABLE public.empire_regiments
  ADD CONSTRAINT empire_regiments_faction_check
  CHECK (faction IN ('Австрийская Империя','Французская Империя','Российская Империя','Британская Империя','Пруссия','Рейнский Союз'))
  NOT VALID;
