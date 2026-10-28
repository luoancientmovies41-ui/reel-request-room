import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { AuthCard } from "@/components/AuthCard";
import { useServerFn } from "@tanstack/react-start";
import { approveRequest } from "@/lib/drive.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Milk Cinema" },
      { name: "description", content: "Manage movies, access emails and download requests." },
      { property: "og:title", content: "Admin Dashboard — Milk Cinema" },
      { property: "og:description", content: "Manage movies, access emails and download requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab = "requests" | "movies" | "emails";
const field = "glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const primaryBtn = "w-full rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg active:scale-[0.98] disabled:opacity-60";

function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("requests");
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <AuthCard />;
  if (!isAdmin)
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="glass-strong rounded-3xl p-7 text-center text-sm">Admins only. <Link to="/" className="text-primary">Go back</Link></div>
      </div>
    );
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-3 pb-16">
      <header className="glass sticky top-3 z-20 mt-3 flex items-center gap-3 rounded-2xl px-4 py-3">
        <Link to="/" className="glass flex h-9 w-9 items-center justify-center rounded-xl" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
      </header>
      <div className="glass mt-4 grid grid-cols-3 gap-1 rounded-2xl p-1">
        {(["requests", "movies", "emails"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-xs font-semibold capitalize transition ${tab === t ? "glass-strong text-primary" : "text-muted-foreground"}`}>
            {t === "emails" ? "Access" : t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "requests" && <Requests />}
        {tab === "movies" && <Movies />}
        {tab === "emails" && <Emails />}
      </div>
    </div>
  );
}

type ReqRow = { id: string; user_email: string; status: string; created_at: string; movies: { title: string } | null };

function Requests() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("download_requests").select("id,user_email,status,created_at,movies(title)").order("created_at", { ascending: false });
    setRows((data as ReqRow[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const approve = useServerFn(approveRequest);
  const set = async (id: string, status: string) => {
    if (status === "approved") {
      try {
        const r = await approve({ data: { requestId: id } });
        if (!r.ok) { toast.error(r.shareError ?? "Could not share Drive file"); return; }
        toast.success(r.shared ? "Approved — Drive file shared with user" : "Approved — user can download");
      } catch (e) { toast.error((e as Error).message); return; }
      load();
      return;
    }
    const { error } = await supabase.from("download_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Declined");
    load();
  };
  if (!rows.length) return <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No requests yet.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{r.movies?.title}</p>
            <p className="truncate text-xs text-muted-foreground">{r.user_email}</p>
          </div>
          {r.status === "pending" ? (
            <>
              <button onClick={() => set(r.id, "approved")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-primary-foreground" aria-label="Approve"><Check className="h-4 w-4" /></button>
              <button onClick={() => set(r.id, "rejected")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground" aria-label="Decline"><X className="h-4 w-4" /></button>
            </>
          ) : (
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${r.status === "approved" ? "text-success" : "text-destructive"} glass`}>{r.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}

type MovieRow = { id: string; title: string; poster_url: string };

function Movies() {
  const [list, setList] = useState<MovieRow[]>([]);
  const [f, setF] = useState({ title: "", poster_url: "", download_url: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("movies").select("id,title,poster_url").order("created_at", { ascending: false });
    setList(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.from("movies").insert({
      title: f.title, poster_url: f.poster_url,
    }).select("id").single();
    if (error || !data) { setBusy(false); toast.error(error?.message ?? "Failed"); return; }
    const { error: e2 } = await supabase.from("movie_links").insert({ movie_id: data.id, download_url: f.download_url });
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Movie uploaded");
    setF({ title: "", poster_url: "", download_url: "" });
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this movie?")) return;
    await supabase.from("movies").delete().eq("id", id);
    load();
  };
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass-strong space-y-3 rounded-3xl p-4">
        <h2 className="font-semibold">Upload movie by link</h2>
        <input className={field} placeholder="Title" required value={f.title} onChange={up("title")} />
        <input className={field} type="url" placeholder="Poster image link" required value={f.poster_url} onChange={up("poster_url")} />
        <input className={field} type="url" placeholder="Download link" required value={f.download_url} onChange={up("download_url")} />
        <button disabled={busy} className={primaryBtn}>{busy ? "Uploading…" : "Upload movie"}</button>
      </form>
      <div className="grid grid-cols-3 gap-2">
        {list.map((m) => (
          <div key={m.id} className="glass relative overflow-hidden rounded-xl p-1">
            <img src={m.poster_url} alt={m.title} className="aspect-[2/3] w-full rounded-lg object-cover" />
            <p className="truncate px-0.5 pb-1 pt-1.5 text-[10px] font-semibold leading-snug">{m.title}</p>
            <button onClick={() => del(m.id)} className="glass-strong absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-destructive" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Emails() {
  const [list, setList] = useState<{ email: string }[]>([]);
  const [email, setEmail] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("allowed_emails").select("email").order("created_at", { ascending: false });
    setList(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("allowed_emails").insert({ email: email.trim().toLowerCase() });
    if (error) { toast.error(error.message); return; }
    setEmail(""); toast.success("Access granted"); load();
  };
  const remove = async (em: string) => { await supabase.from("allowed_emails").delete().eq("email", em); load(); };
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="glass-strong flex gap-2 rounded-3xl p-3">
        <input className={field} type="email" required placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="shrink-0 rounded-2xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground">Add</button>
      </form>
      {list.map((x) => (
        <div key={x.email} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="truncate text-sm">{x.email}</span>
          <button onClick={() => remove(x.email)} className="text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
