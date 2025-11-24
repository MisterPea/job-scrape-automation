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
    title TEXT,
    excerpt TEXT,
    site_name TEXT,
    text_content TEXT,
    is_graded_whole TEXT DEFAULT 'not_graded',
    is_graded_summary TEXT DEFAULT 'not_graded',
    resume_fit REAL DEFAULT 0.0,
    summary_fit REAL DEFAULT 0.0
  );

CREATE TABLE
  IF NOT EXISTS resume_embeddings (
    id TEXT PRIMARY KEY UNIQUE,
    type TEXT,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS resume_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    embedding TEXT
  );