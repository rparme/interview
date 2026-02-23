-- Categories
INSERT INTO public.categories (id, name, lines, color) VALUES
  ('sliding-window',      'Sliding Window',       ARRAY['Sliding', 'Window'],     '#f97316'),
  ('two-pointers',        'Two Pointers',         ARRAY['Two', 'Pointers'],        '#3b82f6'),
  ('binary-search',       'Binary Search',        ARRAY['Binary', 'Search'],       '#8b5cf6'),
  ('trees',               'Trees',                ARRAY['Trees'],                  '#22c55e'),
  ('graphs',              'Graphs',               ARRAY['Graphs'],                 '#06b6d4'),
  ('dynamic-programming', 'Dynamic Programming',  ARRAY['Dynamic', 'Program.'],   '#ec4899'),
  ('backtracking',        'Backtracking',         ARRAY['Back-', 'tracking'],      '#f59e0b'),
  ('heaps-intervals',     'Heaps & Intervals',    ARRAY['Heaps &', 'Intervals'],   '#ef4444')
ON CONFLICT DO NOTHING;

-- Problems — Sliding Window
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(438, 'sliding-window', 'Find All Anagrams in a String', 'Medium',
  'https://leetcode.com/problems/find-all-anagrams-in-a-string/',
  ARRAY['Fixed window of size p; maintain a freq map of p and the current window',
        'When window freq matches target freq exactly, record the left index'],
  ARRAY['Fixed-length window that must match a character pattern',
        'Anagram / permutation detection inside a longer string']),

(424, 'sliding-window', 'Longest Repeating Character Replacement', 'Medium',
  'https://leetcode.com/problems/longest-repeating-character-replacement/',
  ARRAY['Track the max-frequency char in the window; shrink when (window size - maxFreq) > k',
        'Never shrink below the best valid window seen so far — only grow'],
  ARRAY['Replace at most k characters to make all chars in a window identical',
        'Window where one character dominates and the rest are replaceable']),

(904, 'sliding-window', 'Fruit Into Baskets', 'Medium',
  'https://leetcode.com/problems/fruit-into-baskets/',
  ARRAY['Sliding window with a hash map; shrink left when distinct keys exceed 2',
        'Equivalent to: longest subarray with at most 2 distinct values'],
  ARRAY['At most K distinct elements allowed in the window',
        'Maximize subarray length under a constraint on variety']),

(76, 'sliding-window', 'Minimum Window Substring', 'Hard',
  'https://leetcode.com/problems/minimum-window-substring/',
  ARRAY['Expand right until all required chars are covered; then shrink left to minimize',
        'Track "have" vs "need" counts; a ratio check avoids scanning the whole map'],
  ARRAY['Find the smallest window containing all target characters',
        'Cover all requirements first, then optimize by shrinking']),

(992, 'sliding-window', 'Subarrays with K Different Integers', 'Hard',
  'https://leetcode.com/problems/subarrays-with-k-different-integers/',
  ARRAY['exactK(k) = atMost(k) - atMost(k-1)',
        'atMost(k): standard sliding window that shrinks when distinct count > k'],
  ARRAY['Count subarrays with exactly K distinct values',
        'Any "exact count" window problem — decompose into two atMost calls']),

(3, 'sliding-window', 'Longest Substring Without Repeating Chars', 'Medium',
  'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
  ARRAY['Use a map of char → last seen index; on duplicate, jump left past the previous occurrence',
        'Window always represents the longest valid unique-char range ending at right'],
  ARRAY['No repeating elements allowed anywhere in the window',
        'Maximize length of a subarray/substring with all unique elements']),

(209, 'sliding-window', 'Minimum Size Subarray Sum', 'Medium',
  'https://leetcode.com/problems/minimum-size-subarray-sum/',
  ARRAY['Expand right accumulating sum; whenever sum >= target, shrink left and record length',
        'All values are positive — shrinking is always safe here'],
  ARRAY['Find the shortest subarray whose sum meets or exceeds a target',
        'Positive numbers only — shrinking the window reduces sum predictably'])

ON CONFLICT DO NOTHING;

-- Problems — Two Pointers
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(15, 'two-pointers', '3Sum', 'Medium',
  'https://leetcode.com/problems/3sum/',
  ARRAY['Sort first; fix one element, then run two-pointer on the remaining subarray',
        'Skip duplicates at all three levels to avoid repeated triplets'],
  ARRAY['Find triplets summing to a target in an array',
        'Reduce a 3-element problem to 2Sum by fixing one element']),

(11, 'two-pointers', 'Container With Most Water', 'Medium',
  'https://leetcode.com/problems/container-with-most-water/',
  ARRAY['Start with the widest window (l=0, r=n-1); always move the shorter pointer inward',
        'Area = min(h[l], h[r]) x (r - l); moving the taller side can never increase area'],
  ARRAY['Maximize area/volume between two boundaries in an array',
        'Greedy: the bottleneck is always the shorter wall']),

(42, 'two-pointers', 'Trapping Rain Water', 'Hard',
  'https://leetcode.com/problems/trapping-rain-water/',
  ARRAY['Two pointers: track leftMax and rightMax; water at i = min(leftMax, rightMax) - height[i]',
        'Move the pointer with the smaller max — it determines the water level'],
  ARRAY['Compute trapped water or space between elevation bars',
        'Each position needs both its left-max and right-max context']),

(75, 'two-pointers', 'Sort Colors', 'Medium',
  'https://leetcode.com/problems/sort-colors/',
  ARRAY['Dutch National Flag: three pointers lo, mid, hi — swap based on nums[mid]',
        'lo = next 0 slot, hi = next 2 slot; mid scans forward until it crosses hi'],
  ARRAY['In-place partition into exactly 3 groups in a single pass',
        'Three-way partitioning around a known pivot value'])

ON CONFLICT DO NOTHING;

-- Problems — Binary Search
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(33, 'binary-search', 'Search in Rotated Sorted Array', 'Medium',
  'https://leetcode.com/problems/search-in-rotated-sorted-array/',
  ARRAY['Determine which half is fully sorted; check whether the target falls in that half',
        'One half is always sorted — use that invariant to decide which side to discard'],
  ARRAY['Binary search on an array rotated at an unknown pivot',
        'Modified binary search where normal sorted-half logic still applies']),

(153, 'binary-search', 'Find Min in Rotated Sorted Array', 'Medium',
  'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/',
  ARRAY['If nums[mid] > nums[right], the min is in the right half; otherwise look left (including mid)',
        'When nums[left] < nums[right], the subarray is fully sorted — return nums[left]'],
  ARRAY['Find the rotation point / minimum element in a rotated sorted array',
        'Binary search where the goal is the inflection point, not a specific value']),

(875, 'binary-search', 'Koko Eating Bananas', 'Medium',
  'https://leetcode.com/problems/koko-eating-bananas/',
  ARRAY['Binary search on the answer space [1, max(piles)]',
        'For each candidate speed, compute total hours; if <= h, try slower'],
  ARRAY['Minimize or maximize a value subject to a feasibility check',
        '"Binary search on the answer" — search the value space, not an index']),

(4, 'binary-search', 'Median of Two Sorted Arrays', 'Hard',
  'https://leetcode.com/problems/median-of-two-sorted-arrays/',
  ARRAY['Binary search on the partition of the smaller array to find the correct split',
        'Ensure left halves together have ceil((m+n)/2) elements; validate with cross-boundary check'],
  ARRAY['Find the median of two sorted arrays in O(log min(m,n))',
        'Canonical hard binary search — partition both arrays simultaneously'])

ON CONFLICT DO NOTHING;

-- Problems — Trees
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(104, 'trees', 'Maximum Depth of Binary Tree', 'Easy',
  'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
  ARRAY['DFS: return 1 + max(depth(left), depth(right)); base case null → 0',
        'BFS alternative: count levels in level-order traversal'],
  ARRAY['Any depth or height measurement on a tree',
        'Warm-up problem — establishes the basic recursive tree pattern']),

(102, 'trees', 'Binary Tree Level Order Traversal', 'Medium',
  'https://leetcode.com/problems/binary-tree-level-order-traversal/',
  ARRAY['BFS with a queue; snapshot the queue size at the start of each level',
        'Process exactly that many nodes per iteration and group them into a level list'],
  ARRAY['Process or group nodes level by level',
        'Anything needing "all nodes at the same depth" bundled together']),

(236, 'trees', 'Lowest Common Ancestor', 'Medium',
  'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/',
  ARRAY['Postorder DFS: if both left and right return non-null, the current node is the LCA',
        'Return the node itself immediately if it equals p or q — it can be its own ancestor'],
  ARRAY['Find the deepest node that has both targets in its subtree',
        'Post-order: need results from both children before deciding at the parent']),

(124, 'trees', 'Binary Tree Maximum Path Sum', 'Hard',
  'https://leetcode.com/problems/binary-tree-maximum-path-sum/',
  ARRAY['DFS returns the best single-arm gain from each node; clamp negative gains to 0',
        'At each node, update the global max with left gain + node.val + right gain'],
  ARRAY['Path can start and end at any node — not required to pass through root',
        'Post-order with a global max: combine children values, but return only one arm upward']),

(297, 'trees', 'Serialize and Deserialize Binary Tree', 'Hard',
  'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
  ARRAY['Preorder serialize with null markers (e.g. "#"); split by delimiter to deserialize',
        'Deserialize recursively using a queue of tokens to maintain position'],
  ARRAY['Need to encode/decode a tree structure as a flat string',
        'Preorder naturally encodes parent before children — makes reconstruction straightforward'])

ON CONFLICT DO NOTHING;

-- Problems — Graphs
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(200, 'graphs', 'Number of Islands', 'Medium',
  'https://leetcode.com/problems/number-of-islands/',
  ARRAY['DFS/BFS from each unvisited "1"; mark all connected land cells as visited',
        'Each DFS call sinks one full island — increment counter once per call'],
  ARRAY['Count connected components in a 2D grid',
        'Classic flood-fill / graph traversal on a matrix']),

(207, 'graphs', 'Course Schedule', 'Medium',
  'https://leetcode.com/problems/course-schedule/',
  ARRAY['Build a directed graph from prereqs; detect cycle via DFS with three states (unvisited / visiting / visited)',
        'Kahn''s BFS alternative: process nodes with in-degree 0; cycle exists if not all nodes processed'],
  ARRAY['Detect a cycle in a directed graph',
        'Dependency / prerequisite ordering problems']),

(417, 'graphs', 'Pacific Atlantic Water Flow', 'Medium',
  'https://leetcode.com/problems/pacific-atlantic-water-flow/',
  ARRAY['BFS/DFS inward from Pacific borders (top/left) and Atlantic borders (bottom/right) separately',
        'A cell is in the answer if it appears in both reachable sets (reverse flow: go uphill)'],
  ARRAY['Multi-source BFS from two different boundaries simultaneously',
        'Reverse the direction of flow to simplify reachability']),

(269, 'graphs', 'Alien Dictionary', 'Hard',
  'https://leetcode.com/problems/alien-dictionary/',
  ARRAY['Compare adjacent words to extract character ordering edges; build a directed graph',
        'Topological sort the characters; if a cycle is detected, return ""'],
  ARRAY['Infer a total ordering from a sorted sequence of items',
        'Topological sort on an implicit graph built from comparisons'])

ON CONFLICT DO NOTHING;

-- Problems — Dynamic Programming
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(70, 'dynamic-programming', 'Climbing Stairs', 'Easy',
  'https://leetcode.com/problems/climbing-stairs/',
  ARRAY['dp[i] = dp[i-1] + dp[i-2] — identical to Fibonacci',
        'Base cases: dp[1] = 1, dp[2] = 2; only the last two values are needed'],
  ARRAY['Count distinct ways to reach a state with choices of 1 or 2 steps',
        'Simplest 1D DP — the entry point for the Fibonacci / recurrence pattern']),

(198, 'dynamic-programming', 'House Robber', 'Medium',
  'https://leetcode.com/problems/house-robber/',
  ARRAY['dp[i] = max(dp[i-1], dp[i-2] + nums[i]) — skip or rob current house',
        'Space-optimize to two variables since only the last two states matter'],
  ARRAY['Cannot pick adjacent elements; maximize total sum',
        'Take-or-skip DP with an adjacency constraint']),

(322, 'dynamic-programming', 'Coin Change', 'Medium',
  'https://leetcode.com/problems/coin-change/',
  ARRAY['Bottom-up: dp[0]=0, dp[i] = min(dp[i-coin]+1) over all valid coins',
        'Initialize dp array to infinity; answer is dp[amount] (or -1 if unreachable)'],
  ARRAY['Unbounded knapsack — items are reusable, minimize the count used',
        'Fill a target value with items of given sizes (classic DP on amounts)']),

(1143, 'dynamic-programming', 'Longest Common Subsequence', 'Medium',
  'https://leetcode.com/problems/longest-common-subsequence/',
  ARRAY['dp[i][j]: if chars match → dp[i-1][j-1]+1; else → max(dp[i-1][j], dp[i][j-1])',
        'Build a 2D table; the answer is at dp[m][n]'],
  ARRAY['Find the longest subsequence common to two strings or sequences',
        'Classic 2D DP — align two sequences character by character']),

(72, 'dynamic-programming', 'Edit Distance', 'Medium',
  'https://leetcode.com/problems/edit-distance/',
  ARRAY['dp[i][j] = min edits to convert s1[:i] to s2[:j]',
        'Match: dp[i-1][j-1]; mismatch: 1 + min(insert dp[i][j-1], delete dp[i-1][j], replace dp[i-1][j-1])'],
  ARRAY['Transform one string into another with the fewest insert/delete/replace operations',
        '2D DP comparing prefixes of two strings — LCS sibling problem'])

ON CONFLICT DO NOTHING;

-- Problems — Backtracking
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(78, 'backtracking', 'Subsets', 'Medium',
  'https://leetcode.com/problems/subsets/',
  ARRAY['At each step, branch: include the current element or exclude it; recurse on the rest',
        'Record the current path at every node of the recursion tree (not just leaves)'],
  ARRAY['Generate all subsets / the power set of a collection',
        'Binary choice at each element — no pruning needed']),

(46, 'backtracking', 'Permutations', 'Medium',
  'https://leetcode.com/problems/permutations/',
  ARRAY['Swap nums[start] with each nums[i] where i >= start; recurse; swap back to restore',
        'Alternatively use a boolean "used" array and build the path incrementally'],
  ARRAY['Generate all orderings of a set of elements',
        'Order matters and every element must be used exactly once']),

(39, 'backtracking', 'Combination Sum', 'Medium',
  'https://leetcode.com/problems/combination-sum/',
  ARRAY['DFS with a running total; the same candidate can be reused — do not advance the index on reuse',
        'Sort candidates and prune: if candidates[i] > remaining, stop the loop'],
  ARRAY['Find all combinations summing to a target where repetition is allowed',
        'Combination problems with unlimited reuse of elements']),

(79, 'backtracking', 'Word Search', 'Medium',
  'https://leetcode.com/problems/word-search/',
  ARRAY['DFS from every cell matching word[0]; mark cell visited, explore 4 neighbors, unmark on return',
        'Prune immediately when the current cell does not match the expected character'],
  ARRAY['Find a path on a grid that spells out a given sequence',
        'DFS with backtracking on a 2D grid'])

ON CONFLICT DO NOTHING;

-- Problems — Heaps & Intervals
INSERT INTO public.problems (lc, category_id, title, difficulty, url, how_to, when_to) VALUES
(295, 'heaps-intervals', 'Find Median from Data Stream', 'Hard',
  'https://leetcode.com/problems/find-median-from-data-stream/',
  ARRAY['Max-heap for the lower half, min-heap for the upper half; keep sizes balanced (differ by at most 1)',
        'Median = top of the larger heap, or average of both tops when sizes are equal'],
  ARRAY['Maintain a running median as elements stream in',
        'Two complementary heaps that together represent a sorted split']),

(56, 'heaps-intervals', 'Merge Intervals', 'Medium',
  'https://leetcode.com/problems/merge-intervals/',
  ARRAY['Sort by start time; if the current interval overlaps the last merged one, extend its end',
        'Single pass after sorting — O(n log n) total'],
  ARRAY['Combine overlapping intervals into the minimal non-overlapping set',
        'Sort then scan — the canonical interval merge pattern']),

(253, 'heaps-intervals', 'Meeting Rooms II', 'Medium',
  'https://leetcode.com/problems/meeting-rooms-ii/',
  ARRAY['Sort meetings by start; use a min-heap of end times',
        'If heap top <= current start, a room is free — pop and reuse; push new end time; heap size = answer'],
  ARRAY['Count the minimum number of simultaneous resources needed',
        'Schedule overlap detection: use a heap to track the earliest ending event']),

(347, 'heaps-intervals', 'Top K Frequent Elements', 'Medium',
  'https://leetcode.com/problems/top-k-frequent-elements/',
  ARRAY['Count frequencies; maintain a min-heap of size K — evict the least frequent when full',
        'Bucket sort alternative: buckets indexed by frequency give an O(n) solution'],
  ARRAY['Find the K most (or least) frequent elements',
        'Top-K pattern: min-heap of size K or quick-select on frequency'])

ON CONFLICT DO NOTHING;
