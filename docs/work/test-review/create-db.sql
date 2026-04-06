CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package TEXT NOT NULL,
  file TEXT NOT NULL,
  suite TEXT NOT NULL,        -- describe block path
  name TEXT NOT NULL,         -- test name
  full_name TEXT NOT NULL,    -- suite > name
  status TEXT NOT NULL,       -- pass, fail, skip
  error_message TEXT,         -- failure reason if any
  test_type TEXT,             -- functional, behavioral, structural, tautological
  quality TEXT,               -- good, adequate, poor, dead
  needs_mitigation INTEGER DEFAULT 0,
  mitigation TEXT,            -- what needs to change
  has_mutation_check INTEGER, -- does it verify world state changes?
  has_assertion INTEGER       -- does it have meaningful assertions?
);

CREATE INDEX idx_tests_package ON tests(package);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_quality ON tests(quality);
CREATE INDEX idx_tests_mitigation ON tests(needs_mitigation);
