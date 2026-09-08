import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchLiveUser } from "@/lib/spotify/live";
import { exchangeCode, parseState } from "@/lib/spotify/pkce";
import { readSession, writeSession } from "@/lib/spotify/session";
import type { Session } from "@/lib/spotify/types";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
});

function CallbackPage() {
  const { code, state, error, error_description } = Route.useSearch();
  const [message, setMessage] = useState("Finishing Spotify login…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (error) {
        setMessage(error_description || error);
        return;
      }
      if (!code) {
        setMessage("Missing authorization code.");
        return;
      }
      const parsed = parseState(state ?? sessionStorage.getItem("respotify.pkce.state"));
      if (!parsed) {
        setMessage("Login state was lost. Go back and connect again.");
        return;
      }
      try {
        const tokens = await exchangeCode(code, parsed.role);
        const session: Session = {
          role: parsed.role,
          mode: "live",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          user: { id: "pending", displayName: "…" },
        };
        writeSession(session);
        const user = await fetchLiveUser(parsed.role);
        const other = parsed.role === "source" ? readSession("destination") : readSession("source");
        if (other?.user?.id && other.user.id === user.id) {
          sessionStorage.removeItem(`respotify.${parsed.role}`);
          throw new Error(
            "That is the same Spotify account. Tap Not you on Spotify's login screen and sign into the other one.",
          );
        }
        writeSession({ ...session, user });
        if (!cancelled) window.location.replace("/");
      } catch (err) {
        if (!cancelled) setMessage(err instanceof Error ? err.message : "Login failed.");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [code, state, error, error_description]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-fg">
      <p className="max-w-sm text-center text-sm text-muted">{message}</p>
    </main>
  );
}
