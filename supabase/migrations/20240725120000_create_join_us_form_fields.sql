CREATE TABLE join_us_form_fields (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'choice', 'birthday')),
  options TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);