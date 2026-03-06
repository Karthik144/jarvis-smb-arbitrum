# Privy Custom Signup Flow

## Overview

Custom multi-step signup modal integrating Privy email authentication with Supabase user storage.

## Flow

1. User fills company name, email, and selects buyer/seller type
2. Privy sends 6-digit OTP to email
3. User enters OTP code
4. Privy authenticates and creates embedded wallet
5. User data saved to Supabase users table
6. Redirect to /payments/buyer or /payments/seller

## Components

- `app/components/get-started-modal/index.tsx` - Main modal component
- `lib/api/users.ts` - User creation API
- `lib/database.types.ts` - TypeScript types

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_PRIVY_APP_ID` - From Privy dashboard
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Database Schema

Table: `users`
- `id` (uuid, primary key)
- `created_at` (timestamp)
- `company_name` (text)
- `email` (text, unique)
- `wallet_address` (text)
- `type` (text - 'buyer' or 'seller')
- `privy_user_id` (text)

## Error Handling

- Duplicate email: Shows error prompting to login
- Invalid OTP: Shows inline error with retry
- Network errors: Generic retry message
- Missing env vars: Console warning

## Future Enhancements

- Login flow for existing users
- Password recovery
- Additional user profile fields
