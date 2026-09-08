import { createFileRoute } from "@tanstack/react-router";
import { RespotifyApp } from "@/components/respotify-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RespotifyApp />;
}
