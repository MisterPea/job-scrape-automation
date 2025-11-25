CREATE TABLE
  IF NOT EXISTS discovered_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL UNIQUE,
    parse_status TEXT DEFAULT 'pending',
    title TEXT,
    excerpt TEXT,
    site_name TEXT,
    text_content TEXT,
    is_graded TEXT DEFAULT 'not_graded',
    added_to_candidate TEXT DEFAULT 'not_added',
    resume_fit_rough REAL DEFAULT 0.0,
    summary_fit_rough REAL DEFAULT 0.0
  );

CREATE TABLE
  IF NOT EXISTS candidate_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL UNIQUE,
    deep_comparison TEXT DEFAULT 'pending',
    fit_score REAL,
    fit_label TEXT, -- "strong"|"medium"|"weak"
    overlap_software_lang TEXT,
    overlap_software_framework TEXT,
    overlap_software_tools TEXT,
    overlap_software_platforms TEXT,
    overlap_skills_technical TEXT,
    overlap_skills_process TEXT,
    overlap_skills_other TEXT,
    gaps_software_lang TEXT,
    gaps_software_framework TEXT,
    gaps_software_tools TEXT,
    gaps_software_platforms TEXT,
    gaps_skills_technical TEXT,
    gaps_skills_process TEXT,
    gaps_skills_other TEXT
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