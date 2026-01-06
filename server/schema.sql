CREATE TABLE IF NOT EXISTS daily_abattage (
  date TEXT NOT NULL,
  species TEXT NOT NULL,
  total_number INTEGER DEFAULT 0,
  total_weight REAL DEFAULT 0,
  PRIMARY KEY(date, species)
);

CREATE TABLE IF NOT EXISTS seizures (
  date TEXT NOT NULL,
  species TEXT NOT NULL,
  organ TEXT NOT NULL,
  cause TEXT NOT NULL,
  total_number INTEGER DEFAULT 0,
  PRIMARY KEY(date, species, organ, cause)
);

CREATE INDEX IF NOT EXISTS idx_daily_abattage_date ON daily_abattage(date);
CREATE INDEX IF NOT EXISTS idx_seizures_date ON seizures(date);
