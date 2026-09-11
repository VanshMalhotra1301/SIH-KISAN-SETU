import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const sihLogoSvg = `
<div style="display: flex; align-items: center; gap: 12px;">
  <div style="width: 58px; height: 68px;">
    <svg width="58" height="68" viewBox="0 0 100 120" fill="none">
      <line x1="50" y1="4" x2="50" y2="14" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="86" y1="18" x2="78" y2="26" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="100" y1="52" x2="90" y2="52" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="86" y1="86" x2="78" y2="78" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="14" y1="18" x2="22" y2="26" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="0" y1="52" x2="10" y2="52" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="14" y1="86" x2="22" y2="78" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      
      <g>
        <path d="M48 18 C33 18, 22 28, 22 45 C22 55, 28 64, 34 71 C38 75, 42 80, 48 83 Z" fill="#ea580c"/>
        <path d="M30 32 H38 V42 H46" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M26 48 H34 V60 H42" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="30" cy="32" r="3" fill="#ffffff"/>
        <circle cx="46" cy="42" r="3" fill="#ffffff"/>
        <circle cx="26" cy="48" r="3" fill="#ffffff"/>
        <circle cx="42" cy="60" r="3" fill="#ffffff"/>
      </g>
      
      <g>
        <path d="M52 18 C67 18, 78 28, 78 45 C78 55, 72 64, 66 71 C62 75, 58 80, 52 83 Z" fill="#16a34a"/>
        <text x="56" y="30" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">1011</text>
        <text x="54" y="40" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">01010</text>
        <text x="54" y="50" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">101010</text>
        <text x="54" y="60" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">010101</text>
        <text x="55" y="70" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">10101</text>
        <text x="58" y="79" fill="#ffffff" font-family="'Courier New', monospace" font-size="8.5" font-weight="900" letter-spacing="0.5">010</text>
      </g>
      
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

const htmlSlide6 = `
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
      padding: 12px 40px 16px 40px;
      display: flex;
      gap: 24px;
    }
    .card {
      flex: 1;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 22px 24px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
    }
    .card-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 13px;
    }
    .card-list li {
      font-size: 15.5px;
      line-height: 1.45;
      color: #334155;
      position: relative;
      padding-left: 22px;
    }
    .card-list li::before {
      content: "•";
      position: absolute;
      left: 6px;
      top: -2px;
      font-size: 22px;
      color: #16a34a;
      font-weight: bold;
    }
    .card-list li strong {
      color: #0f172a;
      font-weight: 700;
    }
    .card-list li span.link {
      color: #0284c7;
      font-weight: 600;
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
      <div class="slide-title-main">RESEARCH AND REFERENCES</div>
      ${sihLogoSvg}
    </div>

    <div class="slide-subheader">
      <span class="icon">❖</span> Details & Links of Reference Works and Benchmarks
    </div>

    <div class="slide-content">
      <div class="card">
        <div class="card-header"><span style="color: #f59e0b;">🏛️</span> Government Frameworks & Portals</div>
        <ul class="card-list">
          <li><strong>Ministry of Consumer Affairs, Food & Public Distribution:</strong> MSP Procurement Guidelines (2025-26) — <span class="link">dfpd.gov.in</span></li>
          <li><strong>CACP (Commission for Agricultural Costs & Prices):</strong> Official MSP notifications for Wheat, Paddy, Mustard — <span class="link">cacp.dacnet.nic.in</span></li>
          <li><strong>PFMS & PM-KISAN:</strong> Direct Benefit Transfer infrastructure & Aadhaar verification — <span class="link">pfms.nic.in</span> | <span class="link">pmkisan.gov.in</span></li>
          <li><strong>e-NAM (National Agriculture Market):</strong> Reference architecture for digital mandi integration — <span class="link">enam.gov.in</span></li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header"><span style="color: #0284c7;">📚</span> Technical Standards & Studies</div>
        <ul class="card-list">
          <li><strong>NITI Aayog (2024):</strong> Report on "Digitizing Agricultural Supply Chains & Eliminating Mandi Congestion".</li>
          <li><strong>W3C Web Speech API:</strong> Multilingual speech synthesis and voice activity detection standards.</li>
          <li><strong>Digital Public Infrastructure (DPI):</strong> India Stack architectural principles for citizen-scale public services.</li>
          <li><strong>NABARD & FAO Research:</strong> Studies on economic losses caused by agricultural queue delays in South Asia.</li>
        </ul>
      </div>
    </div>

    <div class="slide-footer">
      <div></div>
      <div>@SIH Idea submission- Template</div>
      <div class="number">6</div>
    </div>
  </div>
</body>
</html>
`;

const outputDir = path.resolve('..', 'sih_slides');
const brainDir = path.resolve('C:\\Users\\vansh\\.gemini\\antigravity-ide\\brain\\81160e3f-129a-4892-8304-4a84d48cdbf1');

const tempHtml6 = path.resolve(outputDir, 'temp_slide6_exact.html');
fs.writeFileSync(tempHtml6, htmlSlide6);

const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') 
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const targetImg6 = path.resolve(outputDir, 'sih_slide6_references.jpg');
const brainImg6 = path.resolve(brainDir, 'sih_slide6_references.jpg');

execSync(`"${chromePath}" --headless --disable-gpu --window-size=1280,720 --screenshot="${targetImg6}" "file:///${tempHtml6.replace(/\\\\/g, '/')}"`);
fs.copyFileSync(targetImg6, brainImg6);

console.log('Slide 6 with exact SIH logo exported!');
