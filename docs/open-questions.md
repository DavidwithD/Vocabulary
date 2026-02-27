# Open Questions

Unresolved items, ideas, and things to investigate. Move items out of here once they become a feature spec or a decision.

## Questions

- [ ] Should clicking a highlighted word show its definition (tooltip/popup)?
- [x] Should there be an on/off toggle for highlighting?
  - **Resolved in F-08:** Highlight toggle added to popup
- [ ] Export/import word list?
- [ ] Highlight color customization?
- [x] Should "seen" state (clicked → blue) persist across page loads?
  - **Resolved in F-04:** Replaced by three-state lifecycle (unfamiliar → learning → familiar) which persists via `chrome.storage.local`
- [ ] Additional languages beyond English and French? (German, Spanish, etc.)
- [ ] Improve French lemmatizer coverage — expand irregular verb table or integrate a dictionary-based lookup
- [ ] Auto-detect page language instead of requiring manual switching?

<!-- Add new questions here -->
