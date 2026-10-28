import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

function extractFileId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export const approveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) => {
    if (!input?.requestId || typeof input.requestId !== "string") throw new Error("Invalid request");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: req, error } = await supabase
      .from("download_requests")
      .select("id,user_email,movie_id")
      .eq("id", data.requestId)
      .single();
    if (error || !req) throw new Error("Request not found");

    const { data: link } = await supabase.from("movie_links").select("download_url").eq("movie_id", req.movie_id).maybeSingle();
    let shared = false;
    let shareError: string | null = null;
    const fileId = link?.download_url ? extractFileId(link.download_url) : null;

    if (fileId && link?.download_url.includes("drive.google.com")) {
      const lovableKey = process.env.LOVABLE_API_KEY;
      const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!lovableKey || !driveKey) throw new Error("Google Drive is not connected");
      const res = await fetch(`${GATEWAY_URL}/files/${fileId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": driveKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "user", emailAddress: req.user_email }),
      });
      if (res.ok) shared = true;
      else {
        const body = await res.text();
        console.error(`Drive share failed [${res.status}]: ${body}`);
        shareError = `Drive share failed (${res.status})`;
      }
    }

    if (fileId && !shared) return { ok: false, shared, shareError };

    const { error: upErr } = await supabase.from("download_requests").update({ status: "approved" }).eq("id", req.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, shared, shareError };
  });
