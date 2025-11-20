CREATE TABLE
  IF NOT EXISTS discovered_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL UNIQUE,
    title TEXT,
    snippet TEXT,
    toolstack TEXT,
    skills_expertise TEXT,
    job_titles TEXT,
    job_text TEXT,
    has_fit INTEGER,
    confidence REAL,
    status TEXT DEFAULT 'pending'
  );

CREATE TABLE
  IF NOT EXISTS parsed_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL UNIQUE,
    text_content TEXT,
    is_graded TEXT DEFAULT 'not_graded',
    fit REAL DEFAULT 0.0
  );

CREATE TABLE
  IF NOT EXISTS resume_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    res_text TEXT NOT NULL,
    embedding TEXT NOT NULL
  );