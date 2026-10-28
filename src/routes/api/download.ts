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

        const check = url.searchParams.get("check") === "1";
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];

        let body: ReadableStream | null = null;
        let name = "movie.mp4";
        let type = "application/octet-stream";
        let size: string | null = null;

        // 1) Connected Drive account (files it owns or that are shared with it).
        if (lovableKey && driveKey) {
          const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey };
          const meta = await fetch(`${GATEWAY_URL}/files/${fileId}?fields=name,mimeType,size&supportsAllDrives=true`, { headers });
          if (meta.ok) {
            const m = (await meta.json()) as { name?: string; mimeType?: string; size?: string };
            if (check) return Response.json({ ok: true });
            const file = await fetch(`${GATEWAY_URL}/files/${fileId}?alt=media&acknowledgeAbuse=true&supportsAllDrives=true`, { headers });
            if (file.ok && file.body) {
              body = file.body; name = m.name ?? name; type = m.mimeType ?? type; size = m.size ?? null;
            } else console.error(`Drive download failed [${file.status}]: ${await file.text()}`);
          } else console.error(`Drive meta failed [${meta.status}]: ${await meta.text()}`);
        }

        // 2) Any other Drive account: works when the file is shared "Anyone with the link".
        if (!body) {
          const pub = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`, { redirect: "follow" });
          const ct = pub.headers.get("content-type") ?? "";
          if (!pub.ok || !pub.body || ct.includes("text/html")) {
            await pub.body?.cancel();
            const msg = "This video's Drive file isn't public. In Google Drive set sharing to “Anyone with the link”.";
            return check ? Response.json({ ok: false, error: msg }) : new Response(msg, { status: 403 });
          }
          if (check) { await pub.body.cancel(); return Response.json({ ok: true }); }
          const cd = pub.headers.get("content-disposition") ?? "";
          const fn = cd.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? cd.match(/filename="([^"]+)"/)?.[1];
          if (fn) name = decodeURIComponent(fn);
          body = pub.body; type = ct || type; size = pub.headers.get("content-length");
        }

        name = name.replace(/["\r\n]/g, "");
        const out = new Headers({
          "Content-Type": type,
          "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
          "Cache-Control": "private, no-store",
        });
        if (size) out.set("Content-Length", size);
        return new Response(body, { headers: out });
      },
    },
  },
});
