ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS lbm_kg NUMERIC(6,2)
    CHECK (lbm_kg IS NULL OR lbm_kg BETWEEN 1 AND 300),
  ADD COLUMN IF NOT EXISTS lbm_reliability_pct NUMERIC(5,2)
    CHECK (lbm_reliability_pct IS NULL OR lbm_reliability_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS lbm_method TEXT NOT NULL DEFAULT 'none'
    CHECK (lbm_method IN ('none','dexa','inbody','other'));

ALTER TABLE customer_profiles
  ADD CONSTRAINT customer_profile_lbm_not_above_weight
  CHECK (lbm_kg IS NULL OR weight_kg IS NULL OR lbm_kg <= weight_kg);

CREATE INDEX IF NOT EXISTS idx_profiles_updated
  ON customer_profiles(updated_at DESC);
