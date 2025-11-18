CREATE TABLE join_us_submissions (
  id SERIAL PRIMARY KEY,
  submission_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);