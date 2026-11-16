-- Enforce the five supported regiment factions on an existing database.
-- Existing rows with older factions are left untouched; new inserts/updates are restricted.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='empire_regiments_faction_check') THEN
    ALTER TABLE public.empire_regiments
      ADD CONSTRAINT empire_regiments_faction_check
      CHECK (faction IN ('Австрийская Империя','Французская Империя','Российская Империя','Британская Империя','Пруссия'))
      NOT VALID;
  END IF;
END $$;
