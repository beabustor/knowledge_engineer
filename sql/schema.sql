-- SQLite 3. Synthetic concepts, lexical senses and clinical associations.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS concept (
  id TEXT PRIMARY KEY, label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('category', 'symptom', 'disease', 'other'))
);
CREATE TABLE IF NOT EXISTS is_a (
  child TEXT REFERENCES concept(id), parent TEXT REFERENCES concept(id),
  PRIMARY KEY (child, parent), CHECK (child <> parent)
);
CREATE TABLE IF NOT EXISTS term_sense (
  term TEXT NOT NULL, concept_id TEXT REFERENCES concept(id),
  PRIMARY KEY (term, concept_id)
);
CREATE TABLE IF NOT EXISTS disease_symptom (
  disease_id TEXT REFERENCES concept(id), symptom_id TEXT REFERENCES concept(id),
  PRIMARY KEY (disease_id, symptom_id)
);
