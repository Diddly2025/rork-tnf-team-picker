# Load player photos from Supabase storage

**What changes**

- Player photos will be automatically loaded from your Supabase storage bucket (`player-photos`) using the player's name to build the URL
- The URL format will be: `{your-supabase-url}/storage/v1/object/public/player-photos/{Player Name}.jpeg`
- Photos will display everywhere player cards appear — squad list, matchday, teams, pitch view, etc.

**How it works**

- A helper function will be created that takes a player's name and returns the Supabase storage photo URL
- The `PlayerCard` component will automatically try to load the Supabase photo if no local photo is set on the player
- If a player has a locally picked photo (from the camera roll), that will take priority over the Supabase one
- If the Supabase image fails to load (e.g. no photo uploaded for that player), it will gracefully fall back to the default icon placeholder
- The `PitchView` component will also use Supabase photos for the formation display

**No data changes needed**

- No changes to how players are stored — the photo URL is computed on the fly from the player's name
- If you rename a player, just rename the file in Supabase to match