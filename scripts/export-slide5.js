import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const sihLogoSvg = `
<div style="display: flex; align-items: center; gap: 12px;">
  <div style="width: 58px; height: 68px;">
    <svg width="58" height="68" viewBox="0 0 100 120" fill="none">
      <!-- Radiating rays -->
      <line x1="50" y1="4" x2="50" y2="14" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="86" y1="18" x2="78" y2="26" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="100" y1="52" x2="90" y2="52" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="86" y1="86" x2="78" y2="78" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="14" y1="18" x2="22" y2="26" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="0" y1="52" x2="10" y2="52" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="14" y1="86" x2="22" y2="78" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      
      <!-- Left Brain (Orange Circuit) -->
      <g>
        <path d="M48 18 C33 18, 22 28, 22 45 C22 55, 28 64, 34 71 C38 75, 42 80, 48 83 Z" fill="#ea580c"/>
        <path d="M30 32 H38 V42 H46" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M26 48 H34 V60 H42" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="30" cy="32" r="3" fill="#ffffff"/>
        <circle cx="46" cy="42" r="3" fill="#ffffff"/>
        <circle cx="26" cy="48" r="3" fill="#ffffff"/>
        <circle cx="42" cy="60" r="3" fill="#ffffff"/>
      </g>
      
      <!-- Right Brain (Green Binary) -->
      <g>
        <path d="M52 18 C67 18, 78 28, 78 45 C78 55, 72 64, 66 71 C62 75, 58 80, 52 83 Z" fill="#16a34a"/>
        <text x="56" y="30" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">1011</text>
        <text x="54" y="40" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">01010</text>
        <text x="54" y="50" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">101010</text>
        <text x="54" y="60" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">010101</text>
        <text x="55" y="70" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">10101</text>
        <text x="58" y="79" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">010</text>
      </g>
      
      <!-- Lightbulb base & SIH text -->
      <path d="M40 85 H60 L57 95 H43 Z" fill="#ffffff" stroke="#1e293b" stroke-width="3"/>
      <line x1="42" y1="89" x2="58" y2="89" stroke="#1e293b" stroke-width="2.5"/>
      <line x1="43" y1="93" x2="57" y2="93" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M46 96 H54 L52 101 H48 Z" fill="#1e293b"/>
      <text x="50" y="115" fill="#1e293b" font-family="'Inter', sans-serif" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="0.8">SIH</text>
    </svg>
  </div>
  
  <div style="display: flex; flex-direction: column; line-height: 1.15; justify-content: center;">
    <span style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px;">SMART INDIA</span>
    <span style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px;">HACKATHON</span>
    <span style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px;">2026</span>
  </div>
</div>
`;

const htmlSlide5 = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1280px;
      height: 720px;
      overflow: hidden;
      background: #ffffff;
      font-family: 'Inter', sans-serif;
      color: #1e293b;
    }
    .slide-wrapper {
      width: 1280px;
      height: 720px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }
    .slide-header {
      padding: 20px 36px 10px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
    }
    .team-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 24px;
      border: 2px solid #8b5cf6;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 18px;
      color: #3b0764;
      background: #faf5ff;
    }
    .slide-title-main {
      font-family: 'Playfair Display', serif;
      font-size: 34px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .slide-subheader {
      padding: 10px 40px 0 40px;
      font-size: 22px;
      font-weight: 800;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .slide-subheader span.icon {
      color: #2563eb;
      font-size: 20px;
    }
    .slide-content {
      flex: 1;
      padding: 10px 40px 14px 40px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .metric-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1.5px solid #86efac;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .metric-box.blue {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-color: #bae6fd;
    }
    .metric-val {
      font-size: 26px;
      font-weight: 900;
      color: #15803d;
    }
    .metric-box.blue .metric-val {
      color: #0284c7;
    }
    .metric-label {
      font-size: 13px;
      font-weight: 700;
      color: #166534;
      margin-top: 2px;
    }
    .metric-box.blue .metric-label {
      color: #0369a1;
    }
    .cards-row {
      display: flex;
      gap: 20px;
      flex: 1;
    }
    .card {
      flex: 1;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 22px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .card-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-list li {
      font-size: 15px;
      line-height: 1.45;
      color: #334155;
      position: relative;
      padding-left: 20px;
    }
    .card-list li::before {
      content: "•";
      position: absolute;
      left: 4px;
      top: -2px;
      font-size: 20px;
      color: #16a34a;
      font-weight: bold;
    }
    .card-list li strong {
      color: #0f172a;
      font-weight: 700;
    }
    .slide-footer {
      background: #0284c7;
      color: #ffffff;
      padding: 10px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .slide-footer .number {
      font-size: 16px;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div class="slide-wrapper">
    <div class="slide-header">
      <div class="team-badge">Team AgriSetu</div>
      <div class="slide-title-main">IMPACT AND BENEFITS</div>
      ${sihLogoSvg}
    </div>

    <div class="slide-subheader">
      <span class="icon">❖</span> Measurable Outcomes & Multi-Sectoral Transformation
    </div>

    <div class="slide-content">
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-val">↓ 85%</div>
          <div class="metric-label">Mandi Wait Time (4-8h → &lt;40m)</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">↓ 88%</div>
          <div class="metric-label">Distress Drop-offs (&lt;3%)</div>
        </div>
        <div class="metric-box blue">
          <div class="metric-val">100%</div>
          <div class="metric-label">DBT Payment Visibility (48h)</div>
        </div>
        <div class="metric-box blue">
          <div class="metric-val">↑ 70%</div>
          <div class="metric-label">Centre Capacity Utilization</div>
        </div>
      </div>

      <div class="cards-row">
        <div class="card">
          <div class="card-header"><span style="color: #f59e0b;">🌾</span> Social & Economic Impact</div>
          <ul class="card-list">
            <li><strong>Eliminates Overnight Queues:</strong> Removes the hardship of farmers sleeping on highway mandi roads.</li>
            <li><strong>Direct Travel Savings:</strong> Smart centre allocation saves ₹200–500 per trip in wasted tractor fuel.</li>
            <li><strong>Zero Exclusion Voice AI:</strong> Multilingual assistant ensures full accessibility for illiterate & regional farmers.</li>
            <li><strong>Predictable Income:</strong> Transparent 48-hr MSP DBT prevents exploitative distress selling to middlemen.</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-header"><span style="color: #0284c7;">🏛️</span> Governance & Environmental Value</div>
          <ul class="card-list">
            <li><strong>Proactive Administration:</strong> District radar auto-detects bottlenecks 42 mins prior to congestion.</li>
            <li><strong>100% Audit Transparency:</strong> Live DBT SLA compliance logs prevent delays & ghost procurement.</li>
            <li><strong>Lower Emissions:</strong> 30–40% fewer redundant trips significantly reduces rural carbon footprint.</li>
            <li><strong>Data-Driven Policy:</strong> Real-time district telemetry enables precision buffer stock planning.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div></div>
      <div>@SIH Idea submission- Template</div>
      <div class="number">5</div>
    </div>
  </div>
</body>
</html>
`;

const outputDir = path.resolve('..', 'sih_slides');
const brainDir = path.resolve('C:\\Users\\vansh\\.gemini\\antigravity-ide\\brain\\81160e3f-129a-4892-8304-4a84d48cdbf1');

const tempHtml5 = path.resolve(outputDir, 'temp_slide5_exact.html');
fs.writeFileSync(tempHtml5, htmlSlide5);

const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') 
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const targetImg5 = path.resolve(outputDir, 'sih_slide5_impact.jpg');
const brainImg5 = path.resolve(brainDir, 'sih_slide5_impact.jpg');

execSync(`"${chromePath}" --headless --disable-gpu --window-size=1280,720 --screenshot="${targetImg5}" "file:///${tempHtml5.replace(/\\\\/g, '/')}"`);
fs.copyFileSync(targetImg5, brainImg5);

console.log('Slide 5 with exact SIH logo rendered and exported!');
