import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const ADMIN_EMAIL = "luoancientmovies40@gmail.com";
const FIREBASE_API_KEY = "AIzaSyBvXOonu12aqBPulGeQN2TOSFcbN9yg75M";

// Shares a Drive file (owned by / shareable from the connected Drive account) with a user.
export const shareDriveFile = createServerFn({ method: "POST" })
  .inputValidator((input: { idToken: string; fileId: string; email: string }) => {
    if (!input?.idToken || !/^[\w-]+$/.test(input.fileId ?? "") || !/^\S+@\S+$/.test(input.email ?? ""))
      throw new Error("Invalid request");
    return input;
  })
  .handler(async ({ data }) => {
    // Verify the caller is the admin via Firebase.
    const who = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: data.idToken }),
    });
    const whoJson = (await who.json()) as { users?: { email?: string }[] };
    if (!who.ok || whoJson.users?.[0]?.email?.toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
    if (!lovableKey || !driveKey) return { ok: false, error: "Google Drive is not connected" };

    const res = await fetch(`${GATEWAY_URL}/files/${data.fileId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "user", emailAddress: data.email }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Drive share failed [${res.status}]: ${body}`);
      return { ok: false, error: `Drive share failed (${res.status})` };
    }
    return { ok: true, error: null };
  });
