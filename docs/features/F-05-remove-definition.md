# F-05: Remove Definition Storage

## Problem

Words are added by clicking on them while browsing (F-03), not by manual entry. The popup's word/definition input area is unused, and storing empty `definition` fields adds noise to the data model.

## Solution

Remove the manual word entry UI from the popup and drop the `definition` field from the data model. The popup becomes a read-only management view for promoting, demoting, and deleting words.

## Details

### Removed from Popup

- Word input field, definition input field, and Add button
- Definition display line in word list items

### Data Model Change

Before:
```json
{ "word": "ephemeral", "definition": "lasting a short time", "status": "learning" }
```

After:
```json
{ "word": "ephemeral", "status": "learning" }
```

Existing words with a `definition` field are unaffected — the field is simply ignored.

### What Remains

- Learning / Familiar tabs with counts
- Promote (learning → familiar), demote (familiar → learning), delete actions
- All content script interactions (click-to-add, promote, demote)

## Dependencies

- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — click-to-add is now the only way to add words
- [F-04: Learning State](F-04-learning-state.md) — popup tab structure unchanged
