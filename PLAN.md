# Sync player photos to Supabase Storage


**What this changes**

Currently, player photos are stored as local file paths on your phone, meaning only you can see them. This update will upload photos to Supabase cloud storage so that anyone who syncs from the database can see all player photos.

**How it will work**

- When you add or edit a player photo, the image will be automatically uploaded to Supabase Storage in the cloud
- The app will store the cloud URL instead of the local file path
- When other users sync/restore from the database, they'll see all player photos
- Existing local photos will be uploaded to the cloud the next time you edit that player or trigger a full sync
- A small upload indicator will show while the photo is being uploaded
- Photos are compressed before upload to keep things fast
- If cloud sync is turned off, photos will still work locally as they do now

**One-time migration**

- A background process will detect any players with local-only photos and upload them to Supabase Storage automatically when cloud sync is enabled
- This happens once and converts all existing local photos to cloud URLs

**Technical requirement**

- You'll need a **Storage bucket** called `player-photos` in your Supabase project with **public access** enabled. This is where all the photos will be stored.
