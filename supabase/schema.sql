-- ============================================================
-- HG Operator Training — Supabase Schema
-- Run this in the Supabase SQL editor for your project
-- ============================================================

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'admin')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,
  difficulty        TEXT DEFAULT 'beginner'
                      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_minutes INTEGER DEFAULT 0,
  is_published      BOOLEAN DEFAULT FALSE,
  sort_order        INTEGER DEFAULT 0,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- LESSONS
CREATE TABLE IF NOT EXISTS lessons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  sort_order        INTEGER DEFAULT 0,
  is_published      BOOLEAN DEFAULT FALSE,
  estimated_minutes INTEGER DEFAULT 5,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, slug)
);

-- CONTENT BLOCKS
CREATE TABLE IF NOT EXISTS content_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_type  TEXT NOT NULL
                CHECK (block_type IN ('text','video','image','diagram','quiz','callout')),
  sort_order  INTEGER DEFAULT 0,
  content     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- LESSON PROGRESS
CREATE TABLE IF NOT EXISTS lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  last_visited TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_block_id UUID NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  selected_index   INTEGER NOT NULL,
  is_correct       BOOLEAN NOT NULL,
  attempted_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_course_id      ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_blocks_lesson_id       ON content_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user       ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course     ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user          ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course        ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user     ON quiz_attempts(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON content_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- COURSES (public read for published; admin full)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (
    is_published = TRUE
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LESSONS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_published_read" ON lessons
  FOR SELECT USING (
    is_published = TRUE
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "lessons_admin_write" ON lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CONTENT BLOCKS
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_read_if_lesson_published" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.is_published = TRUE
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "blocks_admin_write" ON content_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ENROLLMENTS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_own" ON enrollments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "enrollments_admin_read" ON enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LESSON PROGRESS
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_own" ON lesson_progress
  FOR ALL USING (auth.uid() = user_id);

-- QUIZ ATTEMPTS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_own" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA (optional — delete if not needed)
-- ============================================================
-- To make your first user an admin, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
