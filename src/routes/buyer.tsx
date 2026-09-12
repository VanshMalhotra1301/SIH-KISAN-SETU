/**
 * KISAN SETU — Buyer Portal / Mandi Bidding Dashboard
 * Mandi-scoped marketplace for authorised buyers to bid on farmer produce.
 * Connected to Supabase with realtime bidding updates.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { Pill, SectionLabel } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useKisan } from "@/lib/kisan/store";
import { biddingService } from "@/lib/kisan/services";
import type { Bid, BiddingWindow, DealMessage } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buyer")({
  head: () => ({
    meta: [
      { title: "Buyer Portal — Mandi Marketplace & Bidding | KISAN SETU" },
      {
        name: "description",
        content:
          "Authorised buyer dashboard for mandi-scoped produce bidding: live marketplace, bid management, and procurement history.",
      },
    ],
  }),
  component: BuyerPageGuarded,
});

function BuyerPageGuarded() {
  return (
    <AuthGuard allowedRoles={["buyer", "super_admin"]}>
      <BuyerPortal />
    </AuthGuard>
  );
}

type BuyerTab = "marketplace" | "mybids" | "won" | "profile";

function BuyerPortal() {
  const { user } = useAuth();
  const { language, biddingWindows, centres, refreshBiddingWindows } = useKisan();
  const hi = language === "hi";

  const [activeTab, setActiveTab] = useState<BuyerTab>("marketplace");
  const [buyerBids, setBuyerBids] = useState<(Bid & { crop?: string; farmerName?: string; windowStatus?: string })[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load buyer bids
  const loadBuyerBids = useCallback(async () => {
    if (!user?.id) return;
    try {
      const bids = await biddingService.getBidsByBuyer(user.id);
      setBuyerBids(bids);
    } catch (err) {
      console.warn("Failed to load buyer bids:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBuyerBids();
  }, [loadBuyerBids]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshBiddingWindows(), loadBuyerBids()]);
    setIsRefreshing(false);
  }, [refreshBiddingWindows, loadBuyerBids]);

  const assignedCentre = useMemo(
    () => centres.find((c) => c.id === user?.centreId),
    [centres, user?.centreId],
  );

  const wonBids = useMemo(
    () => buyerBids.filter((b) => b.status === "accepted"),
    [buyerBids],
  );

  const tabs: { key: BuyerTab; label: string; labelHi: string; icon: string; count?: number }[] = [
    { key: "marketplace", label: "Marketplace", labelHi: "बाज़ार", icon: "🏪", count: biddingWindows.length },
    { key: "mybids", label: "My Bids", labelHi: "मेरी बोलियाँ", icon: "📋", count: buyerBids.length },
    { key: "won", label: "Won Bids", labelHi: "जीती बोलियाँ", icon: "🏆", count: wonBids.length },
    { key: "profile", label: "Profile", labelHi: "प्रोफ़ाइल", icon: "👤" },
  ];

  return (
    <PageShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-saffron/90 via-saffron/70 to-leaf/50 px-6 py-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏪</span>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight drop-shadow-sm">
                {hi ? "क्रेता पोर्टल" : "Buyer Portal"}
              </h1>
              <p className="mt-0.5 text-sm font-medium opacity-90">
                {hi
                  ? `${user?.businessName || "व्यापार"} — ${assignedCentre?.nameHi || "मंडी"}`
                  : `${user?.businessName || "Business"} — ${assignedCentre?.name || "Mandi"}`}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickStat icon="📦" value={String(biddingWindows.length)} label={hi ? "सक्रिय विंडो" : "Active Windows"} />
            <QuickStat icon="📋" value={String(buyerBids.filter(b => b.status === "active").length)} label={hi ? "सक्रिय बोलियाँ" : "Active Bids"} />
            <QuickStat icon="🏆" value={String(wonBids.length)} label={hi ? "जीती बोलियाँ" : "Won Bids"} />
            <QuickStat icon="🏢" value={assignedCentre?.code || "—"} label={hi ? "नियुक्त मंडी" : "Assigned Mandi"} />
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl bg-muted p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
              activeTab === tab.key
                ? "bg-card text-navy shadow-sm"
                : "text-muted-foreground hover:text-navy",
            )}
          >
            <span>{tab.icon}</span>
            <span>{hi ? tab.labelHi : tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-bold text-saffron">
                {tab.count}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-navy transition-colors"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
          <span className="hidden sm:inline">{hi ? "रीफ़्रेश" : "Refresh"}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "marketplace" && (
          <MarketplaceTab
            windows={biddingWindows}
            buyerBids={buyerBids}
            userId={user?.id || ""}
            centreId={user?.centreId || ""}
            hi={hi}
            onBidPlaced={handleRefresh}
          />
        )}
        {activeTab === "mybids" && (
          <MyBidsTab bids={buyerBids} hi={hi} onRefresh={handleRefresh} userId={user?.id || ""} />
        )}
        {activeTab === "won" && <WonBidsTab bids={wonBids} hi={hi} />}
        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            centre={assignedCentre}
            totalBids={buyerBids.length}
            wonBids={wonBids.length}
            hi={hi}
          />
        )}
      </div>
    </PageShell>
  );
}

// ─── Reusable Components ───

function QuickStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-display text-xl font-extrabold">{value}</span>
      </div>
      <p className="mt-0.5 text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

// ─── Marketplace Tab ───

function MarketplaceTab({
  windows,
  buyerBids,
  userId,
  centreId,
  hi,
  onBidPlaced,
}: {
  windows: BiddingWindow[];
  buyerBids: (Bid & { crop?: string })[];
  userId: string;
  centreId: string;
  hi: boolean;
  onBidPlaced: () => void;
}) {
  if (windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted py-16">
        <span className="text-5xl">🌾</span>
        <p className="mt-4 font-display text-lg font-bold text-navy">
          {hi ? "अभी कोई सक्रिय बोली विंडो नहीं" : "No Active Bidding Windows"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hi
            ? "जब किसान आपकी मंडी में स्लॉट बुक करेंगे, उनकी फसल यहाँ दिखेगी।"
            : "When farmers book slots at your mandi, their produce will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionLabel>
        🏪 {hi ? "बाज़ार — सक्रिय बोली विंडो" : "Marketplace — Active Bidding Windows"}
      </SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {windows.map((w) => (
          <BiddingWindowCard
            key={w.id}
            window={w}
            existingBid={buyerBids.find((b) => b.windowId === w.id)}
            userId={userId}
            hi={hi}
            onBidPlaced={onBidPlaced}
          />
        ))}
      </div>
    </div>
  );
}

function BiddingWindowCard({
  window: w,
  existingBid,
  userId,
  hi,
  onBidPlaced,
}: {
  window: BiddingWindow;
  existingBid?: any;
  userId: string;
  hi: boolean;
  onBidPlaced: () => void;
}) {
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState(existingBid ? String(existingBid.bidAmount) : String(w.mspRate + 50));
  const [bidQuantity, setBidQuantity] = useState(String(w.quantityQuintals));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeLeft = useMemo(() => {
    const closes = new Date(w.closesAt).getTime();
    const now = Date.now();
    const diffMin = Math.max(0, Math.round((closes - now) / 60000));
    if (diffMin <= 0) return hi ? "समाप्त" : "Expired";
    if (diffMin < 60) return `${diffMin}m`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  }, [w.closesAt, hi]);

  const handleSubmitBid = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(bidAmount);
    const qty = Number(bidQuantity);

    if (amt < w.mspRate) {
      setError(hi ? `न्यूनतम बोली ₹${w.mspRate}/क्विंटल (MSP) होनी चाहिए` : `Minimum bid must be ₹${w.mspRate}/qtl (MSP)`);
      return;
    }

    setIsSubmitting(true);
    try {
      await biddingService.submitBid({
        windowId: w.id,
        buyerId: userId,
        bidAmount: amt,
        quantityQuintals: qty,
      });
      setShowBidForm(false);
      onBidPlaced();
    } catch (err: any) {
      setError(err.message || "Failed to submit bid");
    } finally {
      setIsSubmitting(false);
    }
  }, [bidAmount, bidQuantity, w.id, w.mspRate, userId, hi, onBidPlaced]);

  return (
    <div className="surface-lift group relative overflow-hidden rounded-2xl border border-border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5">
      {/* Status Pill + Timer */}
      <div className="flex items-center justify-between">
        <Pill tone="leaf">{w.crop}</Pill>
        <span className="flex items-center gap-1 rounded-full bg-saffron-soft px-2 py-0.5 text-xs font-bold text-saffron">
          ⏱ {timeLeft}
        </span>
      </div>

      {/* Farmer Info */}
      <div className="mt-3">
        <p className="font-display text-base font-extrabold text-navy">
          {w.farmerName || (hi ? "किसान" : "Farmer")}
        </p>
        <p className="text-xs text-muted-foreground">
          {w.quantityQuintals} {hi ? "क्विंटल" : "Quintals"} • {w.centreName || ""}
        </p>
      </div>

      {/* Pricing */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-2.5">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            MSP {hi ? "दर" : "Rate"}
          </p>
          <p className="font-display text-lg font-extrabold text-navy">
            ₹{w.mspRate.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-muted-foreground">{hi ? "प्रति क्विंटल" : "per quintal"}</p>
        </div>
        <div className="rounded-xl bg-leaf-soft p-2.5">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {hi ? "सर्वोच्च बोली" : "Highest Bid"}
          </p>
          <p className="font-display text-lg font-extrabold text-leaf">
            {w.highestBid ? `₹${w.highestBid.toLocaleString("en-IN")}` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {w.totalBids || 0} {hi ? "बोलियाँ" : "bids"}
          </p>
        </div>
      </div>

      {/* Existing Bid Notice */}
      {existingBid && (
        <div className="mt-3 rounded-xl bg-saffron-soft/60 px-3 py-2 text-xs font-semibold text-saffron">
          ✅ {hi ? "आपकी बोली" : "Your bid"}: ₹{existingBid.bidAmount.toLocaleString("en-IN")}/{hi ? "क्विंटल" : "qtl"}
        </div>
      )}

      {/* Bid Form */}
      {showBidForm ? (
        <form onSubmit={handleSubmitBid} className="mt-4 space-y-3 rounded-xl bg-muted/50 p-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-muted-foreground">
              {hi ? "बोली राशि (₹/क्विंटल)" : "Bid Amount (₹/qtl)"}
            </label>
            <input
              type="number"
              required
              min={w.mspRate}
              step={1}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-bold text-navy focus-ring"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-muted-foreground">
              {hi ? "मात्रा (क्विंटल)" : "Quantity (qtl)"}
            </label>
            <input
              type="number"
              required
              min={1}
              max={w.quantityQuintals}
              value={bidQuantity}
              onChange={(e) => setBidQuantity(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-bold text-navy focus-ring"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-danger">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-leaf to-leaf/80 px-3 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {isSubmitting
                ? (hi ? "भेजा जा रहा..." : "Submitting...")
                : existingBid
                  ? (hi ? "बोली अपडेट करें" : "Update Bid")
                  : (hi ? "बोली लगाएँ" : "Place Bid")}
            </button>
            <button
              type="button"
              onClick={() => setShowBidForm(false)}
              className="rounded-lg border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {hi ? "रद्द" : "Cancel"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowBidForm(true)}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-saffron to-saffron/80 px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-md"
        >
          {existingBid
            ? (hi ? "🔄 बोली अपडेट करें" : "🔄 Update Bid")
            : (hi ? "📋 बोली लगाएँ" : "📋 Place Bid")}
        </button>
      )}
    </div>
  );
}

// ─── My Bids Tab ───

function MyBidsTab({
  bids,
  hi,
  onRefresh,
  userId,
}: {
  bids: (Bid & { crop?: string; farmerName?: string; windowStatus?: string })[];
  hi: boolean;
  onRefresh: () => void;
  userId: string;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "negotiating" | "accepted" | "rejected" | "withdrawn">("all");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Deal Chat Modal State
  const [selectedDealBid, setSelectedDealBid] = useState<(Bid & { crop?: string; farmerName?: string }) | null>(null);
  const [dealMessages, setDealMessages] = useState<DealMessage[]>([]);
  const [buyerMessageText, setBuyerMessageText] = useState("");
  const [buyerCounterPrice, setBuyerCounterPrice] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingBid, setIsUpdatingBid] = useState(false);

  // Load messages when a bid is selected
  useEffect(() => {
    if (selectedDealBid) {
      biddingService.getDealMessages(selectedDealBid.id).then(setDealMessages).catch(() => {});
    } else {
      setDealMessages([]);
    }
  }, [selectedDealBid]);

  const filtered = useMemo(
    () => (filter === "all" ? bids : bids.filter((b) => b.status === filter)),
    [bids, filter],
  );

  const handleWithdraw = useCallback(async (bidId: string) => {
    setWithdrawingId(bidId);
    try {
      await biddingService.withdrawBid(bidId, userId);
      onRefresh();
    } catch (err) {
      console.warn("Failed to withdraw bid:", err);
    } finally {
      setWithdrawingId(null);
    }
  }, [userId, onRefresh]);

  const handleSendBuyerMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDealBid || !userId || (!buyerMessageText.trim() && !buyerCounterPrice)) return;
    setIsSendingMessage(true);
    try {
      const price = buyerCounterPrice ? parseFloat(buyerCounterPrice) : null;
      await biddingService.sendDealMessage({
        bidId: selectedDealBid.id,
        windowId: selectedDealBid.windowId,
        senderId: userId,
        senderRole: "buyer",
        message: buyerMessageText.trim() || (price ? `मैं ₹${price}/क्विंटल पर सौदा तय करने को तैयार हूँ।` : "नमस्ते, इस सौदे पर चर्चा करें।"),
        proposedPrice: price,
        proposedQuantity: selectedDealBid.quantityQuintals,
      });
      setBuyerMessageText("");
      setBuyerCounterPrice("");
      const msgs = await biddingService.getDealMessages(selectedDealBid.id);
      setDealMessages(msgs);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateBidAmount = async (newPrice: number) => {
    if (!selectedDealBid || !userId) return;
    setIsUpdatingBid(true);
    try {
      await biddingService.submitBid({
        windowId: selectedDealBid.windowId,
        buyerId: userId,
        bidAmount: newPrice,
        quantityQuintals: selectedDealBid.quantityQuintals,
      });
      await biddingService.sendDealMessage({
        bidId: selectedDealBid.id,
        windowId: selectedDealBid.windowId,
        senderId: userId,
        senderRole: "buyer",
        message: `मैंने अपनी आधिकारिक बोली बढ़ाकर ₹${newPrice}/क्विंटल कर दी है।`,
        proposedPrice: newPrice,
        proposedQuantity: selectedDealBid.quantityQuintals,
      });
      const msgs = await biddingService.getDealMessages(selectedDealBid.id);
      setDealMessages(msgs);
      onRefresh();
      alert(hi ? `बोली सफलतापूर्वक ₹${newPrice}/क्विंटल पर अपडेट की गई!` : `Bid successfully updated to ₹${newPrice}/qtl!`);
    } catch (err: any) {
      alert(err.message || "Failed to update bid");
    } finally {
      setIsUpdatingBid(false);
    }
  };

  const statusConfig: Record<string, { tone: string; label: string; labelHi: string }> = {
    active: { tone: "leaf", label: "Active", labelHi: "सक्रिय" },
    negotiating: { tone: "navy", label: "Negotiating", labelHi: "बातचीत जारी" },
    accepted: { tone: "leaf", label: "Won ✓", labelHi: "जीती ✓" },
    rejected: { tone: "danger", label: "Rejected", labelHi: "अस्वीकृत" },
    outbid: { tone: "saffron", label: "Outbid", labelHi: "आउटबिड" },
    withdrawn: { tone: "navy", label: "Withdrawn", labelHi: "वापस" },
  };

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted py-16">
        <span className="text-5xl">📋</span>
        <p className="mt-4 font-display text-lg font-bold text-navy">
          {hi ? "अभी तक कोई बोली नहीं लगाई" : "No Bids Placed Yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hi ? "बाज़ार टैब से बोली लगाएँ" : "Place bids from the Marketplace tab"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionLabel>📋 {hi ? "मेरी सभी बोलियाँ" : "All My Bids"}</SectionLabel>

      {/* Filter */}
      <div className="flex gap-1 overflow-x-auto">
        {(["all", "active", "negotiating", "accepted", "rejected", "withdrawn"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f ? "bg-navy text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f === "all" ? (hi ? "सभी" : "All") : (hi ? statusConfig[f]?.labelHi : statusConfig[f]?.label)}
          </button>
        ))}
      </div>

      {/* Bids List */}
      <div className="space-y-2">
        {filtered.map((bid) => {
          const cfg = (statusConfig as any)[bid.status] || statusConfig["active"];
          return (
            <div
              key={bid.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-extrabold text-navy">
                    ₹{bid.bidAmount.toLocaleString("en-IN")}/{hi ? "क्विंटल" : "qtl"}
                  </span>
                  <Pill tone={(cfg?.tone || "leaf") as any}>{hi ? cfg?.labelHi : cfg?.label}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bid.crop || "Crop"} • {bid.quantityQuintals} {hi ? "क्विंटल" : "qtl"} • {bid.farmerName || "Farmer"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDealBid(bid)}
                  className="rounded-lg border border-saffron/40 bg-saffron-soft/30 px-3 py-1.5 text-xs font-bold text-navy hover:bg-saffron-soft transition-all shadow-xs"
                >
                  💬 {hi ? "बातचीत / डील चैट" : "Negotiate / Chat"}
                </button>

                {bid.status === "active" && (
                  <button
                    type="button"
                    onClick={() => handleWithdraw(bid.id)}
                    disabled={withdrawingId === bid.id}
                    className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors"
                  >
                    {withdrawingId === bid.id ? "..." : (hi ? "वापस लें" : "Withdraw")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── BUYER NEGOTIATION / DEAL CHAT MODAL ─── */}
      {selectedDealBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-rise">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-black text-navy">
                    💬 {hi ? "किसान के साथ भाव मोलतोल (Deal Room)" : "Negotiate with Farmer"}
                  </h3>
                  <Pill tone={((statusConfig as any)[selectedDealBid.status]?.tone || "leaf") as any}>
                    {hi ? statusConfig[selectedDealBid.status]?.labelHi : statusConfig[selectedDealBid.status]?.label}
                  </Pill>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {selectedDealBid.farmerName || "Farmer"} · {selectedDealBid.crop || "Crop"} ({selectedDealBid.quantityQuintals} qtl)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDealBid(null)}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-xs font-bold text-muted-foreground hover:text-navy"
              >
                ✕
              </button>
            </div>

            {/* Current Bid Summary */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs">
              <span className="font-bold text-muted-foreground uppercase">{hi ? "आपकी वर्तमान बोली:" : "Your Current Bid:"}</span>
              <span className="font-display text-base font-black text-navy">
                ₹{selectedDealBid.bidAmount.toLocaleString("en-IN")}/{hi ? "क्विंटल" : "qtl"}
              </span>
            </div>

            {/* Chat Stream */}
            <div className="h-72 overflow-y-auto space-y-2.5 rounded-2xl bg-muted/20 border border-border p-3.5 text-xs">
              {dealMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground space-y-1">
                  <span className="text-2xl">🤝</span>
                  <p className="font-bold text-navy text-xs">
                    {hi ? "कोई पूर्व संदेश नहीं" : "No messages yet"}
                  </p>
                  <p className="text-[11px]">
                    {hi ? "किसान के साथ भाव या शर्तों पर चर्चा करने के लिए नीचे संदेश भेजें।" : "Send a message or proposal to the farmer below."}
                  </p>
                </div>
              ) : (
                dealMessages.map((msg) => {
                  const isBuyer = msg.senderRole === "buyer";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isBuyer ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground mb-0.5 px-1">
                        {isBuyer ? (hi ? "आप (क्रेता)" : "You (Buyer)") : (selectedDealBid.farmerName || "Farmer")}
                      </span>

                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 shadow-xs text-xs space-y-1",
                          isBuyer
                            ? "bg-navy text-primary-foreground rounded-br-xs"
                            : "bg-card text-foreground border border-border rounded-bl-xs"
                        )}
                      >
                        {msg.proposedPrice && (
                          <div className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black",
                            isBuyer ? "bg-white/20 text-white" : "bg-saffron-soft text-navy border border-saffron/30"
                          )}>
                            💡 {hi ? "प्रस्तावित दर:" : "Counter Rate:"} ₹{msg.proposedPrice.toLocaleString("en-IN")}/qtl
                          </div>
                        )}
                        <p className="font-medium whitespace-pre-wrap">{msg.message}</p>
                        <span className="block text-[9px] opacity-70 text-right">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Raise Bid if Farmer Countered */}
            {dealMessages.some(m => m.senderRole === "farmer" && m.proposedPrice && m.proposedPrice > selectedDealBid.bidAmount) && (
              (() => {
                const latestFarmerCounter = [...dealMessages].reverse().find(m => m.senderRole === "farmer" && m.proposedPrice);
                if (!latestFarmerCounter?.proposedPrice) return null;
                const targetPrice = latestFarmerCounter.proposedPrice;
                return (
                  <div className="flex items-center justify-between rounded-xl bg-saffron-soft/40 border border-saffron/30 p-2.5 text-xs">
                    <span className="font-bold text-navy">
                      💡 {hi ? `किसान ने ₹${targetPrice}/qtl माँगा है` : `Farmer requested ₹${targetPrice}/qtl`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateBidAmount(targetPrice)}
                      disabled={isUpdatingBid}
                      className="rounded-lg bg-navy px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-navy/90 transition-all shadow-xs"
                    >
                      {isUpdatingBid ? "..." : (hi ? `₹${targetPrice} पर बोली लगाएँ` : `Match ₹${targetPrice}`)}
                    </button>
                  </div>
                );
              })()
            )}

            {/* Message Input Form */}
            {selectedDealBid.status !== "accepted" && selectedDealBid.status !== "rejected" && selectedDealBid.status !== "withdrawn" && (
              <form onSubmit={handleSendBuyerMessage} className="space-y-2 border-t border-border pt-3">
                <div className="flex gap-2">
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      placeholder={hi ? "दर (₹)" : "Price (₹)"}
                      value={buyerCounterPrice}
                      onChange={(e) => setBuyerCounterPrice(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-navy focus-ring"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={hi ? "किसान को संदेश लिखें..." : "Message to farmer..."}
                    value={buyerMessageText}
                    onChange={(e) => setBuyerMessageText(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium focus-ring"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || (!buyerMessageText.trim() && !buyerCounterPrice)}
                    className="shrink-0 rounded-xl bg-navy px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-navy/90 transition-all disabled:opacity-50 focus-ring"
                  >
                    {isSendingMessage ? "..." : "📤"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Won Bids Tab ───

function WonBidsTab({
  bids,
  hi,
}: {
  bids: (Bid & { crop?: string; farmerName?: string })[];
  hi: boolean;
}) {
  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted py-16">
        <span className="text-5xl">🏆</span>
        <p className="mt-4 font-display text-lg font-bold text-navy">
          {hi ? "अभी तक कोई बोली नहीं जीती" : "No Won Bids Yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hi ? "जब किसान आपकी बोली स्वीकार करेंगे, वे यहाँ दिखेंगी।" : "Accepted bids will appear here when farmers accept your offers."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionLabel>🏆 {hi ? "जीती बोलियाँ — खरीदारी तय" : "Won Bids — Procurement Confirmed"}</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className="overflow-hidden rounded-2xl border-2 border-leaf/30 bg-gradient-to-br from-leaf-soft/50 to-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Pill tone="leaf">✅ {hi ? "स्वीकृत" : "Accepted"}</Pill>
              <span className="text-xs text-muted-foreground">
                {new Date(bid.updatedAt).toLocaleDateString("en-IN")}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {hi ? "फसल" : "Crop"}
                </span>
                <span className="font-display text-sm font-extrabold text-navy">{bid.crop || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {hi ? "किसान" : "Farmer"}
                </span>
                <span className="text-sm font-semibold text-navy">{bid.farmerName || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {hi ? "स्वीकृत दर" : "Accepted Rate"}
                </span>
                <span className="font-display text-lg font-extrabold text-leaf">
                  ₹{bid.bidAmount.toLocaleString("en-IN")}/{hi ? "क्विंटल" : "qtl"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {hi ? "मात्रा" : "Quantity"}
                </span>
                <span className="text-sm font-semibold text-navy">
                  {bid.quantityQuintals} {hi ? "क्विंटल" : "Quintals"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {hi ? "कुल मूल्य" : "Total Value"}
                </span>
                <span className="font-display text-lg font-extrabold text-navy">
                  ₹{(bid.bidAmount * bid.quantityQuintals).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Tab ───

function ProfileTab({
  user,
  centre,
  totalBids,
  wonBids,
  hi,
}: {
  user: any;
  centre: any;
  totalBids: number;
  wonBids: number;
  hi: boolean;
}) {
  const successRate = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;

  return (
    <div className="space-y-4">
      <SectionLabel>👤 {hi ? "व्यापारी प्रोफ़ाइल" : "Buyer Profile"}</SectionLabel>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Business Info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-display text-sm font-extrabold text-navy">
            {hi ? "व्यापार विवरण" : "Business Details"}
          </h3>
          <ProfileRow label={hi ? "नाम" : "Name"} value={user?.fullName || "—"} />
          <ProfileRow label={hi ? "व्यापार नाम" : "Business"} value={user?.businessName || "—"} />
          <ProfileRow label={hi ? "व्यापार प्रकार" : "Type"} value={user?.businessType || "—"} />
          <ProfileRow label={hi ? "लाइसेंस" : "License"} value={user?.licenseNumber || "—"} />
          <ProfileRow label={hi ? "ईमेल" : "Email"} value={user?.email || "—"} />
          <ProfileRow label={hi ? "फ़ोन" : "Phone"} value={user?.phone || "—"} />
          <ProfileRow label={hi ? "जिला" : "District"} value={user?.district || "—"} />
        </div>

        {/* Mandi Info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-display text-sm font-extrabold text-navy">
            {hi ? "नियुक्त मंडी" : "Assigned Mandi"}
          </h3>
          <ProfileRow label={hi ? "कोड" : "Code"} value={centre?.code || "—"} />
          <ProfileRow label={hi ? "नाम" : "Name"} value={hi ? (centre?.nameHi || "—") : (centre?.name || "—")} />
          <ProfileRow label={hi ? "जिला" : "District"} value={centre?.district || "—"} />

          <div className="mt-4 border-t border-border pt-3">
            <h3 className="font-display text-sm font-extrabold text-navy">
              {hi ? "बोली आँकड़े" : "Bid Statistics"}
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="font-display text-xl font-extrabold text-navy">{totalBids}</p>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {hi ? "कुल" : "Total"}
                </p>
              </div>
              <div className="rounded-xl bg-leaf-soft p-3 text-center">
                <p className="font-display text-xl font-extrabold text-leaf">{wonBids}</p>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {hi ? "जीती" : "Won"}
                </p>
              </div>
              <div className="rounded-xl bg-saffron-soft p-3 text-center">
                <p className="font-display text-xl font-extrabold text-saffron">{successRate}%</p>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {hi ? "सफलता" : "Success"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}
