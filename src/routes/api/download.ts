import { createFileRoute } from "@tanstack/react-router";

const FIREBASE_API_KEY = "AIzaSyBvXOonu12aqBPulGeQN2TOSFcbN9yg75M";
const PROJECT = "luo-acient-agent";
const ADMIN_EMAIL = "luoancientmovies40@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

function fileIdFrom(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

async function firestoreField(path: string, field: string): Promise<string | null> {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?key=${FIREBASE_API_KEY}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { fields?: Record<string, { stringValue?: string }> };
  return j.fields?.[field]?.stringValue ?? null;
}

// Streams an approved movie's Drive file as a same-page download (no new tab, no virus-scan page).
export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const movieId = url.searchParams.get("movie") ?? "";
        if (!token || !/^[\w-]+$/.test(movieId)) return new Response("Bad request", { status: 400 });

        const who = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
        const user = ((await who.json()) as { users?: { localId: string; email?: string }[] }).users?.[0];
        if (!who.ok || !user) return new Response("Unauthorized", { status: 401 });

        const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
        if (!isAdmin) {
          const status = await firestoreField(`download_requests/${movieId}_${user.localId}`, "status");
          if (status !== "approved") return new Response("Not approved", { status: 403 });
        }

        const link = await firestoreField(`movie_links/${movieId}`, "download_url");
        const fileId = link ? fileIdFrom(link) : null;
        if (!fileId) return new Response("No file", { status: 404 });

        const lovableKey = process.env["LOVABLE_API_KEY"];
        const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
        if (!lovableKey || !driveKey) return new Response("Drive not connected", { status: 500 });
        const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey };

        const meta = await fetch(`${GATEWAY_URL}/files/${fileId}?fields=name,mimeType,size&supportsAllDrives=true`, { headers });
        if (!meta.ok) {
          const body = await meta.text();
          console.error(`Drive meta failed [${meta.status}]: ${body}`);
          return new Response(`Drive error (${meta.status})`, { status: 502 });
        }
        const m = (await meta.json()) as { name?: string; mimeType?: string; size?: string };
        const file = await fetch(`${GATEWAY_URL}/files/${fileId}?alt=media&acknowledgeAbuse=true&supportsAllDrives=true`, { headers });
        if (!file.ok || !file.body) {
          const body = await file.text();
          console.error(`Drive download failed [${file.status}]: ${body}`);
          return new Response(`Drive error (${file.status})`, { status: 502 });
        }
        const name = (m.name ?? "movie.mp4").replace(/["\r\n]/g, "");
        const out = new Headers({
          "Content-Type": m.mimeType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
          "Cache-Control": "private, no-store",
        });
        if (m.size) out.set("Content-Length", m.size);
        return new Response(file.body, { headers: out });
      },
    },
  },
});
