INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(167, 'two-pointers', 'Two Sum II - Input Array Is Sorted', 'Medium',
  'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
  ARRAY['Start with l=0, r=n-1; if sum < target move l right, if sum > target move r left',
        'The sorted guarantee means each pointer moves at most n steps — O(n) total'],
  ARRAY['Find a pair summing to a target in a sorted array',
        'Prerequisite pattern for 3Sum — the inner two-pointer loop'])
ON CONFLICT DO NOTHING;
