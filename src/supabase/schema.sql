-- ============================================================
-- VocabMaster v2 — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- profiles (extends auth.users)
-- ──────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'username' = 'vocabmanager' THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- words
-- ──────────────────────────────────────────
CREATE TABLE public.words (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word          TEXT NOT NULL,
  meaning       TEXT NOT NULL,
  example       TEXT,
  difficulty    INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  suneung_freq  INTEGER DEFAULT 0 CHECK (suneung_freq BETWEEN 0 AND 5),  -- 수능 빈출도 0~5
  next_review   TIMESTAMPTZ DEFAULT NOW(),
  interval_days INTEGER DEFAULT 1,
  ease_factor   NUMERIC DEFAULT 2.5,
  review_count  INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- passages (지문)
-- ──────────────────────────────────────────
CREATE TABLE public.passages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  translation TEXT,              -- DeepL / Papago 번역
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- wrong_answers (오답노트)
-- ──────────────────────────────────────────
CREATE TABLE public.wrong_answers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id     UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  tested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_answer TEXT,
  correct     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ──────────────────────────────────────────
-- test_sessions
-- ──────────────────────────────────────────
CREATE TABLE public.test_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'multiple_choice',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_answers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles"  ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- words
CREATE POLICY "Users manage own words" ON public.words
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all words" ON public.words FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- passages
CREATE POLICY "Users manage own passages" ON public.passages
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all passages" ON public.passages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- wrong_answers
CREATE POLICY "Users manage own wrong answers" ON public.wrong_answers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all wrong answers" ON public.wrong_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- test_sessions
CREATE POLICY "Users manage own sessions" ON public.test_sessions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all sessions" ON public.test_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ──────────────────────────────────────────
-- Indexes for performance
-- ──────────────────────────────────────────
CREATE INDEX idx_words_user_id       ON public.words(user_id);
CREATE INDEX idx_words_next_review   ON public.words(next_review);
CREATE INDEX idx_passages_user_id    ON public.passages(user_id);
CREATE INDEX idx_wrong_answers_user  ON public.wrong_answers(user_id);
CREATE INDEX idx_wrong_answers_word  ON public.wrong_answers(word_id);
