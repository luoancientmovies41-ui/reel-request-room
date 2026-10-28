import { useState } from "react";
import { Film } from "lucide-react";
import { toast } from "sonner";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { fbAuth } from "@/lib/firebase";
import logo from "@/assets/logo.png.asset.json";

export function AuthCard() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") await signInWithEmailAndPassword(fbAuth(), email, password);
      else await createUserWithEmailAndPassword(fbAuth(), email, password);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setBusy(false);
  };

  const google = async () => {
    try {
      await signInWithPopup(fbAuth(), new GoogleAuthProvider());
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="glass-strong w-full max-w-sm rounded-3xl p-7 animate-in fade-in zoom-in-95 duration-500">
        <img src={logo.url} alt="Luo Ancient Agent" className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-lg" />
        <div className="hidden">
          <Film className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-wide">LUO ANCIENT AGENT</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "in" ? "Sign in to browse the library" : "Create your account"}
        </p>
        <button type="button" onClick={google}
          className="glass mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition active:scale-[0.98]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
          Continue with Google
        </button>
        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-3">
          <input className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition active:scale-[0.98] disabled:opacity-60">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground">
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
