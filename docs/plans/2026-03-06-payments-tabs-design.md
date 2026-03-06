# Payments Tabs Feature Design

**Date**: 2026-03-06
**Status**: Approved

## Problem Statement

Currently, the seller payments page shows all payments under "Incoming Payments" regardless of their completion status. This makes it difficult to distinguish between active payments requiring action and completed historical payments. The buyer page has a similar issue with all payments shown together under "Scheduled Payments".

## Solution Overview

Add tabbed navigation to both buyer and seller payment pages to separate active payments from completed payments. Use Material-UI Tabs component with custom styling to match the existing design system.

## Architecture & Component Structure

### Pages Affected
- `/app/payments/seller/page.tsx` - Seller payments page
- `/app/payments/buyer/page.tsx` - Buyer payments page

### Tab Structure

**Seller Page:**
- Tab 1 (default): "Incoming" - Shows payments where `status !== 'completed'`
- Tab 2: "Completed" - Shows payments where `status === 'completed'`

**Buyer Page:**
- Tab 1 (default): "Scheduled" - Shows payments where `status !== 'completed'`
- Tab 2: "Completed" - Shows payments where `status === 'completed'`

### Component Placement
- Tabs positioned between page title and action buttons/payment cards
- Buyer page: Title → Tabs → Buttons (Contacts, New Payment) → Payment Cards
- Seller page: Title → Tabs → Payment Cards

## Visual Design

### MUI Tabs Styling

**Tabs Container:**
```typescript
{
  borderBottom: "2px solid #E0E0E0",
  minHeight: 48,
  marginBottom: 3
}
```

**Individual Tab:**
```typescript
{
  textTransform: "none",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: "inherit",
  color: "#999999",           // inactive state
  "&.Mui-selected": {
    color: "#171717"           // active state
  },
  minHeight: 48,
  paddingX: 0,
  marginRight: 4
}
```

**Tab Indicator (underline):**
```typescript
{
  backgroundColor: "#171717",
  height: 2
}
```

## State Management & Data Flow

### State Addition
```typescript
const [activeTab, setActiveTab] = useState(0);
```
- Value 0 = First tab (Incoming/Scheduled)
- Value 1 = Second tab (Completed)

### Filtering Logic
```typescript
const displayedPayments = payments.filter(p =>
  activeTab === 0
    ? p.status !== 'completed'
    : p.status === 'completed'
);
```

### Tab Change Handler
```typescript
const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  setActiveTab(newValue);
};
```

### Existing Logic Unchanged
- Payment fetching via `fetchPayments()` - no changes
- Contacts fetching on buyer page - no changes
- Claim payment flow on seller page - no changes
- Modal components - no changes

## Action Button Behavior

### Buyer Page
- "New Payment" and "Contacts" buttons remain visible regardless of active tab
- No changes to button functionality

### Seller Page
- "Claim" button already conditionally hidden for completed payments
- Existing logic (`isCompleted ? undefined : () => claimPayment(payment)`) continues to work
- When viewing Completed tab, claim buttons naturally don't appear

## Edge Cases & Behavior

### Real-time Updates
- When seller claims payment, `fetchPayments()` is called after success
- Payment status changes to 'completed' in database
- Payment automatically moves from Incoming to Completed tab
- User remains on current tab (claimed payment disappears from Incoming view if that's the active tab)
- Status banner on seller page continues to work unchanged

### Tab Persistence
- Tabs reset to default (first tab) on page navigation/refresh
- No localStorage or URL state needed

### Empty States

**First Tab (Incoming/Scheduled) Empty:**
- Buyer: "No payments yet. Create your first payment above."
- Seller: "No incoming payments yet."

**Second Tab (Completed) Empty:**
- Both pages: "No completed payments yet."

### Badge Display
- Completed payments show only ["Completed"] badge
- Active payments retain existing badge logic:
  - Buyer: "Initial Paid", "Awaiting Delivery", "Completed"
  - Seller: "Pending Claim", "Completed"

## No Changes Required To

- Payment card component (`/app/components/payment-card.tsx`)
- API routes (`/api/payments`)
- Database schema
- Type definitions (`/lib/types.ts`)
- Modal components (NewPaymentModal, ContactsModal)
- Claim payment hook (`useClaimPayment`)

## Implementation Notes

- Import MUI components: `import { Tabs, Tab } from "@mui/material";`
- Both pages receive identical treatment (same tab logic, just different labels)
- Filter payments array before mapping to PaymentCard components
- Empty state messages conditionally rendered based on filtered array length and active tab

## Success Criteria

1. Both buyer and seller pages have functional tabs
2. Tabs match existing design system (colors, typography, spacing)
3. Default view shows Incoming/Scheduled tab
4. Payments correctly filtered by completion status
5. Empty states display appropriate messages per tab
6. Completed payments don't show action buttons
7. Real-time updates (like claiming) work correctly with tabs
