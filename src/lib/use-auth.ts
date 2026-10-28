import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_EMAIL, fbAuth, fbDb } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(fbAuth(), async (u) => {
      setUser(u);
      const email = u?.email?.toLowerCase() ?? "";
      const admin = !!u && email === ADMIN_EMAIL;
      setIsAdmin(admin);
      if (u && !admin) {
        const snap = await getDoc(doc(fbDb(), "allowed_emails", email)).catch(() => null);
        setAllowed(!!snap?.exists());
      } else setAllowed(admin);
      setLoading(false);
    });
  }, []);

  return { user, loading, isAdmin, allowed };
}
