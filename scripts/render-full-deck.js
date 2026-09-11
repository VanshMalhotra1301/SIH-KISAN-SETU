import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outputDir = path.resolve('..', 'sih_slides');
const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function render(name, html, width = 1280, height = 720) {
  const tempFile = path.resolve(outputDir, `_tmp_${name}.html`);
  const outFile = path.resolve(outputDir, `${name}.png`);
  fs.writeFileSync(tempFile, html);
  execSync(`"${chromePath}" --headless --disable-gpu --window-size=${width},${height} --screenshot="${outFile}" "file:///${tempFile.replace(/\\/g, '/')}"`);
  fs.unlinkSync(tempFile);
  console.log(`✅ ${name}.png`);
}

// ═══════════════════════════════════════════════════
// SHARED: SIH Logo SVG + Styles
// ═══════════════════════════════════════════════════

const sihLogo = `
<div style="display:flex;align-items:center;gap:10px">
  <svg width="52" height="62" viewBox="0 0 100 120" fill="none">
    <line x1="50" y1="4" x2="50" y2="14" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="84" y1="18" x2="77" y2="25" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="96" y1="52" x2="87" y2="52" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="84" y1="86" x2="77" y2="79" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="16" y1="18" x2="23" y2="25" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="4" y1="52" x2="13" y2="52" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <line x1="16" y1="86" x2="23" y2="79" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 18C33 18,22 28,22 45C22 55,28 64,34 71C38 75,42 80,48 83Z" fill="#ea580c"/>
    <path d="M30 32H38V42H46" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M26 48H34V60H42" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="30" cy="32" r="3" fill="#fff"/><circle cx="46" cy="42" r="3" fill="#fff"/>
    <circle cx="26" cy="48" r="3" fill="#fff"/><circle cx="42" cy="60" r="3" fill="#fff"/>
    <path d="M52 18C67 18,78 28,78 45C78 55,72 64,66 71C62 75,58 80,52 83Z" fill="#16a34a"/>
    <text x="56" y="30" fill="#fff" font-family="monospace" font-size="8" font-weight="900">1011</text>
    <text x="54" y="40" fill="#fff" font-family="monospace" font-size="8" font-weight="900">01010</text>
    <text x="54" y="50" fill="#fff" font-family="monospace" font-size="8" font-weight="900">101010</text>
    <text x="54" y="60" fill="#fff" font-family="monospace" font-size="8" font-weight="900">010101</text>
    <text x="55" y="70" fill="#fff" font-family="monospace" font-size="8" font-weight="900">10101</text>
    <text x="58" y="79" fill="#fff" font-family="monospace" font-size="8" font-weight="900">010</text>
    <path d="M40 85H60L57 95H43Z" fill="#fff" stroke="#1e293b" stroke-width="3"/>
    <line x1="42" y1="89" x2="58" y2="89" stroke="#1e293b" stroke-width="2.5"/>
    <line x1="43" y1="93" x2="57" y2="93" stroke="#1e293b" stroke-width="2.5"/>
    <path d="M46 96H54L52 101H48Z" fill="#1e293b"/>
    <text x="50" y="115" fill="#1e293b" font-family="Inter,sans-serif" font-size="14" font-weight="900" text-anchor="middle">SIH</text>
  </svg>
  <div style="line-height:1.15">
    <div style="font-family:Inter,sans-serif;font-size:15px;font-weight:900;color:#1e3a8a">SMART INDIA</div>
    <div style="font-family:Inter,sans-serif;font-size:15px;font-weight:900;color:#1e3a8a">HACKATHON</div>
    <div style="font-family:Inter,sans-serif;font-size:15px;font-weight:900;color:#1e3a8a">2026</div>
  </div>
</div>`;

const baseHead = `<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:720px;overflow:hidden;background:#fff;font-family:'Inter',sans-serif;color:#1e293b}
.sw{width:1280px;height:720px;display:flex;flex-direction:column;justify-content:space-between;background:#fff}
.sh{padding:18px 36px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9}
.tb{padding:7px 22px;border:2px solid #8b5cf6;border-radius:9999px;font-weight:700;font-size:17px;color:#3b0764;background:#faf5ff}
.st{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;color:#0f172a;text-align:center}
.ss{padding:8px 40px 0;font-size:21px;font-weight:800;color:#1e3a8a;display:flex;align-items:center;gap:8px}
.sc{flex:1;padding:10px 40px 14px;display:flex;gap:20px}
.card{flex:1;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px 22px;box-shadow:0 3px 10px rgba(0,0,0,.03);display:flex;flex-direction:column;gap:12px}
.ch{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:800;color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:6px}
.cl{list-style:none;display:flex;flex-direction:column;gap:10px}
.cl li{font-size:14.5px;line-height:1.4;color:#334155;padding-left:20px;position:relative}
.cl li::before{content:"•";position:absolute;left:4px;top:-2px;font-size:20px;color:#16a34a;font-weight:bold}
.cl li strong{color:#0f172a;font-weight:700}
.sf{background:#0284c7;color:#fff;padding:9px 36px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600}
.sf .n{font-size:15px;font-weight:800}
.link{color:#0284c7;font-weight:600}
</style>`;

// ═══════════════════════════════════════════════════
// FLOWCHART 1: Farmer Journey (for Slide 2)
// ═══════════════════════════════════════════════════

const flowchart1Html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1100px;height:500px;overflow:hidden;background:#fff;font-family:'Inter',sans-serif}
.container{width:1100px;height:500px;padding:24px 30px;display:flex;flex-direction:column;gap:16px}
.title{font-size:20px;font-weight:900;color:#0f172a;text-align:center;letter-spacing:.3px}
.subtitle{font-size:13px;font-weight:600;color:#64748b;text-align:center;margin-top:-8px}
.flow{display:flex;align-items:flex-start;gap:0;justify-content:center;flex:1}
.step{display:flex;flex-direction:column;align-items:center;gap:6px;width:145px}
.icon-box{width:68px;height:68px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
.s1 .icon-box{background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b}
.s2 .icon-box{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border:2px solid #3b82f6}
.s3 .icon-box{background:linear-gradient(135deg,#dcfce7,#bbf7d0);border:2px solid #22c55e}
.s4 .icon-box{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:2px solid #ec4899}
.s5 .icon-box{background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border:2px solid #6366f1}
.s6 .icon-box{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #16a34a}
.step-label{font-size:13px;font-weight:800;color:#0f172a;text-align:center;line-height:1.2}
.step-desc{font-size:11px;font-weight:500;color:#64748b;text-align:center;line-height:1.3;max-width:140px}
.arrow{display:flex;align-items:center;margin-top:24px;color:#94a3b8;font-size:24px;font-weight:900}
.bottom-row{display:flex;justify-content:center;gap:40px;padding:6px 0}
.tag{padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px}
.tag.green{background:#f0fdf4;color:#15803d;border:1px solid #86efac}
.tag.blue{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd}
.tag.orange{background:#fffbeb;color:#b45309;border:1px solid #fcd34d}
</style></head><body>
<div class="container">
  <div class="title">🌾 Kisan Setu — End-to-End Farmer Journey Flow</div>
  <div class="subtitle">From registration to MSP payment — every step digitized, tracked & transparent</div>
  <div class="flow">
    <div class="step s1">
      <div class="icon-box">📋</div>
      <div class="step-label">1. Registration</div>
      <div class="step-desc">Aadhaar + PM-KISAN verified. Land records (Khasra/Girdawari) validated.</div>
    </div>
    <div class="arrow">→</div>
    <div class="step s2">
      <div class="icon-box">🤖</div>
      <div class="step-label">2. AI Centre Allocation</div>
      <div class="step-desc">Distance, queue load, capacity & processing speed analyzed to recommend best centre.</div>
    </div>
    <div class="arrow">→</div>
    <div class="step s3">
      <div class="icon-box">📅</div>
      <div class="step-label">3. Slot Booking</div>
      <div class="step-desc">Confidence-scored time slots. Farmer told exact departure time & arrival window.</div>
    </div>
    <div class="arrow">→</div>
    <div class="step s4">
      <div class="icon-box">🎫</div>
      <div class="step-label">4. Virtual Queue</div>
      <div class="step-desc">Live token (KS-3842). Position, ETA & counter assignment — all on phone in real-time.</div>
    </div>
    <div class="arrow">→</div>
    <div class="step s5">
      <div class="icon-box">⚖️</div>
      <div class="step-label">5. Weighment & QC</div>
      <div class="step-desc">Electronic gross/tare weight. FAQ moisture grading. Digital J-Form invoice generated.</div>
    </div>
    <div class="arrow">→</div>
    <div class="step s6">
      <div class="icon-box">💰</div>
      <div class="step-label">6. PFMS DBT Payment</div>
      <div class="step-desc">MSP payout computed instantly. 48-hr credit countdown. Direct bank transfer tracked.</div>
    </div>
  </div>
  <div class="bottom-row">
    <div class="tag green">🗣️ AI Sahayak Voice Assistant — Available at Every Step (Hindi / English / Hinglish)</div>
    <div class="tag blue">📡 Real-Time WebSocket — Live Queue & Payment Updates</div>
    <div class="tag orange">🔒 Aadhaar KYC + Immutable Audit Trail</div>
  </div>
</div>
</body></html>`;

render('flowchart1_farmer_journey', flowchart1Html, 1100, 500);

// ═══════════════════════════════════════════════════
// FLOWCHART 2: System Architecture (for Slide 3)
// ═══════════════════════════════════════════════════

const flowchart2Html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1100px;height:580px;overflow:hidden;background:#fff;font-family:'Inter',sans-serif}
.container{width:1100px;height:580px;padding:20px 24px;display:flex;flex-direction:column;gap:12px}
.title{font-size:19px;font-weight:900;color:#0f172a;text-align:center}
.arch{flex:1;display:flex;flex-direction:column;gap:10px}

.tier{display:flex;gap:12px;align-items:stretch}
.tier-label{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:11px;font-weight:800;letter-spacing:1px;padding:8px 6px;border-radius:8px;display:flex;align-items:center;justify-content:center;min-width:28px}
.tier-content{flex:1;display:flex;gap:10px}

.box{border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
.box-title{font-size:13px;font-weight:800;display:flex;align-items:center;gap:5px}
.box-desc{font-size:11px;font-weight:500;color:#475569;line-height:1.35}
.box-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}
.box-tag{font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.7)}

.t1-label{background:#fef3c7;color:#92400e}
.t1 .box{background:linear-gradient(135deg,#fffbeb,#fef9c3);border:1.5px solid #fcd34d}
.t1 .box-title{color:#92400e}

.t2-label{background:#dbeafe;color:#1e40af}
.t2 .box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1.5px solid #93c5fd}
.t2 .box-title{color:#1e40af}

.t3-label{background:#dcfce7;color:#166534}
.t3 .box{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac}
.t3 .box-title{color:#166534}

.t4-label{background:#ede9fe;color:#5b21b6}
.t4 .box{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd}
.t4 .box-title{color:#5b21b6}

.conn{display:flex;justify-content:center;align-items:center;gap:6px;padding:2px 0}
.conn-arrow{font-size:12px;color:#94a3b8;font-weight:800}
.conn-text{font-size:10px;font-weight:700;color:#64748b;background:#f8fafc;padding:2px 10px;border-radius:6px;border:1px solid #e2e8f0}
</style></head><body>
<div class="container">
  <div class="title">⚙️ Kisan Setu — 4-Tier System Architecture</div>

  <div class="arch">
    <!-- Tier 1: Presentation -->
    <div class="tier t1">
      <div class="tier-label t1-label">FRONTEND</div>
      <div class="tier-content">
        <div class="box">
          <div class="box-title">👨‍🌾 Farmer Companion</div>
          <div class="box-desc">Smart centre recommendation, slot booking, live queue token, timeline, payment tracker</div>
          <div class="box-tags"><span class="box-tag">Mobile-First PWA</span><span class="box-tag">Voice AI Sahayak</span></div>
        </div>
        <div class="box">
          <div class="box-title">🏭 Centre Operations</div>
          <div class="box-desc">Yard queue table, electronic weighbridge scale, FAQ grading, digital J-Form invoicing</div>
          <div class="box-tags"><span class="box-tag">Tablet Console</span><span class="box-tag">Real-Time Sync</span></div>
        </div>
        <div class="box">
          <div class="box-title">🗺️ District Control Tower</div>
          <div class="box-desc">Centre radar, 42-min congestion prediction, dynamic appointment rebalancing</div>
          <div class="box-tags"><span class="box-tag">Dashboard</span><span class="box-tag">AI Alerts</span></div>
        </div>
        <div class="box">
          <div class="box-title">🏛️ State Command</div>
          <div class="box-desc">Telemetry grid, grievance desk, policy sentinel, DBT SLA audit logs</div>
          <div class="box-tags"><span class="box-tag">Analytics</span><span class="box-tag">Scorecards</span></div>
        </div>
      </div>
    </div>

    <div class="conn">
      <span class="conn-arrow">↕</span>
      <span class="conn-text">React 19 + TanStack Start (SSR) + TypeScript + Tailwind CSS v4</span>
      <span class="conn-arrow">↕</span>
    </div>

    <!-- Tier 2: AI Layer -->
    <div class="tier t4">
      <div class="tier-label t4-label">AI LAYER</div>
      <div class="tier-content">
        <div class="box">
          <div class="box-title">🧠 Semantic NLP Engine</div>
          <div class="box-desc">Multi-intent decomposition, pronoun coreference, confidence routing (HIGH/MED/LOW)</div>
          <div class="box-tags"><span class="box-tag">18 Procurement Domains</span><span class="box-tag">Hindi + English + Hinglish</span></div>
        </div>
        <div class="box">
          <div class="box-title">🗣️ Voice Layer</div>
          <div class="box-desc">Web Speech API — STT + TTS with VAD (Voice Activity Detection) & regional voice selection</div>
          <div class="box-tags"><span class="box-tag">Speech Recognition</span><span class="box-tag">Speech Synthesis</span></div>
        </div>
        <div class="box">
          <div class="box-title">🔌 AI Provider</div>
          <div class="box-desc">Modular architecture — built-in semantic reasoner + pluggable Gemini/OpenAI enhancer</div>
          <div class="box-tags"><span class="box-tag">Gemini API</span><span class="box-tag">Fallback Reasoner</span></div>
        </div>
      </div>
    </div>

    <div class="conn">
      <span class="conn-arrow">↕</span>
      <span class="conn-text">Supabase Client SDK + Realtime WebSocket Subscriptions</span>
      <span class="conn-arrow">↕</span>
    </div>

    <!-- Tier 3: Backend -->
    <div class="tier t2">
      <div class="tier-label t2-label">BACKEND</div>
      <div class="tier-content">
        <div class="box">
          <div class="box-title">🗄️ Supabase PostgreSQL</div>
          <div class="box-desc">Profiles, Farmers, Centres, Queue, Slots, Payments, Grievances, Notifications</div>
          <div class="box-tags"><span class="box-tag">Row Level Security</span><span class="box-tag">Stored Procedures</span></div>
        </div>
        <div class="box">
          <div class="box-title">📡 Realtime Engine</div>
          <div class="box-desc">WebSocket push for queue tokens, weighment updates, payment status & capacity alerts</div>
          <div class="box-tags"><span class="box-tag">Zero Polling</span><span class="box-tag">Live Broadcasts</span></div>
        </div>
        <div class="box">
          <div class="box-title">🔐 Auth & Security</div>
          <div class="box-desc">Supabase Auth, Aadhaar KYC, role-based access (Farmer/Centre/District/State), audit trails</div>
          <div class="box-tags"><span class="box-tag">Zod Validation</span><span class="box-tag">RLS Policies</span></div>
        </div>
      </div>
    </div>

    <div class="conn">
      <span class="conn-arrow">↕</span>
      <span class="conn-text">Vercel Edge CDN + Vite SSR Build + Wrangler Workers</span>
      <span class="conn-arrow">↕</span>
    </div>

    <!-- Tier 4: Infrastructure -->
    <div class="tier t3">
      <div class="tier-label t3-label">INFRA</div>
      <div class="tier-content">
        <div class="box">
          <div class="box-title">☁️ Cloud Infrastructure</div>
          <div class="box-desc">Supabase Cloud + Vercel Edge Network — auto-scaling, global CDN, zero-ops</div>
        </div>
        <div class="box">
          <div class="box-title">🏛️ Government Data Sources</div>
          <div class="box-desc">PM-KISAN Database, CACP MSP Rates, State Land Records, PFMS DBT Gateway</div>
        </div>
        <div class="box">
          <div class="box-title">📱 Device Layer</div>
          <div class="box-desc">Farmer smartphones, Centre tablets, Electronic weighbridges, Officer desktops</div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

render('flowchart2_system_architecture', flowchart2Html, 1100, 580);

// ═══════════════════════════════════════════════════
// FLOWCHART 3: Before vs After (for Slide 2)
// ═══════════════════════════════════════════════════

const flowchart3Html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1100px;height:420px;overflow:hidden;background:#fff;font-family:'Inter',sans-serif}
.container{width:1100px;height:420px;padding:20px 28px;display:flex;flex-direction:column;gap:14px}
.title{font-size:19px;font-weight:900;color:#0f172a;text-align:center}
.cols{display:flex;gap:20px;flex:1}
.col{flex:1;border-radius:14px;padding:18px 22px;display:flex;flex-direction:column;gap:10px}
.col.before{background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fca5a5}
.col.after{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac}
.col-title{font-size:17px;font-weight:900;display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:2px solid rgba(0,0,0,.06)}
.col.before .col-title{color:#991b1b}
.col.after .col-title{color:#166534}
.col-list{list-style:none;display:flex;flex-direction:column;gap:8px}
.col-list li{font-size:13.5px;line-height:1.4;display:flex;align-items:flex-start;gap:8px}
.col.before .col-list li{color:#7f1d1d}
.col.after .col-list li{color:#14532d}
.col-list li .num{min-width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0}
.col.before .num{background:#fecaca;color:#991b1b}
.col.after .num{background:#bbf7d0;color:#166534}
.col-list li strong{font-weight:700}
.center-arrow{display:flex;align-items:center;justify-content:center;font-size:36px;color:#0284c7;font-weight:900;flex-shrink:0;width:50px}
</style></head><body>
<div class="container">
  <div class="title">🔄 The Paradigm Shift — Before vs With Kisan Setu</div>
  <div class="cols">
    <div class="col before">
      <div class="col-title">❌ Traditional Procurement</div>
      <ul class="col-list">
        <li><span class="num">1</span><span><strong>Blind Allotment:</strong> Same centre for everyone, no load balancing</span></li>
        <li><span class="num">2</span><span><strong>Physical Queue:</strong> No visibility — farmer waits 4-8 hours blindly</span></li>
        <li><span class="num">3</span><span><strong>Manual Weighment:</strong> Paper slips, prone to tampering & disputes</span></li>
        <li><span class="num">4</span><span><strong>Payment Opacity:</strong> Weeks of uncertainty — no tracking</span></li>
        <li><span class="num">5</span><span><strong>Reactive Admin:</strong> Officers discover congestion after it happens</span></li>
        <li><span class="num">6</span><span><strong>Language Barrier:</strong> English-only portals exclude rural farmers</span></li>
      </ul>
    </div>
    <div class="center-arrow">→</div>
    <div class="col after">
      <div class="col-title">✅ With Kisan Setu</div>
      <ul class="col-list">
        <li><span class="num">1</span><span><strong>AI Smart Allocation:</strong> Distance + queue + capacity optimized per farmer</span></li>
        <li><span class="num">2</span><span><strong>Live Virtual Queue:</strong> Token, position, ETA & counter — all on phone</span></li>
        <li><span class="num">3</span><span><strong>Digital Weighment:</strong> Electronic gross/tare + auto quality grading + J-Form</span></li>
        <li><span class="num">4</span><span><strong>48-Hr DBT Tracker:</strong> Real-time PFMS payment countdown visible</span></li>
        <li><span class="num">5</span><span><strong>Predictive Admin:</strong> 42-min early congestion forecasting + auto rebalance</span></li>
        <li><span class="num">6</span><span><strong>Voice AI Sahayak:</strong> Hindi/Hinglish companion — zero literacy barrier</span></li>
      </ul>
    </div>
  </div>
</div>
</body></html>`;

render('flowchart3_before_after', flowchart3Html, 1100, 420);


// ═══════════════════════════════════════════════════
// SLIDE 1: TITLE PAGE
// ═══════════════════════════════════════════════════

render('slide1_title', `<!DOCTYPE html><html><head>${baseHead}</head><body>
<div class="sw">
  <div class="sh">
    <div></div>
    <div style="font-family:'Playfair Display',serif;font-size:30px;font-weight:800;color:#0f172a;letter-spacing:1px">SMART INDIA HACKATHON 2026</div>
    ${sihLogo}
  </div>
  <div style="text-align:center;font-family:'Playfair Display',serif;font-size:28px;font-weight:800;color:#0f172a;margin-top:4px">TITLE PAGE</div>
  <div class="sc" style="align-items:center;justify-content:space-between;padding:10px 60px 16px">
    <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:24px 32px;box-shadow:0 4px 14px rgba(0,0,0,.03);width:700px">
      <ul style="list-style:none;display:flex;flex-direction:column;gap:18px">
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• Problem Statement ID –</strong><span style="color:#0369a1;font-weight:700">26032</span></li>
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• Problem Statement Title –</strong><span style="color:#0369a1;font-weight:700">AI-Powered Crop Procurement Platform</span></li>
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• Theme –</strong><span style="color:#0369a1;font-weight:700">Smart Automation / Agriculture</span></li>
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• PS Category –</strong><span style="color:#0369a1;font-weight:700">Software</span></li>
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• Team ID –</strong><span style="color:#0369a1;font-weight:700">(Your Team ID)</span></li>
        <li style="font-size:19px;color:#334155;display:flex;gap:10px"><strong style="color:#0f172a;font-weight:800;min-width:260px">• Team Name –</strong><span style="color:#0369a1;font-weight:700">Team AgriSetu</span></li>
      </ul>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:340px">
      <svg width="120" height="120" viewBox="0 0 100 120" fill="none">
        <line x1="50" y1="4" x2="50" y2="14" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <line x1="84" y1="18" x2="77" y2="25" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <line x1="96" y1="52" x2="87" y2="52" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <line x1="16" y1="18" x2="23" y2="25" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <line x1="4" y1="52" x2="13" y2="52" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M48 18C33 18,22 28,22 45C22 55,28 64,34 71C38 75,42 80,48 83Z" fill="#ea580c"/>
        <path d="M52 18C67 18,78 28,78 45C78 55,72 64,66 71C62 75,58 80,52 83Z" fill="#16a34a"/>
        <path d="M40 85H60L57 95H43Z" fill="#fff" stroke="#1e293b" stroke-width="3"/>
        <line x1="42" y1="89" x2="58" y2="89" stroke="#1e293b" stroke-width="2.5"/>
        <path d="M46 96H54L52 101H48Z" fill="#1e293b"/>
        <text x="50" y="115" fill="#1e293b" font-family="Inter" font-size="14" font-weight="900" text-anchor="middle">SIH</text>
      </svg>
      <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:800;color:#0f172a">KISAN SETU</div>
      <div style="font-size:14px;font-weight:700;color:#16a34a">(किसान सेतु)</div>
      <div style="font-size:11px;font-weight:600;color:#64748b;text-align:center;margin-top:4px">AI-Powered Crop Procurement<br/>Intelligence Platform</div>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">1</div></div>
</div></body></html>`);


// ═══════════════════════════════════════════════════
// SLIDE 2: IDEA / APPROACH
// ═══════════════════════════════════════════════════

render('slide2_idea', `<!DOCTYPE html><html><head>${baseHead}</head><body>
<div class="sw">
  <div class="sh">
    <div class="tb">Team AgriSetu</div>
    <div class="st">IDEA / APPROACH</div>
    ${sihLogo}
  </div>
  <div class="ss"><span style="color:#2563eb">❖</span> Proposed Solution — KISAN SETU (किसान सेतु)</div>
  <div class="sc" style="flex-direction:column;gap:10px">
    <div style="display:flex;gap:16px">
      <div class="card" style="flex:1">
        <div class="ch"><span style="color:#dc2626">⚠️</span> Problem (Current Pain Points)</div>
        <ul class="cl">
          <li><strong>4-8 hr Mandi Wait:</strong> Farmers queue blindly with zero visibility on position or ETA</li>
          <li><strong>No Smart Allocation:</strong> Everyone crowds the nearest centre — no load balancing</li>
          <li><strong>Payment Uncertainty:</strong> Weeks of waiting post-weighment; no MSP tracking</li>
          <li><strong>Reactive Admin:</strong> Officers discover congestion only after it paralyses operations</li>
        </ul>
      </div>
      <div class="card" style="flex:1">
        <div class="ch"><span style="color:#16a34a">✅</span> Our Solution (6-Step Digital Journey)</div>
        <ul class="cl">
          <li><strong>AI Centre Allocation:</strong> Distance + queue + capacity analyzed per farmer</li>
          <li><strong>Guaranteed Slot:</strong> Confidence-scored time windows — exact departure time given</li>
          <li><strong>Live Virtual Queue:</strong> Token, position, ETA & counter on phone in real-time</li>
          <li><strong>48-Hr DBT Tracker:</strong> MSP payout computed instantly; real-time bank credit countdown</li>
        </ul>
      </div>
    </div>
    <div style="display:flex;gap:16px">
      <div class="card" style="flex:1">
        <div class="ch"><span style="color:#f59e0b">🗣️</span> Innovation — AI Sahayak Voice Companion</div>
        <ul class="cl">
          <li><strong>Multilingual NLP:</strong> Hindi, English, Hinglish — multi-turn memory with pronoun resolution</li>
          <li><strong>18 Knowledge Domains:</strong> MSP rates, quality rules, J-Forms, late arrival policy, and more</li>
        </ul>
      </div>
      <div class="card" style="flex:1">
        <div class="ch"><span style="color:#6366f1">🏛️</span> 4-Tier Governance Architecture</div>
        <ul class="cl">
          <li><strong>Unified Platform:</strong> Farmer App → Centre Ops → District Control Tower → State Command</li>
          <li><strong>Predictive Intelligence:</strong> 42-min early congestion forecast + auto slot rebalancing</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">2</div></div>
</div></body></html>`);


// ═══════════════════════════════════════════════════
// SLIDE 3: TECHNICAL APPROACH
// ═══════════════════════════════════════════════════

render('slide3_technical', `<!DOCTYPE html><html><head>${baseHead}</head><body>
<div class="sw">
  <div class="sh">
    <div class="tb">Team AgriSetu</div>
    <div class="st">TECHNICAL APPROACH</div>
    ${sihLogo}
  </div>
  <div class="ss"><span style="color:#2563eb">❖</span> Technology Stack & Implementation Architecture</div>
  <div class="sc">
    <div class="card">
      <div class="ch"><span style="color:#3b82f6">⚙️</span> Technology Stack</div>
      <ul class="cl">
        <li><strong>Frontend:</strong> React 19, TypeScript, TanStack Start (SSR), TanStack Router + Query</li>
        <li><strong>Styling:</strong> Tailwind CSS v4, OKLCH Design Tokens, Radix UI, Recharts, Lucide Icons</li>
        <li><strong>Backend & DB:</strong> Supabase PostgreSQL, Row Level Security (RLS), Realtime WebSockets</li>
        <li><strong>AI Engine:</strong> Custom Semantic NLP (18 domains) + Pluggable Gemini AI Provider</li>
        <li><strong>Voice:</strong> Web Speech API — STT + TTS, VAD, regional Hindi/English voice selection</li>
        <li><strong>Deploy:</strong> Vercel Edge CDN + Vite SSR + Wrangler Workers</li>
      </ul>
    </div>
    <div class="card">
      <div class="ch"><span style="color:#16a34a">🔧</span> Key Implementation Highlights</div>
      <ul class="cl">
        <li><strong>Semantic NLP Engine (1,150+ lines):</strong> Multi-intent decomposition, pronoun coreference, confidence routing</li>
        <li><strong>42-Min Congestion Predictor:</strong> Per-centre hourly processing rate + queue depth + arrival forecast</li>
        <li><strong>Real-Time WebSocket Sync:</strong> Queue positions, weighment updates & payment status pushed live — zero polling</li>
        <li><strong>Row Level Security:</strong> Data partitioned by role & district — farmer sees only their data</li>
        <li><strong>Voice Activity Detection:</strong> Silence-based turn completion + manual done trigger for natural interaction</li>
        <li><strong>Modular AI Provider:</strong> Built-in reasoner works fully offline; Gemini pluggable as enhancer</li>
      </ul>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">3</div></div>
</div></body></html>`);


// ═══════════════════════════════════════════════════
// SLIDE 4: FEASIBILITY AND VIABILITY
// ═══════════════════════════════════════════════════

render('slide4_feasibility', `<!DOCTYPE html><html><head>${baseHead}</head><body>
<div class="sw">
  <div class="sh">
    <div class="tb">Team AgriSetu</div>
    <div class="st">FEASIBILITY AND VIABILITY</div>
    ${sihLogo}
  </div>
  <div class="ss"><span style="color:#2563eb">❖</span> Comprehensive Feasibility Analysis & Risk Mitigation</div>
  <div class="sc">
    <div class="card">
      <div class="ch"><span style="color:#16a34a">✅</span> Multidimensional Feasibility</div>
      <ul class="cl">
        <li><strong>Technical Viability:</strong> Built on open-source, production-grade stack (React 19, Supabase); zero proprietary hardware needed</li>
        <li><strong>Data Integration:</strong> Directly utilizes PM-KISAN database, Aadhaar KYC, State Land Records & CACP MSP rates</li>
        <li><strong>Zero-Bar Adoption:</strong> Multilingual AI Sahayak (Hindi/Hinglish voice) eliminates digital literacy barriers</li>
        <li><strong>Infrastructure Cost:</strong> Cloud-native; mandis need only existing weighbridges & standard smartphones</li>
        <li><strong>Working Prototype:</strong> Fully functional prototype deployed on Vercel with live Supabase backend</li>
      </ul>
    </div>
    <div class="card">
      <div class="ch"><span style="color:#0284c7">🛡️</span> Challenges & Mitigation Strategies</div>
      <ul class="cl">
        <li><strong>Rural Network Latency:</strong> PWA offline queue caching + automated SMS slot confirmation fallbacks</li>
        <li><strong>Operator Workflow Friction:</strong> Intuitive Centre Console reduces 60% paperwork with 1-click digital J-Form invoices</li>
        <li><strong>Weighment Tampering Risk:</strong> Direct digital gross/tare capture with automated immutable audit logging</li>
        <li><strong>Scale to 7,000+ Mandis:</strong> Supabase RLS district partitioning + Vercel Edge CDN for horizontal scaling</li>
        <li><strong>Regional Language Diversity:</strong> Modular AI Provider architecture — adding Punjabi/Marathi/Telugu requires minimal code</li>
      </ul>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">4</div></div>
</div></body></html>`);


// ═══════════════════════════════════════════════════
// SLIDE 5: IMPACT AND BENEFITS
// ═══════════════════════════════════════════════════

render('slide5_impact', `<!DOCTYPE html><html><head>${baseHead}
<style>
.mg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:6px}
.mb{border-radius:10px;padding:10px 12px;text-align:center}
.mb.g{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac}
.mb.b{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #bae6fd}
.mv{font-size:24px;font-weight:900}
.mb.g .mv{color:#15803d}
.mb.b .mv{color:#0284c7}
.ml{font-size:12px;font-weight:700;margin-top:2px}
.mb.g .ml{color:#166534}
.mb.b .ml{color:#0369a1}
</style></head><body>
<div class="sw">
  <div class="sh">
    <div class="tb">Team AgriSetu</div>
    <div class="st">IMPACT AND BENEFITS</div>
    ${sihLogo}
  </div>
  <div class="ss"><span style="color:#2563eb">❖</span> Measurable Outcomes & Multi-Sectoral Transformation</div>
  <div class="sc" style="flex-direction:column;gap:10px">
    <div class="mg">
      <div class="mb g"><div class="mv">↓ 85%</div><div class="ml">Mandi Wait Time (4-8h → <40m)</div></div>
      <div class="mb g"><div class="mv">↓ 88%</div><div class="ml">Distress Drop-offs (<3%)</div></div>
      <div class="mb b"><div class="mv">100%</div><div class="ml">DBT Payment Visibility (48h)</div></div>
      <div class="mb b"><div class="mv">↑ 70%</div><div class="ml">Centre Capacity Utilization</div></div>
    </div>
    <div style="display:flex;gap:16px;flex:1">
      <div class="card">
        <div class="ch"><span style="color:#f59e0b">🌾</span> Social & Economic Impact</div>
        <ul class="cl">
          <li><strong>Eliminates Overnight Queues:</strong> Removes hardship of farmers sleeping on mandi roads</li>
          <li><strong>Direct Travel Savings:</strong> Smart allocation saves ₹200-500 per trip in wasted fuel</li>
          <li><strong>Zero Exclusion Voice AI:</strong> Multilingual assistant — full accessibility for illiterate farmers</li>
          <li><strong>Predictable Income:</strong> Transparent 48-hr MSP DBT prevents exploitative distress selling</li>
        </ul>
      </div>
      <div class="card">
        <div class="ch"><span style="color:#0284c7">🏛️</span> Governance & Environmental Value</div>
        <ul class="cl">
          <li><strong>Proactive Administration:</strong> District radar auto-detects bottlenecks 42 mins prior</li>
          <li><strong>100% Audit Transparency:</strong> Live DBT SLA compliance logs prevent ghost procurement</li>
          <li><strong>Lower Emissions:</strong> 30-40% fewer trips significantly reduces rural carbon footprint</li>
          <li><strong>Data-Driven Policy:</strong> Real-time telemetry enables precision buffer stock planning</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">5</div></div>
</div></body></html>`);


// ═══════════════════════════════════════════════════
// SLIDE 6: RESEARCH AND REFERENCES
// ═══════════════════════════════════════════════════

render('slide6_references', `<!DOCTYPE html><html><head>${baseHead}</head><body>
<div class="sw">
  <div class="sh">
    <div class="tb">Team AgriSetu</div>
    <div class="st">RESEARCH AND REFERENCES</div>
    ${sihLogo}
  </div>
  <div class="ss"><span style="color:#2563eb">❖</span> Details & Links of Reference Works and Benchmarks</div>
  <div class="sc">
    <div class="card">
      <div class="ch"><span style="color:#f59e0b">🏛️</span> Government Frameworks & Portals</div>
      <ul class="cl">
        <li><strong>Ministry of Consumer Affairs, Food & Public Distribution:</strong> MSP Procurement Guidelines (2025-26) — <span class="link">dfpd.gov.in</span></li>
        <li><strong>CACP:</strong> Official MSP notifications — Wheat ₹2,430, Paddy ₹2,300, Mustard ₹5,650 per qtl — <span class="link">cacp.dacnet.nic.in</span></li>
        <li><strong>PFMS & PM-KISAN:</strong> DBT infrastructure & Aadhaar verification — <span class="link">pfms.nic.in</span> | <span class="link">pmkisan.gov.in</span></li>
        <li><strong>e-NAM:</strong> Reference architecture for digital mandi integration — <span class="link">enam.gov.in</span></li>
        <li><strong>Digital India Programme:</strong> DPI guidelines for citizen-centric service delivery — <span class="link">digitalindia.gov.in</span></li>
      </ul>
    </div>
    <div class="card">
      <div class="ch"><span style="color:#0284c7">📚</span> Technical Standards & Research Studies</div>
      <ul class="cl">
        <li><strong>NITI Aayog (2024):</strong> Report on "Digitizing Agricultural Supply Chains & Eliminating Mandi Congestion"</li>
        <li><strong>W3C Web Speech API:</strong> Multilingual speech synthesis and voice activity detection standards</li>
        <li><strong>India Stack / DPI:</strong> Architectural principles for Aadhaar, UPI & citizen-scale public infrastructure</li>
        <li><strong>NABARD & FAO:</strong> Studies on economic losses from agricultural queue delays in South Asia</li>
        <li><strong>Supabase & TanStack:</strong> Production database + SSR framework documentation — <span class="link">supabase.com</span> | <span class="link">tanstack.com</span></li>
      </ul>
    </div>
  </div>
  <div class="sf"><div></div><div>@SIH Idea submission- Template</div><div class="n">6</div></div>
</div></body></html>`);


console.log('\n🎉 All slides and flowcharts generated successfully!');
console.log(`📂 Output: ${outputDir}`);
