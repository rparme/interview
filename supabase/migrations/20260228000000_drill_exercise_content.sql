-- Add exercise content columns to problems table (matching generated_exercises shape)
ALTER TABLE public.problems
  ADD COLUMN description          text  NOT NULL DEFAULT '',
  ADD COLUMN examples             jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN constraints          jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN starter_code         text  NOT NULL DEFAULT '',
  ADD COLUMN unit_tests           text  NOT NULL DEFAULT '',
  ADD COLUMN solution_code        text  NOT NULL DEFAULT '',
  ADD COLUMN solution_explanation text  NOT NULL DEFAULT '';
