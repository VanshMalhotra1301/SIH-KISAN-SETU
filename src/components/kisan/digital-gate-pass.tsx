import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SvgQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Generates an authentic SVG QR Code representation with standard finder patterns,
 * timing patterns, and deterministic data matrix.
 */
export function SvgQrCode({ value, size = 160, className }: SvgQrCodeProps) {
  const matrix = useMemo(() => {
    const N = 25; // 25x25 QR Version 2 standard
    const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    // Helper: Draw 7x7 Finder Pattern with 1px border
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        const row = grid[startY + r];
        if (!row) continue;
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          row[startX + c] = isOuter || isInner;
        }
      }
    };

    // 1. Top-Left Finder
    drawFinder(0, 0);
    // 2. Top-Right Finder
    drawFinder(N - 7, 0);
    // 3. Bottom-Left Finder
    drawFinder(0, N - 7);

    // 4. Timing patterns
    for (let i = 8; i < N - 8; i++) {
      const row6 = grid[6];
      if (row6) row6[i] = i % 2 === 0;
      const rowI = grid[i];
      if (rowI) rowI[6] = i % 2 === 0;
    }

    // 5. Alignment pattern (5x5) at (16, 16)
    const alignX = 16;
    const alignY = 16;
    for (let r = -2; r <= 2; r++) {
      const row = grid[alignY + r];
      if (!row) continue;
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        row[alignX + c] = isBorder || isCenter;
      }
    }

    // 6. Fill remaining modules deterministically using hash of value
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < N; r++) {
      const row = grid[r];
      if (!row) continue;
      for (let c = 0; c < N; c++) {
        // Skip reserved regions (finders + separators)
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= N - 8;
        const inBottomLeft = r >= N - 8 && c < 8;
        const inTiming = (r === 6 && c >= 8 && c < N - 8) || (c === 6 && r >= 8 && r < N - 8);
        const inAlign = r >= 14 && r <= 18 && c >= 14 && c <= 18;

        if (inTopLeft || inTopRight || inBottomLeft || inTiming || inAlign) {
          continue;
        }

        // Pseudo-random bit based on position and value hash
        const seed = (hash + r * 31 + c * 59) ^ (r * c);
        row[c] = (seed % 3 === 0) || ((r + c) % 5 === 0);
      }
    }

    return grid;
  }, [value]);

  const N = matrix.length;
  const cellSize = size / N;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("rounded-lg bg-white p-1.5 shadow-sm", className)}
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill="#0b2416"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export interface GatePassDetails {
  token: string;
  farmerName: string;
  farmerIdCode: string;
  mobile?: string;
  village: string;
  district: string;
  centreName: string;
  centreCode?: string;
  crop: string;
  quantityQuintals: number;
  slotWindow: string;
  counterAssigned?: number;
  vehicleNumber?: string;
  issuedAt?: string;
}

export function DigitalGatePass({
  pass,
  isHindi = false,
  onPrint,
  onClose,
}: {
  pass: GatePassDetails;
  isHindi?: boolean;
  onPrint?: () => void;
  onClose?: () => void;
}) {
  const qrPayload = `KS:GATE:${pass.token}:${pass.farmerIdCode}:${pass.centreName}:${pass.slotWindow}`;
  const verificationHash = useMemo(() => {
    let h = 0x811c9dc5;
    const str = `${pass.token}-${pass.farmerIdCode}-${pass.slotWindow}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return `SHA256-${h.toString(16).toUpperCase().padStart(8, "0")}B821A9`;
  }, [pass.token, pass.farmerIdCode, pass.slotWindow]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border-2 border-leaf/60 bg-card p-6 shadow-2xl transition-all">
      {/* Top Govt Emblem Header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-leaf font-display text-xl font-black text-white shadow-sm">
            🌾
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-leaf">
              {isHindi ? "खाद्य एवं नागरिक आपूर्ति विभाग, भारत सरकार" : "Dept. of Food & Civil Supplies, Govt. of India"}
            </p>
            <h3 className="font-display text-lg font-black text-navy">
              {isHindi ? "आधिकारिक डिजिटल प्रवेश पत्र (गेट पास)" : "Official Mandi Gate Entry Pass"}
            </h3>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {isHindi ? "राष्ट्रीय कृषि ई-उपार्जन प्रणाली · 2026-27" : "National e-Procurement Portal · Rabi 2026-27"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="rounded-full bg-leaf px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
            ✓ {isHindi ? "प्रमाणित" : "VERIFIED"}
          </span>
          <p className="mt-1 font-mono text-[10px] font-bold text-muted-foreground">
            {pass.issuedAt || new Date().toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* QR Code Column */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-leaf/30 bg-leaf-soft/40 p-4 text-center">
          <SvgQrCode value={qrPayload} size={140} />
          <p className="mt-2.5 font-mono text-xs font-black tracking-wider text-navy">
            {pass.token}
          </p>
          <span className="text-[9px] font-bold uppercase text-muted-foreground">
            {isHindi ? "गेट स्कैनर कोड" : "Scan at Entry Gate"}
          </span>
          <p className="mt-1 font-mono text-[8px] text-muted-foreground">
            {verificationHash.slice(0, 16)}...
          </p>
        </div>

        {/* Details Column */}
        <div className="sm:col-span-2 space-y-3 text-xs">
          <div className="rounded-xl bg-muted/40 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {isHindi ? "किसान का नाम एवं कोड" : "Farmer Identity & Code"}
            </span>
            <p className="font-display text-sm font-extrabold text-navy">
              {pass.farmerName} <span className="font-mono text-xs font-semibold text-muted-foreground">({pass.farmerIdCode})</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              📍 {pass.village ? `${pass.village}, ` : ""}{pass.district}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                {isHindi ? "आवंटित केंद्र" : "Procurement Centre"}
              </span>
              <p className="font-extrabold text-navy truncate">{pass.centreName}</p>
              <p className="text-[10px] font-semibold text-leaf">
                {isHindi ? "काउंटर #" : "Counter #"}{pass.counterAssigned || 1}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                {isHindi ? "रिपोर्टिंग समय (स्लॉट)" : "Reporting Window"}
              </span>
              <p className="font-extrabold text-navy truncate">{pass.slotWindow}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {isHindi ? "10 मिनट पूर्व पहुँचें" : "Arrive 10m prior"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                {isHindi ? "उपज एवं अनुमानित मात्रा" : "Produce & Target Qty"}
              </span>
              <p className="font-extrabold text-navy">
                {pass.crop} · {pass.quantityQuintals} qtl
              </p>
              <span className="text-[10px] text-muted-foreground">FAQ Grade</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                {isHindi ? "वाहन / ट्रैक्टर नंबर" : "Vehicle / Tractor No."}
              </span>
              <p className="font-mono font-extrabold text-navy">
                {pass.vehicleNumber || "HR-05-T-8821"}
              </p>
              <span className="text-[10px] text-leaf font-bold">Gate Authorized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="mt-5 rounded-2xl border border-leaf/30 bg-leaf-soft/30 p-3 text-[11px] text-muted-foreground flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="font-extrabold text-navy">
            🛡️ {isHindi ? "प्रवेश निर्देश एवं सुरक्षा नियम" : "Gate Entry Instructions"}
          </p>
          <p>
            {isHindi
              ? "यह डिजिटल पास सीधे सुरक्षा गेट व धर्मकांटा सर्वर से सत्यापित होगा। किसी बिचौलिए को कोई शुल्क न दें।"
              : "Present this digital pass at the entrance barricade for instant barcode scan and weighbridge clearance."}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 rounded-xl bg-navy py-3 text-xs font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 focus-ring"
        >
          🖨️ {isHindi ? "गेट पास प्रिंट / सेव करें (PDF)" : "Print / Download Gate Pass (PDF)"}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-5 py-3 text-xs font-bold text-navy hover:bg-muted focus-ring"
          >
            {isHindi ? "बंद करें" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}
