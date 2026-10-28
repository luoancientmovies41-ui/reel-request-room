import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (u) {
        const [{ data: admin }, { data: ok }] = await Promise.all([
          supabase.rpc("has_role", { _user_id: u.id, _role: "admin" }),
          supabase.rpc("is_allowed"),
        ]);
        setIsAdmin(!!admin);
        setAllowed(!!ok);
      } else {
        setIsAdmin(false);
        setAllowed(false);
      }
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(session?.user ?? null), 0);
      }
    });
    supabase.auth.getUser().then(({ data }) => load(data.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading, isAdmin, allowed };
}
