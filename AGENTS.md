# KISAN SETU — AGENT GUIDELINES

## Project Overview
Kisan Setu is an AI-powered agricultural procurement platform connecting:
1. **Farmers** (`/farmer`): Smart centre allocation, guaranteed slot booking, virtual queue token, timeline, PFMS DBT payment tracking, and AI Sahayak companion.
2. **Centre Operators** (`/centre`): Real-time queue processing, electronic weighbridge integration, FAQ moisture quality grading, digital invoices, and yard capacity management.
3. **District Admins** (`/control-tower`): Live district radar, AI congestion predictions, quota rebalancing, and operational throughput monitoring.
4. **State / Super Admins** (`/admin`): State directorate command tower, grievance redressal desk, policy sentinel, and DBT SLA audits.

## Architecture
- **Framework**: TanStack Start (SSR) + TanStack Router + Vite + React 19 + Tailwind CSS.
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS), Realtime subscriptions, and stored procedures.
- **Styling**: OKLCH color design system, mobile-first responsive layout, and Government of India public-service aesthetic.
