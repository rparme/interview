-- Curate drill catalogue: drop unused url column, remove 2 redundant drills, add 9 new drills

-- ── Drop unused url column ──────────────────────────────────────────────────
ALTER TABLE public.problems DROP COLUMN IF EXISTS url;

-- ── Remove redundant drills ─────────────────────────────────────────────────
DELETE FROM public.user_progress WHERE lc IN (904, 153);
DELETE FROM public.problems WHERE lc IN (904, 153);

-- ── Insert 9 new drills ─────────────────────────────────────────────────────
INSERT INTO public.problems (lc, category_id, title, difficulty, how_to, when_to) VALUES

-- Sliding Window: easy entry point
(643, 'sliding-window', 'Maximum Average Subarray', 'Easy',
  ARRAY['Maintain a running sum of the current window of size k; slide by subtracting the left element and adding the right',
        'Track the maximum sum seen; divide by k at the end for the average'],
  ARRAY['Fixed-size window scanning for an aggregate (sum, average, max)',
        'Simplest sliding window — good warm-up before variable-width problems']),

-- Two Pointers: easy entry point
(977, 'two-pointers', 'Squares of a Sorted Array', 'Easy',
  ARRAY['Two pointers at both ends of the array; compare absolute values and fill the result from the back',
        'The largest square must come from one of the two ends since the array is sorted'],
  ARRAY['Sorted input with negative numbers where squaring breaks the sort order',
        'Merge-from-ends pattern on a sorted array']),

-- Binary Search: easy entry point
(704, 'binary-search', 'Binary Search', 'Easy',
  ARRAY['Classic binary search: compare mid with target, narrow to left or right half',
        'Use lo <= hi loop; return mid on match, return -1 if lo > hi'],
  ARRAY['Search for a specific value in a sorted array',
        'The most fundamental binary search — prerequisite for all variants']),

-- Binary Search: medium range query
(34, 'binary-search', 'First and Last Position', 'Medium',
  ARRAY['Run binary search twice: once biased left (find first) and once biased right (find last)',
        'For leftmost: when nums[mid] == target, keep searching left; for rightmost: keep searching right'],
  ARRAY['Find the range of indices where a target appears in a sorted array',
        'Binary search for boundaries rather than exact match — bisect_left / bisect_right pattern']),

-- Graphs: medium clone / traversal
(133, 'graphs', 'Clone Graph', 'Medium',
  ARRAY['BFS or DFS with a hash map from original node to its clone; process each neighbor recursively',
        'When visiting a neighbor, return the existing clone if already created — prevents infinite loops'],
  ARRAY['Deep copy a graph or linked structure with cycles',
        'HashMap-based traversal to replicate nodes while preserving adjacency relationships']),

-- Graphs: medium shortest path
(743, 'graphs', 'Network Delay Time', 'Medium',
  ARRAY['Dijkstra with a min-heap: process the node with the smallest known distance first',
        'Build an adjacency list from edges; answer is the maximum distance among all reachable nodes'],
  ARRAY['Find shortest paths from a single source in a weighted graph',
        'Classic Dijkstra application — positive weights, single-source shortest path']),

-- Dynamic Programming: medium subsequence
(300, 'dynamic-programming', 'Longest Increasing Subsequence', 'Medium',
  ARRAY['dp[i] = length of LIS ending at index i; dp[i] = 1 + max(dp[j]) for all j < i where nums[j] < nums[i]',
        'O(n log n) optimization: maintain a tails array and use binary search to find the insertion point'],
  ARRAY['Find the longest subsequence with a strictly increasing order',
        'Classic 1D DP on subsequences — foundation for patience sorting and related problems']),

-- Dynamic Programming: medium subset sum
(416, 'dynamic-programming', 'Partition Equal Subset Sum', 'Medium',
  ARRAY['Reduce to subset sum: can we find a subset summing to totalSum / 2?',
        'Boolean DP: dp[j] = true if sum j is achievable; iterate nums and update dp from right to left'],
  ARRAY['Partition an array into two subsets with equal sum',
        '0/1 knapsack variant — each element is used at most once, target is half the total']),

-- Heaps & Intervals: medium selection
(215, 'heaps-intervals', 'Kth Largest Element', 'Medium',
  ARRAY['Min-heap of size k: push each element, pop when size exceeds k; top of heap is the answer',
        'Quickselect alternative: partition around a pivot, recurse into the half containing the k-th element'],
  ARRAY['Find the k-th largest (or smallest) element in an unsorted array',
        'Top-K selection pattern — heap gives O(n log k), quickselect gives O(n) average'])

ON CONFLICT DO NOTHING;
