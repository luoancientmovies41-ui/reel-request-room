import { useState } from "react";
import { Film } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AuthCard() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="glass-strong w-full max-w-sm rounded-3xl p-7 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg">
          <Film className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-semibold">Milk Cinema</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "in" ? "Sign in to browse the library" : "Create your account"}
        </p>
        <div className="mt-6 space-y-3">
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
