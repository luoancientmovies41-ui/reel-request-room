import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { driveFileId, fbAuth, fbDb } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";
import { AuthCard } from "@/components/AuthCard";
import { shareDriveFile } from "@/lib/drive.functions";

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

type ReqRow = { id: string; user_email: string; status: string; movie_id: string; movie_title: string };

function Requests() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const share = useServerFn(shareDriveFile);
  const load = useCallback(async () => {
    const s = await getDocs(query(collection(fbDb(), "download_requests"), orderBy("created_at", "desc")));
    setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReqRow, "id">) })));
  }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const set = async (r: ReqRow, status: string) => {
    try {
      if (status === "approved") {
        const link = (await getDoc(doc(fbDb(), "movie_links", r.movie_id))).data()?.["download_url"] as string | undefined;
        const fileId = link?.includes("drive.google.com") ? driveFileId(link) : null;
        if (fileId) {
          const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
          const res = await share({ data: { idToken, fileId, email: r.user_email } });
          if (res.ok) toast.success("Drive file shared with user");
          else toast.warning(`${res.error} — approved anyway (works if the file is shared "anyone with link")`);
        }
      }
      await updateDoc(doc(fbDb(), "download_requests", r.id), { status });
      toast.success(status === "approved" ? "Approved" : "Declined");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  if (!rows.length) return <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No requests yet.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{r.movie_title}</p>
            <p className="truncate text-xs text-muted-foreground">{r.user_email}</p>
          </div>
          {r.status === "pending" ? (
            <>
              <button onClick={() => set(r, "approved")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-success text-primary-foreground" aria-label="Approve"><Check className="h-4 w-4" /></button>
              <button onClick={() => set(r, "rejected")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground" aria-label="Decline"><X className="h-4 w-4" /></button>
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
    const s = await getDocs(query(collection(fbDb(), "movies"), orderBy("created_at", "desc")));
    setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovieRow, "id">) })));
  }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const ref = await addDoc(collection(fbDb(), "movies"), { title: f.title, poster_url: f.poster_url, created_at: Date.now() });
      await setDoc(doc(fbDb(), "movie_links", ref.id), { download_url: f.download_url });
      toast.success("Movie uploaded");
      setF({ title: "", poster_url: "", download_url: "" });
      load();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };
  const del = async (id: string) => {
    if (!confirm("Delete this movie?")) return;
    await Promise.all([deleteDoc(doc(fbDb(), "movies", id)), deleteDoc(doc(fbDb(), "movie_links", id))]);
    load();
  };
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass-strong space-y-3 rounded-3xl p-4">
        <h2 className="font-semibold">Upload movie by link</h2>
        <input className={field} placeholder="Title" required value={f.title} onChange={up("title")} />
        <input className={field} type="url" placeholder="Poster image link" required value={f.poster_url} onChange={up("poster_url")} />
        <input className={field} type="url" placeholder="Google Drive video link" required value={f.download_url} onChange={up("download_url")} />
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
  const [list, setList] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const load = useCallback(async () => {
    const s = await getDocs(collection(fbDb(), "allowed_emails"));
    setList(s.docs.map((d) => d.id));
  }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(fbDb(), "allowed_emails", email.trim().toLowerCase()), { created_at: Date.now() });
      setEmail(""); toast.success("Access granted"); load();
    } catch (err) { toast.error((err as Error).message); }
  };
  const remove = async (em: string) => { await deleteDoc(doc(fbDb(), "allowed_emails", em)); load(); };
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="glass-strong flex gap-2 rounded-3xl p-3">
        <input className={field} type="email" required placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="shrink-0 rounded-2xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground">Add</button>
      </form>
      {list.map((x) => (
        <div key={x} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="truncate text-sm">{x}</span>
          <button onClick={() => remove(x)} className="text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
