# Payments Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `/payments/buyer` and `/payments/seller` pages with reusable `Badge`, `PaymentCard`, and `NewPaymentModal` components matching the jarvis-smb.pen design, plus update Navbar and Dashboard.

**Architecture:** Seven sequential tasks, each a standalone file change. Reusable components (`Badge`, `PaymentCard`, `NewPaymentModal`) are created first so pages can import them. Navbar update adds Sign Out via Privy's `useLogout` hook and a `usePathname` check. All styling via MUI `sx` props — no new CSS files.

**Tech Stack:** Next.js 16, React 19, MUI v7, Privy (`useLogout`, `usePathname` from `next/navigation`), TypeScript

---

### Task 1: Create Badge component

**Files:**
- Create: `app/components/badge/index.tsx`

**Step 1: Create the directory and write the component**

```bash
mkdir -p app/components/badge
```

```tsx
// app/components/badge/index.tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface BadgeProps {
  label: string;
}

export default function Badge({ label }: BadgeProps) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "20px",
        backgroundColor: "#F5F5F5",
        border: "1px solid #EBEBEB",
        px: 1.5,
        py: "4px",
      }}
    >
      <Typography
        sx={{
          fontSize: "12px",
          color: "#555555",
          fontWeight: 500,
          fontFamily: "inherit",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
```

**Step 2: Verify build**

```bash
cd /Users/karthikramu/Desktop/jarvis-smb-arbitrum
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit**

```bash
git add app/components/badge/index.tsx
git commit -m "feat: add Badge component"
```

---

### Task 2: Create PaymentCard component

**Files:**
- Create: `app/components/payment-card/index.tsx`

**Step 1: Create the directory and write the component**

```bash
mkdir -p app/components/payment-card
```

```tsx
// app/components/payment-card/index.tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Badge from "@/app/components/badge";

interface PaymentCardProps {
  variant: "buyer" | "seller";
  company: string;
  terms: string;
  amount: string;
  badges: string[];
  // buyer only
  paid?: string;
  // seller only
  remaining?: string;
  onClaim?: () => void;
}

export default function PaymentCard({
  variant,
  company,
  terms,
  amount,
  badges,
  paid,
  remaining,
  onClaim,
}: PaymentCardProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #F0F0F0",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        px: 4,
        py: 3,
      }}
    >
      {/* Left column */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          sx={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {company}
        </Typography>
        <Typography
          sx={{ fontSize: "14px", color: "#777777", fontFamily: "inherit" }}
        >
          {terms}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {badges.map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </Box>
      </Box>

      {/* Right column */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: variant === "seller" ? 1.5 : 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {amount}
        </Typography>

        {variant === "buyer" && paid && (
          <Typography
            sx={{ fontSize: "13px", color: "#999999", fontFamily: "inherit" }}
          >
            {paid}
          </Typography>
        )}

        {variant === "seller" && (
          <>
            {remaining && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#999999",
                  fontFamily: "inherit",
                }}
              >
                {remaining}
              </Typography>
            )}
            <Button
              onClick={onClaim}
              sx={{
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "8px",
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
              }}
            >
              Claim
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit**

```bash
git add app/components/payment-card/index.tsx
git commit -m "feat: add PaymentCard component with buyer/seller variants"
```

---

### Task 3: Create NewPaymentModal component

**Files:**
- Create: `app/components/new-payment-modal/index.tsx`

**Step 1: Create the directory and write the component**

```bash
mkdir -p app/components/new-payment-modal
```

```tsx
// app/components/new-payment-modal/index.tsx
"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface NewPaymentModalProps {
  open: boolean;
  onClose: () => void;
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#F5F5F5",
    borderRadius: "10px",
    fontSize: "14px",
    "& fieldset": { border: "none" },
    "&:hover fieldset": { border: "none" },
    "&.Mui-focused fieldset": {
      border: "1px solid #E0E0E0",
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "13px",
    color: "#777777",
    fontWeight: 500,
  },
  "& .MuiInputLabel-shrink": {
    color: "#555555",
  },
};

export default function NewPaymentModal({ open, onClose }: NewPaymentModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
          border: "1px solid #F0F0F0",
          width: "480px",
          maxWidth: "480px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: "48px !important" }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "26px",
              letterSpacing: "-0.5px",
              color: "#000000",
              fontFamily: "inherit",
            }}
          >
            New payment
          </Typography>
          <Typography
            sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}
          >
            Set up a scheduled payment to a seller.
          </Typography>
        </Box>

        {/* Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Payment To"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Seller Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Total Amount (USD)"
            placeholder="$5,000"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Initial Payment (%)"
            placeholder="25"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="FedEx Tracking Number"
            placeholder="1234567890"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />

          <Button
            fullWidth
            sx={{
              mt: 1,
              backgroundColor: "#171717",
              color: "#FFFFFF",
              borderRadius: "10px",
              py: 1.75,
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
          >
            Create Payment
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/components/new-payment-modal/index.tsx
git commit -m "feat: add NewPaymentModal component"
```

---

### Task 4: Update Navbar — add Sign Out for /payments/* routes

**Files:**
- Modify: `app/components/navbar/index.tsx`

**Context:** The current Navbar shows "Login" or "Dashboard". On `/payments/*` routes, it should show "Sign Out" with a bottom border. Privy's `useLogout` hook provides a `logout()` function.

**Step 1: Replace the file contents**

```tsx
// app/components/navbar/index.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  const { login } = useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) {
        router.push("/dashboard");
      }
    },
  });

  const { logout } = useLogout({
    onSuccess: () => {
      router.push("/");
    },
  });

  const isPaymentsRoute = pathname?.startsWith("/payments");

  const handleAuthAction = () => {
    if (isPaymentsRoute && authenticated) {
      logout();
    } else if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  const buttonLabel = () => {
    if (isPaymentsRoute && authenticated) return "Sign Out";
    if (authenticated) return "Dashboard";
    return "Login";
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "#FFFFFF",
          borderBottom: isPaymentsRoute
            ? "1px solid #E0E0E0"
            : "none",
        }}
      >
        <Toolbar sx={{ px: 7, py: "20px", minHeight: "unset !important" }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              color: "#000000",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "-0.3px",
              fontFamily: "inherit",
            }}
          >
            Jarvis
          </Typography>
          <Button
            onClick={handleAuthAction}
            variant="outlined"
            sx={{
              color: "#000000",
              textTransform: "none",
              borderColor: "#E0E0E0",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
              fontWeight: 500,
              fontSize: "14px",
              px: 2.5,
              py: 1,
              "&:hover": {
                backgroundColor: "#F5F5F5",
                borderColor: "#CCCCCC",
              },
            }}
          >
            {buttonLabel()}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/components/navbar/index.tsx
git commit -m "feat: add Sign Out to Navbar on /payments/* routes"
```

---

### Task 5: Update Dashboard to redirect to /payments/buyer

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Replace the file**

```tsx
// app/dashboard/page.tsx
import { redirect } from "next/navigation";

export default function Dashboard() {
  redirect("/payments/buyer");
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: redirect /dashboard to /payments/buyer"
```

---

### Task 6: Create /payments/buyer page

**Files:**
- Create: `app/payments/buyer/page.tsx`

**Step 1: Create directory**

```bash
mkdir -p app/payments/buyer
```

**Step 2: Write the page**

```tsx
// app/payments/buyer/page.tsx
"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import PaymentCard from "@/app/components/payment-card";
import NewPaymentModal from "@/app/components/new-payment-modal";

const MOCK_PAYMENTS = [
  {
    id: "1",
    company: "Acme Inc.",
    terms: "25% at start, 75% on delivery",
    amount: "$5,000",
    badges: ["Initial Paid", "Awaiting Delivery"],
    paid: "$1,250 paid",
  },
];

export default function BuyerPaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          backgroundColor: "#FAFAFA",
          px: 7,
          py: 6,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Title row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: "#000000",
                fontFamily: "inherit",
              }}
            >
              Scheduled Payments
            </Typography>
            <Button
              onClick={() => setModalOpen(true)}
              sx={{
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "10px",
                px: 2.5,
                py: 1.25,
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
              }}
            >
              New Payment
            </Button>
          </Box>

          {/* Payment cards */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {MOCK_PAYMENTS.map((payment) => (
              <PaymentCard
                key={payment.id}
                variant="buyer"
                company={payment.company}
                terms={payment.terms}
                amount={payment.amount}
                badges={payment.badges}
                paid={payment.paid}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <NewPaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 4: Commit**

```bash
git add app/payments/buyer/page.tsx
git commit -m "feat: add /payments/buyer page"
```

---

### Task 7: Create /payments/seller page

**Files:**
- Create: `app/payments/seller/page.tsx`

**Step 1: Create directory**

```bash
mkdir -p app/payments/seller
```

**Step 2: Write the page**

```tsx
// app/payments/seller/page.tsx
"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PaymentCard from "@/app/components/payment-card";

const MOCK_PAYMENTS = [
  {
    id: "1",
    company: "From: Buyer Corp",
    terms: "25% paid upfront, 75% on delivery verification",
    amount: "$5,000",
    badges: ["Pending Claim"],
    remaining: "$3,750 remaining",
  },
];

export default function SellerPaymentsPage() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#FAFAFA",
        px: 7,
        py: 6,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Title row */}
        <Typography
          component="h1"
          sx={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          Incoming Payments
        </Typography>

        {/* Payment cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {MOCK_PAYMENTS.map((payment) => (
            <PaymentCard
              key={payment.id}
              variant="seller"
              company={payment.company}
              terms={payment.terms}
              amount={payment.amount}
              badges={payment.badges}
              remaining={payment.remaining}
              onClaim={() => {}}
            />
          ))}
        </Box>

        {/* Helper text */}
        <Typography
          sx={{
            fontSize: "13px",
            color: "#888888",
            lineHeight: 1.6,
            maxWidth: "500px",
            fontFamily: "inherit",
          }}
        >
          Clicking Claim will open a QR code. Scan it with your phone to verify
          delivery via FedEx tracking through Reclaim Protocol.
        </Typography>
      </Box>
    </Box>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Run dev server and visually verify both pages**

```bash
npm run dev
```

Check the following:
- Visit http://localhost:3000/payments/buyer — "Scheduled Payments" title, "New Payment" button, one Acme Inc. card with badges and "$1,250 paid"
- Click "New Payment" — modal opens with 5 input fields and "Create Payment" button
- Visit http://localhost:3000/payments/seller — "Incoming Payments" title, "Buyer Corp" card with "Pending Claim" badge, "Claim" button, helper text below
- On both pages, Navbar shows "Sign Out" with bottom border
- Visiting http://localhost:3000/dashboard redirects to /payments/buyer

**Step 5: Commit**

```bash
git add app/payments/seller/page.tsx
git commit -m "feat: add /payments/seller page"
```

---

## Done

All 7 tasks complete. New files:
- `app/components/badge/index.tsx`
- `app/components/payment-card/index.tsx`
- `app/components/new-payment-modal/index.tsx`
- `app/payments/buyer/page.tsx`
- `app/payments/seller/page.tsx`

Updated files:
- `app/components/navbar/index.tsx` — Sign Out on /payments/*
- `app/dashboard/page.tsx` — redirect to /payments/buyer
