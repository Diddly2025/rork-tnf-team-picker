# Fix expenses sync to match the working subs_payments pattern

**Problem**
The expenses sync code requires a logged-in user ID and a group ID, and filters/deletes by `group_id`. The working subs_payments sync uses a much simpler approach — it just deletes everything with `.neq('id', '')` and upserts rows without any `user_id` or `group_id` columns. This mismatch is why expenses fail to sync.

**What will change**

- **Sync function rewrite** — The expenses sync (bulk sync, single upsert, delete, and fetch) will be rewritten to match the exact same pattern as `subs_payments`:
  - Remove the `user_id` and `group_id` columns from all expense writes
  - Remove the auth user check — no more skipping sync if no authenticated user
  - Remove the `groupId` parameter from all expenses sync functions
  - Use `.neq('id', '')` for bulk delete (same as subs_payments) instead of `.eq('group_id', ...)`
  - Fetch all expenses with `.select('*').order('created_at', ...)` without group filtering

- **Update all callers** — Any screen or provider that calls the expenses sync functions will be updated to remove the `groupId` argument

- **No table structure changes needed in the app** — The `user_id` and `group_id` columns can stay in Supabase (nullable), they just won't be written to anymore. The app will stop sending those fields.

**Result**
Expenses, adjustments, and opening balances will sync to Supabase reliably using the same proven pattern as subs_payments.