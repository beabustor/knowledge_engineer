-- SQLite 3. Synthetic concepts, lexical senses and clinical associations.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS concept (
  id TEXT PRIMARY KEY, label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('category', 'symptom', 'disease', 'other'))
);
CREATE TABLE IF NOT EXISTS concept_label (
  concept_id TEXT REFERENCES concept(id), language TEXT CHECK (language IN ('en', 'es')),
  label TEXT NOT NULL, PRIMARY KEY (concept_id, language)
);
CREATE TABLE IF NOT EXISTS is_a (
  child TEXT REFERENCES concept(id), parent TEXT REFERENCES concept(id),
  PRIMARY KEY (child, parent), CHECK (child <> parent)
);
CREATE TABLE IF NOT EXISTS term_sense (
  term TEXT NOT NULL, language TEXT NOT NULL CHECK (language IN ('en', 'es')), concept_id TEXT REFERENCES concept(id),
  PRIMARY KEY (term, language, concept_id)
);
CREATE TABLE IF NOT EXISTS disease_symptom (
  disease_id TEXT REFERENCES concept(id), symptom_id TEXT REFERENCES concept(id),
  PRIMARY KEY (disease_id, symptom_id)
);
