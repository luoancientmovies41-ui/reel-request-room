import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { ADMIN_EMAIL, fbAuth, fbDb } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let unsubAllowed: (() => void) | null = null;
    const unsub = onAuthStateChanged(fbAuth(), (u) => {
      unsubAllowed?.();
      unsubAllowed = null;
      setUser(u);
      const email = u?.email?.toLowerCase() ?? "";
      const admin = !!u && email === ADMIN_EMAIL;
      setIsAdmin(admin);
      if (u && !admin) {
        // Live: access appears the moment the admin adds this email.
        unsubAllowed = onSnapshot(
          doc(fbDb(), "allowed_emails", email),
          (snap) => { setAllowed(snap.exists()); setLoading(false); },
          () => { setAllowed(false); setLoading(false); },
        );
      } else { setAllowed(admin); setLoading(false); }
    });
    return () => { unsub(); unsubAllowed?.(); };
  }, []);

  return { user, loading, isAdmin, allowed };
}
