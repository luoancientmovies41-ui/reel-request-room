import { useEffect, useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import logo from "@/assets/logo.png.asset.json";

function isMobileDevice() {
  const ua = navigator.userAgent;
  const uaMobile = /Android|iPhone|iPod|iPad|Mobile|Opera Mini|IEMobile|webOS|BlackBerry/i.test(ua);
  // iPadOS reports as Mac but has touch.
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  // Allow the editor preview's mobile view so the owner can test.
  const preview = /lovable\.app$|lovableproject\.com$|localhost/.test(location.hostname) && window.innerWidth < 768;
  return uaMobile || ipad || preview;
}

export function MobileOnly({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => setOk(isMobileDevice());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (ok === null) return null;
  if (ok) return <>{children}</>;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-strong max-w-sm rounded-3xl p-8 text-center">
        <img src={logo.url} alt="Luo Ancient Agent" className="mx-auto h-28 w-28 object-contain" />
        <Smartphone className="mx-auto mt-4 h-8 w-8 text-primary" />
        <h1 className="mt-3 text-xl font-bold">Mobile only</h1>
        <p className="mt-2 text-sm text-muted-foreground">LUO ANCIENT AGENT works only on mobile phones. Please open this website on your phone.</p>
      </div>
    </div>
  );
}
