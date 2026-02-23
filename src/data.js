export const CATEGORIES = [
  {
    id: 'sliding-window',
    name: 'Sliding Window',
    lines: ['Sliding', 'Window'],
    color: '#f97316',
    problems: [
      {
        title: 'Find All Anagrams in a String', lc: 438, difficulty: 'Medium', done: true,
        url: 'https://leetcode.com/problems/find-all-anagrams-in-a-string/',
        howTo: [
          'Fixed window of size p; maintain a freq map of p and the current window',
          'When window freq matches target freq exactly, record the left index',
        ],
        whenTo: [
          'Fixed-length window that must match a character pattern',
          'Anagram / permutation detection inside a longer string',
        ],
      },
      {
        title: 'Longest Repeating Character Replacement', lc: 424, difficulty: 'Medium', done: true,
        url: 'https://leetcode.com/problems/longest-repeating-character-replacement/',
        howTo: [
          'Track the max-frequency char in the window; shrink when (window size − maxFreq) > k',
          'Never shrink below the best valid window seen so far — only grow',
        ],
        whenTo: [
          'Replace at most k characters to make all chars in a window identical',
          'Window where one character dominates and the rest are replaceable',
        ],
      },
      {
        title: 'Fruit Into Baskets', lc: 904, difficulty: 'Medium', done: true,
        url: 'https://leetcode.com/problems/fruit-into-baskets/',
        howTo: [
          'Sliding window with a hash map; shrink left when distinct keys exceed 2',
          'Equivalent to: longest subarray with at most 2 distinct values',
        ],
        whenTo: [
          'At most K distinct elements allowed in the window',
          'Maximize subarray length under a constraint on variety',
        ],
      },
      {
        title: 'Minimum Window Substring', lc: 76, difficulty: 'Hard', done: true,
        url: 'https://leetcode.com/problems/minimum-window-substring/',
        howTo: [
          'Expand right until all required chars are covered; then shrink left to minimize',
          'Track "have" vs "need" counts; a ratio check avoids scanning the whole map',
        ],
        whenTo: [
          'Find the smallest window containing all target characters',
          'Cover all requirements first, then optimize by shrinking',
        ],
      },
      {
        title: 'Subarrays with K Different Integers', lc: 992, difficulty: 'Hard', done: true,
        url: 'https://leetcode.com/problems/subarrays-with-k-different-integers/',
        howTo: [
          'exactK(k) = atMost(k) − atMost(k−1)',
          'atMost(k): standard sliding window that shrinks when distinct count > k',
        ],
        whenTo: [
          'Count subarrays with exactly K distinct values',
          'Any "exact count" window problem — decompose into two atMost calls',
        ],
      },
      {
        title: 'Longest Substring Without Repeating Chars', lc: 3, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
        howTo: [
          'Use a map of char → last seen index; on duplicate, jump left past the previous occurrence',
          'Window always represents the longest valid unique-char range ending at right',
        ],
        whenTo: [
          'No repeating elements allowed anywhere in the window',
          'Maximize length of a subarray/substring with all unique elements',
        ],
      },
      {
        title: 'Minimum Size Subarray Sum', lc: 209, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/minimum-size-subarray-sum/',
        howTo: [
          'Expand right accumulating sum; whenever sum ≥ target, shrink left and record length',
          'All values are positive — shrinking is always safe here',
        ],
        whenTo: [
          'Find the shortest subarray whose sum meets or exceeds a target',
          'Positive numbers only — shrinking the window reduces sum predictably',
        ],
      },
    ],
  },
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    lines: ['Two', 'Pointers'],
    color: '#3b82f6',
    problems: [
      {
        title: '3Sum', lc: 15, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/3sum/',
        howTo: [
          'Sort first; fix one element, then run two-pointer on the remaining subarray',
          'Skip duplicates at all three levels to avoid repeated triplets',
        ],
        whenTo: [
          'Find triplets summing to a target in an array',
          'Reduce a 3-element problem to 2Sum by fixing one element',
        ],
      },
      {
        title: 'Container With Most Water', lc: 11, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/container-with-most-water/',
        howTo: [
          'Start with the widest window (l=0, r=n-1); always move the shorter pointer inward',
          'Area = min(h[l], h[r]) × (r − l); moving the taller side can never increase area',
        ],
        whenTo: [
          'Maximize area/volume between two boundaries in an array',
          'Greedy: the bottleneck is always the shorter wall',
        ],
      },
      {
        title: 'Trapping Rain Water', lc: 42, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/trapping-rain-water/',
        howTo: [
          'Two pointers: track leftMax and rightMax; water at i = min(leftMax, rightMax) − height[i]',
          'Move the pointer with the smaller max — it determines the water level',
        ],
        whenTo: [
          'Compute trapped water or space between elevation bars',
          'Each position needs both its left-max and right-max context',
        ],
      },
      {
        title: 'Sort Colors', lc: 75, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/sort-colors/',
        howTo: [
          'Dutch National Flag: three pointers lo, mid, hi — swap based on nums[mid]',
          'lo = next 0 slot, hi = next 2 slot; mid scans forward until it crosses hi',
        ],
        whenTo: [
          'In-place partition into exactly 3 groups in a single pass',
          'Three-way partitioning around a known pivot value',
        ],
      },
    ],
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    lines: ['Binary', 'Search'],
    color: '#8b5cf6',
    problems: [
      {
        title: 'Search in Rotated Sorted Array', lc: 33, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
        howTo: [
          'Determine which half is fully sorted; check whether the target falls in that half',
          'One half is always sorted — use that invariant to decide which side to discard',
        ],
        whenTo: [
          'Binary search on an array rotated at an unknown pivot',
          'Modified binary search where normal sorted-half logic still applies',
        ],
      },
      {
        title: 'Find Min in Rotated Sorted Array', lc: 153, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/',
        howTo: [
          'If nums[mid] > nums[right], the min is in the right half; otherwise look left (including mid)',
          'When nums[left] < nums[right], the subarray is fully sorted — return nums[left]',
        ],
        whenTo: [
          'Find the rotation point / minimum element in a rotated sorted array',
          'Binary search where the goal is the inflection point, not a specific value',
        ],
      },
      {
        title: 'Koko Eating Bananas', lc: 875, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/koko-eating-bananas/',
        howTo: [
          'Binary search on the answer space [1, max(piles)]',
          'For each candidate speed, compute total hours; if ≤ h, try slower',
        ],
        whenTo: [
          'Minimize or maximize a value subject to a feasibility check',
          '"Binary search on the answer" — search the value space, not an index',
        ],
      },
      {
        title: 'Median of Two Sorted Arrays', lc: 4, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
        howTo: [
          'Binary search on the partition of the smaller array to find the correct split',
          'Ensure left halves together have ⌈(m+n)/2⌉ elements; validate with cross-boundary check',
        ],
        whenTo: [
          'Find the median of two sorted arrays in O(log min(m,n))',
          'Canonical hard binary search — partition both arrays simultaneously',
        ],
      },
    ],
  },
  {
    id: 'trees',
    name: 'Trees',
    lines: ['Trees'],
    color: '#22c55e',
    problems: [
      {
        title: 'Maximum Depth of Binary Tree', lc: 104, difficulty: 'Easy', done: false,
        url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
        howTo: [
          'DFS: return 1 + max(depth(left), depth(right)); base case null → 0',
          'BFS alternative: count levels in level-order traversal',
        ],
        whenTo: [
          'Any depth or height measurement on a tree',
          'Warm-up problem — establishes the basic recursive tree pattern',
        ],
      },
      {
        title: 'Binary Tree Level Order Traversal', lc: 102, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
        howTo: [
          'BFS with a queue; snapshot the queue size at the start of each level',
          'Process exactly that many nodes per iteration and group them into a level list',
        ],
        whenTo: [
          'Process or group nodes level by level',
          'Anything needing "all nodes at the same depth" bundled together',
        ],
      },
      {
        title: 'Lowest Common Ancestor', lc: 236, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/',
        howTo: [
          'Postorder DFS: if both left and right return non-null, the current node is the LCA',
          'Return the node itself immediately if it equals p or q — it can be its own ancestor',
        ],
        whenTo: [
          'Find the deepest node that has both targets in its subtree',
          'Post-order: need results from both children before deciding at the parent',
        ],
      },
      {
        title: 'Binary Tree Maximum Path Sum', lc: 124, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/',
        howTo: [
          'DFS returns the best single-arm gain from each node; clamp negative gains to 0',
          'At each node, update the global max with left gain + node.val + right gain',
        ],
        whenTo: [
          'Path can start and end at any node — not required to pass through root',
          'Post-order with a global max: combine children values, but return only one arm upward',
        ],
      },
      {
        title: 'Serialize and Deserialize Binary Tree', lc: 297, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
        howTo: [
          'Preorder serialize with null markers (e.g. "#"); split by delimiter to deserialize',
          'Deserialize recursively using a queue of tokens to maintain position',
        ],
        whenTo: [
          'Need to encode/decode a tree structure as a flat string',
          'Preorder naturally encodes parent before children — makes reconstruction straightforward',
        ],
      },
    ],
  },
  {
    id: 'graphs',
    name: 'Graphs',
    lines: ['Graphs'],
    color: '#06b6d4',
    problems: [
      {
        title: 'Number of Islands', lc: 200, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/number-of-islands/',
        howTo: [
          'DFS/BFS from each unvisited "1"; mark all connected land cells as visited',
          'Each DFS call sinks one full island — increment counter once per call',
        ],
        whenTo: [
          'Count connected components in a 2D grid',
          'Classic flood-fill / graph traversal on a matrix',
        ],
      },
      {
        title: 'Course Schedule', lc: 207, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/course-schedule/',
        howTo: [
          'Build a directed graph from prereqs; detect cycle via DFS with three states (unvisited / visiting / visited)',
          "Kahn's BFS alternative: process nodes with in-degree 0; cycle exists if not all nodes processed",
        ],
        whenTo: [
          'Detect a cycle in a directed graph',
          'Dependency / prerequisite ordering problems',
        ],
      },
      {
        title: 'Pacific Atlantic Water Flow', lc: 417, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/',
        howTo: [
          'BFS/DFS inward from Pacific borders (top/left) and Atlantic borders (bottom/right) separately',
          'A cell is in the answer if it appears in both reachable sets (reverse flow: go uphill)',
        ],
        whenTo: [
          'Multi-source BFS from two different boundaries simultaneously',
          'Reverse the direction of flow to simplify reachability',
        ],
      },
      {
        title: 'Alien Dictionary', lc: 269, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/alien-dictionary/',
        howTo: [
          'Compare adjacent words to extract character ordering edges; build a directed graph',
          'Topological sort the characters; if a cycle is detected, return ""',
        ],
        whenTo: [
          'Infer a total ordering from a sorted sequence of items',
          'Topological sort on an implicit graph built from comparisons',
        ],
      },
    ],
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic Programming',
    lines: ['Dynamic', 'Program.'],
    color: '#ec4899',
    problems: [
      {
        title: 'Climbing Stairs', lc: 70, difficulty: 'Easy', done: false,
        url: 'https://leetcode.com/problems/climbing-stairs/',
        howTo: [
          'dp[i] = dp[i−1] + dp[i−2] — identical to Fibonacci',
          'Base cases: dp[1] = 1, dp[2] = 2; only the last two values are needed',
        ],
        whenTo: [
          'Count distinct ways to reach a state with choices of 1 or 2 steps',
          'Simplest 1D DP — the entry point for the Fibonacci / recurrence pattern',
        ],
      },
      {
        title: 'House Robber', lc: 198, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/house-robber/',
        howTo: [
          'dp[i] = max(dp[i−1], dp[i−2] + nums[i]) — skip or rob current house',
          'Space-optimize to two variables since only the last two states matter',
        ],
        whenTo: [
          'Cannot pick adjacent elements; maximize total sum',
          'Take-or-skip DP with an adjacency constraint',
        ],
      },
      {
        title: 'Coin Change', lc: 322, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/coin-change/',
        howTo: [
          'Bottom-up: dp[0]=0, dp[i] = min(dp[i−coin]+1) over all valid coins',
          'Initialize dp array to infinity; answer is dp[amount] (or −1 if unreachable)',
        ],
        whenTo: [
          'Unbounded knapsack — items are reusable, minimize the count used',
          'Fill a target value with items of given sizes (classic DP on amounts)',
        ],
      },
      {
        title: 'Longest Common Subsequence', lc: 1143, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/longest-common-subsequence/',
        howTo: [
          'dp[i][j]: if chars match → dp[i−1][j−1]+1; else → max(dp[i−1][j], dp[i][j−1])',
          'Build a 2D table; the answer is at dp[m][n]',
        ],
        whenTo: [
          'Find the longest subsequence common to two strings or sequences',
          'Classic 2D DP — align two sequences character by character',
        ],
      },
      {
        title: 'Edit Distance', lc: 72, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/edit-distance/',
        howTo: [
          'dp[i][j] = min edits to convert s1[:i] to s2[:j]',
          'Match: dp[i−1][j−1]; mismatch: 1 + min(insert dp[i][j−1], delete dp[i−1][j], replace dp[i−1][j−1])',
        ],
        whenTo: [
          'Transform one string into another with the fewest insert/delete/replace operations',
          '2D DP comparing prefixes of two strings — LCS sibling problem',
        ],
      },
    ],
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    lines: ['Back-', 'tracking'],
    color: '#f59e0b',
    problems: [
      {
        title: 'Subsets', lc: 78, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/subsets/',
        howTo: [
          'At each step, branch: include the current element or exclude it; recurse on the rest',
          'Record the current path at every node of the recursion tree (not just leaves)',
        ],
        whenTo: [
          'Generate all subsets / the power set of a collection',
          'Binary choice at each element — no pruning needed',
        ],
      },
      {
        title: 'Permutations', lc: 46, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/permutations/',
        howTo: [
          'Swap nums[start] with each nums[i] where i ≥ start; recurse; swap back to restore',
          'Alternatively use a boolean "used" array and build the path incrementally',
        ],
        whenTo: [
          'Generate all orderings of a set of elements',
          'Order matters and every element must be used exactly once',
        ],
      },
      {
        title: 'Combination Sum', lc: 39, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/combination-sum/',
        howTo: [
          'DFS with a running total; the same candidate can be reused — do not advance the index on reuse',
          'Sort candidates and prune: if candidates[i] > remaining, stop the loop',
        ],
        whenTo: [
          'Find all combinations summing to a target where repetition is allowed',
          'Combination problems with unlimited reuse of elements',
        ],
      },
      {
        title: 'Word Search', lc: 79, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/word-search/',
        howTo: [
          'DFS from every cell matching word[0]; mark cell visited, explore 4 neighbors, unmark on return',
          'Prune immediately when the current cell does not match the expected character',
        ],
        whenTo: [
          'Find a path on a grid that spells out a given sequence',
          'DFS with backtracking on a 2D grid',
        ],
      },
    ],
  },
  {
    id: 'heaps-intervals',
    name: 'Heaps & Intervals',
    lines: ['Heaps &', 'Intervals'],
    color: '#ef4444',
    problems: [
      {
        title: 'Find Median from Data Stream', lc: 295, difficulty: 'Hard', done: false,
        url: 'https://leetcode.com/problems/find-median-from-data-stream/',
        howTo: [
          'Max-heap for the lower half, min-heap for the upper half; keep sizes balanced (differ by at most 1)',
          'Median = top of the larger heap, or average of both tops when sizes are equal',
        ],
        whenTo: [
          'Maintain a running median as elements stream in',
          'Two complementary heaps that together represent a sorted split',
        ],
      },
      {
        title: 'Merge Intervals', lc: 56, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/merge-intervals/',
        howTo: [
          'Sort by start time; if the current interval overlaps the last merged one, extend its end',
          'Single pass after sorting — O(n log n) total',
        ],
        whenTo: [
          'Combine overlapping intervals into the minimal non-overlapping set',
          'Sort then scan — the canonical interval merge pattern',
        ],
      },
      {
        title: 'Meeting Rooms II', lc: 253, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/meeting-rooms-ii/',
        howTo: [
          'Sort meetings by start; use a min-heap of end times',
          'If heap top ≤ current start, a room is free — pop and reuse; push new end time; heap size = answer',
        ],
        whenTo: [
          'Count the minimum number of simultaneous resources needed',
          'Schedule overlap detection: use a heap to track the earliest ending event',
        ],
      },
      {
        title: 'Top K Frequent Elements', lc: 347, difficulty: 'Medium', done: false,
        url: 'https://leetcode.com/problems/top-k-frequent-elements/',
        howTo: [
          'Count frequencies; maintain a min-heap of size K — evict the least frequent when full',
          'Bucket sort alternative: buckets indexed by frequency give an O(n) solution',
        ],
        whenTo: [
          'Find the K most (or least) frequent elements',
          'Top-K pattern: min-heap of size K or quick-select on frequency',
        ],
      },
    ],
  },
]

export const TOTAL_DONE  = CATEGORIES.reduce((s, c) => s + c.problems.filter(p => p.done).length, 0)
export const TOTAL_PROBS = CATEGORIES.reduce((s, c) => s + c.problems.length, 0)
