# Landing Page Design

**Date:** 2026-03-05
**Source:** jarvis-smb.pen — "Landing Page" frame (H0ulk) + "Get Started Modal" (JXLMx)

## Overview

Implement the landing page from the Figma/Pencil design as a Next.js React page. Styling approach: MUI (already installed) with overridden styles to match the design's clean minimal aesthetic.

## Components

### 1. Navbar — `app/components/navbar/index.tsx` (update)

- MUI AppBar: white background, no shadow, no border
- Toolbar padding: 56px horizontal, 20px vertical
- "Jarvis" logo: Inter, 20px, 700 weight, letterSpacing -0.3px, black
- Right-side button: "Login" (unauthenticated) or "Dashboard" (authenticated)
  - Style: outlined secondary — white fill, #E0E0E0 border, rounded 8px, textTransform none
  - "Login" triggers Privy login; "Dashboard" routes to /dashboard

### 2. Hero Section — `app/page.tsx` (replace)

- `"use client"` (needs useState for modal)
- Full-screen container: flexbox, column, vertically + horizontally centered
- Background: white + radial gradient overlay (`radial-gradient(120% 120% at 50% 60%, #F0F0F0 0%, transparent 100%)`)
- Content gap: 24px
  - Title: "Programmable payments for your business" — Inter 52px, 700, letterSpacing -1.5px, maxWidth 640px, centered, black
  - Subtitle: "Schedule, split, and verify payments with smart contracts and zero-knowledge proofs." — 17px, #555555, lineHeight 1.7, maxWidth 560px, centered
  - CTA Button: "Get Started" — black fill, white text, borderRadius 10px, padding 14px 28px — opens modal on click

### 3. Get Started Modal — `app/components/get-started-modal/index.tsx` (new)

Props: `{ open: boolean; onClose: () => void }`

MUI Dialog styled to match design:
- Paper: borderRadius 16px, boxShadow `0 4px 32px rgba(0,0,0,0.07)`, width 480px, padding 48px, no extra MUI padding
- Header:
  - "Get started" — Inter 26px, 700, letterSpacing -0.5px
  - "Tell us about your business." — 15px, #777777
- Three input fields (MUI TextField, variant="outlined" with custom sx):
  - Company Name (placeholder: "Acme Inc.")
  - Email (placeholder: "you@company.com")
  - Wallet Address (placeholder: "0x...")
  - Style: background #F5F5F5, borderRadius 10px, no border on resting state, full width
- Role toggle ("I am a" label + Buyer/Seller buttons):
  - Two full-width buttons side by side, gap 12px
  - Selected (Buyer default): fill #171717, white text, borderRadius 10px
  - Unselected: white fill, #E0E0E0 border, black text, borderRadius 10px
  - State managed locally with `useState<'buyer' | 'seller'>('buyer')`
- "Continue" button: full-width, black fill, white text, borderRadius 10px

Modal is a UI shell — no form submission wired up yet.

## File Changes

| File | Action |
|------|--------|
| `app/page.tsx` | Replace with hero + modal trigger |
| `app/components/navbar/index.tsx` | Update MUI styles to match design |
| `app/components/get-started-modal/index.tsx` | Create new modal component |

## Design Token Reference

| Token | Value |
|-------|-------|
| Primary button fill | #171717 |
| Secondary button border | #E0E0E0 |
| Input background | #F5F5F5 |
| Subtitle color | #555555 |
| Modal subtitle color | #777777 |
| Border radius (modal) | 16px |
| Border radius (inputs/buttons) | 10px |
| Font family | Inter |
| Hero title size | 52px |
| Hero title tracking | -1.5px |
