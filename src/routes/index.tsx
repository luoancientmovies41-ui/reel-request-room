import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, LogOut, Shield, X, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Milk Cinema — Movie Library" },
      { name: "description", content: "Browse movies and request downloads in a liquid glass cinema." },
      { property: "og:title", content: "Milk Cinema — Movie Library" },
      { property: "og:description", content: "Browse movies and request downloads in a liquid glass cinema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Movie = { id: string; title: string; description: string | null; poster_url: string; genre: string | null; year: number | null };
type Req = { movie_id: string; status: string };

function Index() {
  const { user, loading, isAdmin, allowed } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [reqs, setReqs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Movie | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: m }, { data: r }] = await Promise.all([
      supabase.from("movies").select("id,title,description,poster_url,genre,year").order("created_at", { ascending: false }),
      supabase.from("download_requests").select("movie_id,status").eq("user_id", user!.id),
    ]);
    setMovies(m ?? []);
    setReqs(Object.fromEntries(((r ?? []) as Req[]).map((x) => [x.movie_id, x.status])));
  }, [user]);

  useEffect(() => { if (user && allowed) load(); }, [user, allowed, load]);

  useEffect(() => {
    setLink(null);
    if (open && reqs[open.id] === "approved") {
      supabase.from("movie_links").select("download_url").eq("movie_id", open.id).maybeSingle()
        .then(({ data }) => setLink(data?.download_url ?? null));
    }
  }, [open, reqs]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <AuthCard />;

  if (!allowed)
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="glass-strong max-w-sm rounded-3xl p-7 text-center">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Access pending</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email} isn't on the access list yet. Ask the admin to add your email.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-5 rounded-2xl glass px-5 py-2 text-sm">Sign out</button>
        </div>
      </div>
    );

  const request = async (m: Movie) => {
    const { error } = await supabase.from("download_requests").insert({ movie_id: m.id, user_email: user.email! });
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent to admin");
    setReqs((p) => ({ ...p, [m.id]: "pending" }));
  };

  const status = open ? reqs[open.id] : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-3 pb-16">
      <header className="glass sticky top-3 z-20 mt-3 flex items-center justify-between rounded-2xl px-4 py-3">
        <h1 className="text-lg font-semibold">Milk<span className="text-primary">Cinema</span></h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="glass flex h-9 w-9 items-center justify-center rounded-xl" aria-label="Admin"><Shield className="h-4 w-4" /></Link>
          )}
          <button onClick={() => supabase.auth.signOut()} className="glass flex h-9 w-9 items-center justify-center rounded-xl" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      <p className="mt-6 px-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Library · {movies.length}</p>
      {movies.length === 0 ? (
        <div className="glass mt-3 rounded-2xl p-8 text-center text-sm text-muted-foreground">No movies yet.</div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {movies.map((m, i) => (
            <button key={m.id} onClick={() => setOpen(m)} style={{ animationDelay: `${i * 40}ms` }}
              className="glass group relative overflow-hidden rounded-xl p-1 text-left transition active:scale-95 animate-in fade-in slide-in-from-bottom-2 fill-mode-both">
              <img src={m.poster_url} alt={m.title} loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" />
              <p className="truncate px-0.5 pb-1 pt-1.5 text-[10px] font-semibold leading-snug">{m.title}</p>
              {reqs[m.id] === "approved" && <span className="absolute right-1.5 top-1.5 rounded-full bg-success p-1 text-primary-foreground"><Download className="h-2.5 w-2.5" /></span>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm animate-in fade-in sm:items-center" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass-strong relative w-full max-w-sm rounded-3xl p-4 animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
            <button onClick={() => setOpen(null)} className="glass absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full" aria-label="Close"><X className="h-4 w-4" /></button>
            <div className="flex gap-4">
              <img src={open.poster_url} alt={open.title} className="aspect-[2/3] w-28 rounded-2xl object-cover shadow-lg" />
              <div className="min-w-0 flex-1 pt-1 pr-6">
                <h2 className="text-lg font-semibold leading-tight">{open.title}</h2>
                {(open.year || open.genre) && <p className="mt-1 text-xs text-muted-foreground">{[open.year, open.genre].filter(Boolean).join(" · ")}</p>}
                {open.description && <p className="mt-2 line-clamp-5 text-xs text-muted-foreground">{open.description}</p>}
              </div>
            </div>
            <div className="mt-4">
              {status === "approved" ? (
                link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3 text-sm font-semibold text-primary-foreground shadow-lg">
                    <Download className="h-4 w-4" /> Download now
                  </a>
                ) : <p className="text-center text-xs text-muted-foreground">Loading link…</p>
              ) : status === "pending" ? (
                <div className="glass flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium"><Clock className="h-4 w-4 text-warning" /> Waiting for admin approval</div>
              ) : status === "rejected" ? (
                <div className="glass w-full rounded-2xl py-3 text-center text-sm text-destructive">Request declined</div>
              ) : (
                <button onClick={() => request(open)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg active:scale-[0.98]">
                  <Download className="h-4 w-4" /> Request download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
