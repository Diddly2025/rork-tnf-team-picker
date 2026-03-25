# Add Manual Kitty Adjustments & Opening Balance to Expenses

## Features

- **Add Adjustment button** alongside the existing "Add" expense button in the Expenses sub-tab
- **Adjustment Modal** with fields for description/note, amount, type toggle (Add to Kitty / Deduct from Kitty), and a date picker so historical adjustments can be backdated
- **Adjustments in Expenses List** — manual adjustments appear in the same list as regular expenses but are visually distinct:
  - Green card accent with a "+" for additions (e.g. "Rollover from 2024", "Pitch refund")
  - Red card accent with a "-" for deductions (e.g. "Bought new bibs")
  - Labelled as "Manual Adjustment" with the description, amount and date
- **Set Opening Balance** — a one-time option at the top of the Expenses tab to set an initial rollover amount, clearly labelled as "Opening Balance". Once set, it shows as a banner at the top. Can be edited or removed.
- **Updated Kitty Balance** — the overall kitty balance now factors in:
  - All player subs collected (credits)
  - Plus manual additions and opening balance
  - Minus manual deductions, regular expenses, and game costs
  - Total is always accurate across all sources

## Design

- The "Add Adjustment" button sits next to the existing "Add" expense button as a second pill-shaped button, using a slightly different colour (teal/blue) to distinguish it from the gold expense button
- The adjustment modal matches the existing expense modal style — slides up from the bottom with the same card styling
- The type toggle is a segmented control with "Add to Kitty" (green) and "Deduct from Kitty" (red)
- Opening Balance appears as a subtle banner card at the top of the expenses list when set, with an edit icon
- In the expenses list, adjustment cards have a coloured left strip (green for add, red for deduct) and a small "ADJUSTMENT" label badge to distinguish them from regular expenses
- The category breakdown chart only includes regular expenses, not adjustments
- Adjustments section in the summary shows total additions and total deductions separately

## Screens / Changes

- **Expenses Sub-Tab** — gains the "Add Adjustment" button, the opening balance banner, and mixed list of expenses + adjustments sorted by date
- **Add Adjustment Modal** — new modal with description, amount, add/deduct toggle, date field, and save button
- **Set Opening Balance Modal** — simple modal to enter an opening balance amount with a note
- **Kitty Balance Summary** (top of Finance screen) — updated calculation that includes adjustments and opening balance in the total
- **Data layer** — the Expense type is extended with an optional `adjustmentType` field ('addition' | 'deduction' | 'opening_balance') so adjustments are stored alongside expenses in the same data structure, keeping storage and sync simple