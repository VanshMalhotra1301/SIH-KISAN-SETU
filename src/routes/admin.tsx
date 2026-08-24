import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { SectionLabel, StatCard } from "@/components/kisan/primitives";
import { adminService, type AdminUser } from "@/lib/kisan/services";
import { useKisan } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Super Admin Portal | KISAN SETU" }],
  }),
  component: AdminPortal,
});

function AdminPortal() {
  const { language, centres } = useKisan();
  const hi = language === "hi";

  const [activeTab, setActiveTab] = useState<"users" | "centres" | "audit">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, a, s] = await Promise.all([
        adminService.listUsers(),
        adminService.listAuditLogs({ limit: 50 }),
        adminService.getSystemStats(),
      ]);
      setUsers(u);
      setAuditLogs(a);
      setStats(s);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "farmer" ? "centre_operator" : currentRole === "centre_operator" ? "district_admin" : "farmer";
    try {
      await adminService.updateUserRole(userId, nextRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: nextRole } : u));
    } catch (err) {
      alert("Failed to update user role");
    }
  };

  return (
    <AuthGuard allowedRoles={["super_admin"]}>
      <PageShell tone="dark">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <SectionLabel tone="dark">{hi ? "सुपर एडमिन कंट्रोल" : "Super Admin Control"}</SectionLabel>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-command-fg sm:text-4xl">
              {hi ? "राज्य निदेशालय डैशबोर्ड" : "State Directorate Dashboard"}
            </h1>
            <p className="mt-2 text-sm text-command-muted">
              {hi ? "संपूर्ण प्रणाली अवलोकन एवं प्रबंधन" : "Full system oversight and management"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-command-line bg-command-panel px-4 py-2 text-xs font-bold text-command-fg hover:bg-command-line"
          >
            {loading ? "..." : hi ? "रीफ्रेश करें" : "Refresh Data"}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard tone="dark" label="Total Users" value={stats.totalUsers} accent="navy" />
            <StatCard tone="dark" label="Active Farmers" value={stats.totalFarmers} accent="leaf" />
            <StatCard tone="dark" label="Total Tickets" value={stats.totalTickets} accent="saffron" />
            <StatCard tone="dark" label="Centres" value={stats.totalCentres} accent="navy" />
          </section>
        )}

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-command-line pb-3">
          <button
            onClick={() => setActiveTab("users")}
            className={cn("rounded-xl px-4 py-2 text-xs font-bold transition-all", activeTab === "users" ? "bg-command-line text-command-fg" : "text-command-muted hover:text-command-fg")}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("centres")}
            className={cn("rounded-xl px-4 py-2 text-xs font-bold transition-all", activeTab === "centres" ? "bg-command-line text-command-fg" : "text-command-muted hover:text-command-fg")}
          >
            Centres ({centres.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={cn("rounded-xl px-4 py-2 text-xs font-bold transition-all", activeTab === "audit" ? "bg-command-line text-command-fg" : "text-command-muted hover:text-command-fg")}
          >
            Audit Logs
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="mt-6 overflow-hidden rounded-xl border border-command-line bg-command-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-command-fg">
                <thead className="border-b border-command-line bg-command text-xs uppercase text-command-muted">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-command-line">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold">{u.fullName}</div>
                        <div className="text-xs text-command-muted">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          u.role === "super_admin" ? "bg-danger/20 text-danger" :
                          u.role === "district_admin" ? "bg-saffron/20 text-saffron" :
                          u.role === "centre_operator" ? "bg-cyan-signal/20 text-cyan-signal" :
                          "bg-leaf/20 text-leaf"
                        )}>
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{u.district || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => toggleUserRole(u.id, u.role)}
                          className="text-xs font-bold text-cyan-signal hover:underline"
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Centres Tab */}
        {activeTab === "centres" && (
          <div className="mt-6 overflow-hidden rounded-xl border border-command-line bg-command-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-command-fg">
                <thead className="border-b border-command-line bg-command text-xs uppercase text-command-muted">
                  <tr>
                    <th className="px-4 py-3">Code / Name</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-command-line">
                  {centres.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-command-muted">Code: {c.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        {c.capacityUsedPct}% used ({c.activeCounters}/{c.totalCounters} counters)
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-leaf font-bold">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="mt-6 space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="rounded-xl border border-command-line bg-command-panel p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-cyan-signal">{log.action}</span>
                  <span className="text-[10px] text-command-muted">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm">
                  Actor: <span className="font-bold">{log.actorId || "System"}</span> ({log.actorRole || "none"})
                </div>
                <div className="mt-1 text-xs text-command-muted">
                  Target: {log.targetType} / {log.targetId}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
