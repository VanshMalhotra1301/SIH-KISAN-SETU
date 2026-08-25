# KISAN SETU (किसान सेतु)
### AI-Powered Crop Procurement Intelligence Platform
**Government of India · Ministry of Consumer Affairs, Food & Public Distribution**  
*Smart India Hackathon 2026 — Problem Statement 26032*

> “From registration to procurement to payment — without the uncertainty.”

---

## 🌾 Overview

**KISAN SETU** is a Digital Public Infrastructure (DPI) platform designed to modernize agricultural procurement across India. By replacing uncoordinated physical mandi road queues with predictive arrival scheduling, electronic weighbridge integration, quality verification, and direct PFMS DBT transfers, Kisan Setu eliminates waiting bottlenecks and ensures 100% transparency for farmers and administrators.

---

## 🏛️ Platform Architecture & Stakeholder Portals

| Portal | Route | Primary Capabilities |
|---|---|---|
| **Farmer Companion** | `/farmer` | Smart centre recommendation, guaranteed slot booking, live virtual queue, electronic weighment slip, DBT payment tracking, grievance redressal desk, and multilingual AI Sahayak. |
| **Centre Operations** | `/centre` | Live yard queue table, electronic weighbridge scale recording, FAQ moisture inspection, digital invoice generation, and capacity alerts. |
| **District Control Tower** | `/control-tower` | District-wide centre radar, 42-minute early congestion prediction, dynamic appointment rebalancing, and throughput analytics. |
| **State Directorate Command** | `/admin` | State telemetry grid, central grievance triage desk, AI policy sentinel, inter-district performance scorecards, and DBT SLA audit logs. |

---

## 🤖 Kisan Setu AI Sahayak

The platform features an intelligent, conversational reasoning assistant capable of natural multi-turn dialogue in **Hindi, English, and Hinglish**:
- **Turn & Queue Inquiries**: *"मेरी बारी कब आएगी?"*, *"मेरे आगे कितने किसान हैं?"*
- **Centre & Congestion**: *"सबसे कम भीड़ वाला केंद्र कौन सा है?"*, *"वहाँ जाने में कितना समय लगेगा?"*
- **Slot Rescheduling**: Interactive proposed slots with one-tap `[Confirm]` / `[Cancel]` confirmation.
- **Weighbridge & Quality**: Real-time electronic gross/tare weights and moisture percentage reports.
- **PFMS DBT Payments**: Computed gross payouts and 48-hour credit countdown.
- **Voice App Navigation**: Direct voice navigation to Queue, Payments, Timeline, Grievance, or Profile views.

---

## 🛠️ Technology Stack

- **Frontend & Routing**: React 19, TypeScript, TanStack Start (SSR), TanStack Router, TanStack Query.
- **Styling**: Tailwind CSS v4 + OKLCH Design Tokens (Navy, Leaf Green, Wheat Saffron, Signal Cyan).
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS), Realtime WebSocket publications, and transactional stored procedures.
- **Speech Synthesis & Recognition**: Web Speech API with regional Indian English & Hindi voice prioritization.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Local Development

```bash
# Clone the repository
git clone https://github.com/VanshMalhotra1301/SIH-KISAN-SETU.git
cd kisan-setu-flow

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## 📄 License & Attribution

Developed for **Smart India Hackathon 2026**.  
Ministry of Consumer Affairs, Food & Public Distribution, Government of India.
