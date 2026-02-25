# F-02: Contraction Support

## Problem

Words often appear as contractions on web pages:

| Contraction | Base word |
|---|---|
| haven't | have |
| don't | do |
| let's | let |
| won't | will |
| isn't, aren't, wasn't, weren't | be |
| I'm, you're, they're | be |
| he's, she's, it's | be / have |
| I've, you've, they've | have |
| I'd, you'd, he'd | have / would |
| I'll, you'll, they'll | will |
| can't | can |
| shouldn't, wouldn't, couldn't | should, would, could |

The `\b` word boundary in regex breaks on apostrophes, so these won't match with naive approaches.

## Solution

compromise.js parses contractions natively. It expands "haven't" into its constituent parts and can identify the base verbs.

This feature comes "for free" with F-01's adoption of compromise.js.

## Details

- compromise.js splits contractions during tokenization
- Each part is lemmatized independently
- Example: "haven't" → tokens "have" + "not" → "have" matches if in word list
- The entire contraction span should be highlighted, not just the matching part

## Dependencies

- [F-01: Word Form Highlighting](F-01-word-highlighting.md)
- [ADR-001: Use compromise.js](../decisions/001-compromise-js.md)
