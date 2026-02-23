# Interview Mindmap Architect - Memory

## Repository Structure
- Root: `/mnt/c/workspace/interview/`
- Main mindmap file: `/mnt/c/workspace/interview/mindmap.md`
- Uses Nix flake for environment management

## Mindmap Architecture Decisions (v2 -- Focused Redesign)
- **Design philosophy**: Focused and motivating over comprehensive. ~40 problems total, not 120.
- **Primary diagram**: Single Mermaid `mindmap` ("Start Here") with 8 categories, max 2 levels below root
- **Supplementary diagrams**: Mermaid `graph TD` for relationship maps within completed categories (Sliding Window done)
- **Completed problems**: Marked with `DONE` prefix in mindmap node labels; green `fill:#4CAF50` styling in graph diagrams
- **Problem nodes**: Include problem name, LC number, and difficulty level (no key insights in mindmap -- kept clean)
- **Detail maps**: Key insights and relationships go in per-category `graph TD` detail maps, not the main mindmap
- **Progress checklist**: Full checkbox list in Section 3 for tracking completion
- **File structure**: 3 sections -- (1) Start Here mindmap, (2) Sliding Window detail map, (3) Progress and Legend

## Top-Level Categories (8 total, FAANG-focused)
1. Sliding Window (7 problems, 5 DONE)
2. Two Pointers (4 problems)
3. Binary Search (4 problems)
4. Trees (5 problems)
5. Graphs (4 problems)
6. Dynamic Programming (5 problems)
7. Backtracking (4 problems)
8. Heaps and Intervals (4 problems)

Total: 37 problems remaining, 5 completed, 40 total (after adding 2 remaining SW problems)

## User's Study Progress
- 5 Sliding Window problems completed (LC 438, 424, 904, 76, 992)
- All other categories are unpracticed
- User wanted the map to feel achievable and motivating, not overwhelming

## User Preferences
- Prefers focused, achievable scope over exhaustive coverage
- Wants FAANG-relevant problems only, not niche topics
- Appreciates encouraging tone in documentation
- Categories cut from v1: Linked Lists, Stack/Monotonic Stack, Tries, Bit Manipulation, Math/Geometry

## Mermaid Syntax Notes
- Mindmap indentation is 2 spaces per level
- Node text in mindmap cannot contain special chars like `()[]{}` unescaped
- Graph nodes use `["text"]` for labels with special chars
- Subgraph labels need `["text"]` quoting if they contain spaces
- Use `--` instead of `:` in mindmap node text (colons can cause parse issues)
