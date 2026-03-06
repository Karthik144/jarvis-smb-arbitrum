# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the landing page from the jarvis-smb.pen design as a Next.js React page with a restyled MUI navbar, hero section, and Get Started modal.

**Architecture:** Three focused file changes — update the existing Navbar to match the design, replace the placeholder page.tsx with the hero section, and create a new GetStartedModal component. All styling via MUI `sx` props to stay consistent with the existing MUI + Tailwind setup.

**Tech Stack:** Next.js 16, React 19, MUI v7, Privy, TypeScript

---

### Task 1: Add Inter font to layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Update layout.tsx to import and apply Inter font**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/navbar";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarvis SMB Arbitrum",
  description: "SMB Stablecoin Payment MVP with Reclaim Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body style={{ isolation: "isolate", margin: 0 }}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**Step 2: Verify it builds**

```bash
cd /Users/karthikramu/Desktop/jarvis-smb-arbitrum
npm run build
```

Expected: Build completes with no TypeScript errors.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Inter font via next/font/google"
```

---

### Task 2: Restyle the Navbar to match design

**Files:**
- Modify: `app/components/navbar/index.tsx`

**Context:** The existing Navbar uses MUI AppBar + Toolbar. The design shows: white background, no shadow, "Jarvis" logo (20px, 700, Inter, letterSpacing -0.3px) on the left, and a "Login"/"Dashboard" outlined button on the right (white fill, #E0E0E0 border, rounded, no text transform).

**Step 1: Replace the Navbar implementation**

```tsx
"use client";

import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { usePrivy, useLogin } from "@privy-io/react-auth";

export default function Navbar() {
  const router = useRouter();
  const { authenticated } = usePrivy();

  const { login } = useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) {
        router.push("/dashboard");
      }
    },
  });

  const handleAuthAction = () => {
    if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ backgroundColor: "#FFFFFF", borderBottom: "none" }}
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
            {authenticated ? "Dashboard" : "Login"}
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

Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add app/components/navbar/index.tsx
git commit -m "feat: restyle Navbar to match design system"
```

---

### Task 3: Create the GetStartedModal component

**Files:**
- Create: `app/components/get-started-modal/index.tsx`

**Context:** The modal (from JXLMx in the .pen file) is 480px wide, padding 48px, borderRadius 16px, subtle shadow. It has: header ("Get started" + "Tell us about your business."), three text inputs (Company Name, Email, Wallet Address), a Buyer/Seller role toggle, and a "Continue" full-width button. It's a UI shell — no form submission yet.

**Step 1: Create the component file**

```bash
mkdir -p app/components/get-started-modal
```

**Step 2: Write the component**

```tsx
"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: GetStartedModalProps) {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
          border: "1px solid #F0F0F0",
          width: "480px",
          maxWidth: "480px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: "48px !important" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "26px",
              letterSpacing: "-0.5px",
              color: "#000000",
              mb: 1,
              fontFamily: "inherit",
            }}
          >
            Get started
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}>
            Tell us about your business.
          </Typography>
        </Box>

        {/* Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Company Name"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Email"
            placeholder="you@company.com"
            type="email"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />

          {/* Role selector */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              sx={{ fontSize: "14px", fontWeight: 500, color: "#333333", fontFamily: "inherit" }}
            >
              I am a
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                fullWidth
                onClick={() => setRole("buyer")}
                sx={{
                  borderRadius: "10px",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  backgroundColor: role === "buyer" ? "#171717" : "#FFFFFF",
                  color: role === "buyer" ? "#FFFFFF" : "#000000",
                  border: role === "buyer" ? "none" : "1px solid #E0E0E0",
                  boxShadow: role === "buyer" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: role === "buyer" ? "#2a2a2a" : "#F5F5F5",
                  },
                }}
              >
                Buyer
              </Button>
              <Button
                fullWidth
                onClick={() => setRole("seller")}
                sx={{
                  borderRadius: "10px",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  backgroundColor: role === "seller" ? "#171717" : "#FFFFFF",
                  color: role === "seller" ? "#FFFFFF" : "#000000",
                  border: role === "seller" ? "none" : "1px solid #E0E0E0",
                  boxShadow: role === "seller" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: role === "seller" ? "#2a2a2a" : "#F5F5F5",
                  },
                }}
              >
                Seller
              </Button>
            </Box>
          </Box>

          {/* Continue button */}
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
            Continue
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: add GetStartedModal component"
```

---

### Task 4: Implement the Hero landing page

**Files:**
- Modify: `app/page.tsx`

**Context:** Replace the placeholder with the hero from the design. Full-screen (min-h-screen minus navbar), white background with radial gradient, centered column layout. "Get Started" button opens the GetStartedModal.

**Step 1: Replace app/page.tsx**

```tsx
"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import GetStartedModal from "./components/get-started-modal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 50% 60%, #F0F0F0 0%, #FFFFFF 100%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            textAlign: "center",
            px: 3,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "36px", md: "52px" },
              letterSpacing: "-1.5px",
              color: "#000000",
              maxWidth: "640px",
              lineHeight: 1.1,
              fontFamily: "inherit",
            }}
          >
            Programmable payments for your business
          </Typography>

          <Typography
            sx={{
              fontSize: "17px",
              color: "#555555",
              lineHeight: 1.7,
              maxWidth: "560px",
              fontFamily: "inherit",
            }}
          >
            Schedule, split, and verify payments with smart contracts and
            zero-knowledge proofs.
          </Typography>

          <Button
            onClick={() => setModalOpen(true)}
            sx={{
              mt: 1,
              backgroundColor: "#171717",
              color: "#FFFFFF",
              borderRadius: "10px",
              px: 3.5,
              py: 1.75,
              textTransform: "none",
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "-0.2px",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      <GetStartedModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Run dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000 and confirm:
- Clean white navbar with "Jarvis" logo and "Login" button
- Hero section centered with radial gradient background
- Title, subtitle, and "Get Started" button render correctly
- Clicking "Get Started" opens the modal
- Buyer/Seller toggle works (selected = black, unselected = white with border)
- Modal closes on backdrop click

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement landing page hero with Get Started modal"
```

---

## Done

All four tasks complete. The landing page should match the jarvis-smb.pen design with:
- Clean Inter-font navbar (MUI restyled)
- Full-screen hero with radial gradient
- Get Started modal with role toggle
