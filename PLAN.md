# Fix POTM saving/display and audit all stats for past results

## What's being fixed

**Bug 1: POTM not displaying on result cards**
- The history screen currently looks up POTM only from the active player roster — if anything is out of sync, it silently fails
- Fix: Also look up the POTM player from the match's own team data (which stores full player info), so it always finds the name and photo even if the roster changes
- Add the POTM player's circular photo avatar next to their name on the result card

**Bug 2: POTM not counting in stats**
- The stats screen builds its player list only from players found inside match team data, but the POTM count check uses `manOfMatchId` which must match the player's ID
- Fix: Ensure the POTM lookup is consistent — use the same player ID reference everywhere and add a fallback name from embedded match data

**Bug 3: Full stats audit for manually added results**
- Verify and fix that when a past result is saved:
  - All player IDs are stored correctly in `playerIds` (for appearances)
  - Team assignments are stored correctly (for win/loss/draw)
  - `manOfMatchId` is stored correctly (for POTM count)
  - Scores are stored correctly (for win ratio calculation)
- Add debug logging to the save flow so issues can be traced in the console

**Improvements**
- Make POTM name resolution resilient: check match team players first, then fall back to current roster
- Show POTM player photo on history result cards
- Add console logs at key save/load points for easier debugging
- Ensure stats tab correctly reflects all data from both live and manually added results
