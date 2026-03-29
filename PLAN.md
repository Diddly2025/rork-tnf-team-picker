# Fix Expenses & Kitty Adjustments Supabase Sync

## Problem
When expenses, kitty adjustments, or opening balances are created, they save locally but the Supabase sync is missing the required `user_id` and `group_id` columns — so the rows either fail silently or are incomplete in the cloud.

## What will be fixed

**1. Save to Supabase with all required fields**
- Update the sync function to include `user_id` and `group_id` when writing expenses to Supabase
- The active group ID will be passed from the app context
- A placeholder user ID will be derived from the project config (since there's no auth system in place)

**2. Immediate sync on creation**
- Add a new function that upserts a single expense row to Supabase right when it's created — no need to wait for a manual full sync
- Same for deleting an expense — it will be removed from Supabase immediately

**3. Restore from cloud includes all fields**
- Update the fetch/restore function to correctly map `user_id` and `group_id` back when loading expenses from Supabase
- Ensure adjustments (additions, deductions, opening balance) all restore correctly

**4. Full sync also updated**
- The existing full "Save to Cloud" and "Restore from Cloud" functions will use the updated logic with all required columns populated

## Files changed
- Sync utility — add `group_id` and `user_id` to expense rows, add single-expense upsert and delete functions
- App data context — pass `group_id` when syncing, call immediate upsert on expense creation and delete on removal
