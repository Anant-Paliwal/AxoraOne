# Settings → Billing Navigation Update

## What Changed

The "Billing & Plans" option in Settings now **navigates directly to the Subscription page** instead of showing content within the Settings tab.

## Implementation

### Changes Made:

1. **Removed billing from tab sections** - No longer part of the `activeSection` state
2. **Added navigation handler** - `handleSectionClick()` function that:
   - Navigates to `/subscription` when "Billing & Plans" is clicked
   - Sets active section for all other tabs
3. **Updated sidebar buttons** - Both mobile and desktop now use the navigation handler
4. **Removed billing tab content** - The inline billing section is completely removed

### User Experience:

**Before:**
- Click "Billing & Plans" → Shows basic plan info in Settings
- Click "Upgrade Plan" button → Navigate to subscription page

**After:**
- Click "Billing & Plans" → **Instantly navigate to full subscription page**
- User sees complete plan comparison, usage metrics, and upgrade options

## Benefits

✅ **Cleaner Settings page** - No duplicate content  
✅ **Better UX** - Direct access to full subscription features  
✅ **Consistent navigation** - Billing is a major feature, deserves its own page  
✅ **Mobile-friendly** - Works on both mobile and desktop layouts

## Files Modified

- `src/pages/SettingsPage.tsx` - Removed billing tab, added navigation handler

## Testing

Click "Billing & Plans" in Settings (both mobile and desktop) and verify:
- Navigates to `/subscription` page
- Shows full subscription page with plans, usage, and upgrade options
- Back button returns to previous page
