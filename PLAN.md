# Fix rating badge being clipped by player photo

**What's changing:**

The rating badge (the small coloured pill showing the player's rating number) is currently hidden/cut off because it sits inside the circular photo area which clips anything outside its bounds.

**Fix details:**

- Move the rating badge **outside** the photo circle container, positioning it at the **bottom-centre** of the avatar
- The badge will slightly overlap the bottom edge of the photo, sitting like a label beneath it
- Remove the clipping (`overflow: hidden`) from the card and photo container so nothing gets cut off
- The badge keeps its current colour and bold text style — just repositioned

**Where this applies:**

- The shared player card component used everywhere in the app — squad list, team generation, matchday modal, and any other screen showing player cards
