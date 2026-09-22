import { loadEnv } from "vite";
import { parseClientEnv } from "@/lib/env";

const env: Record<string, string | undefined> = {
  ...loadEnv("production", process.cwd(), "VITE_"),
};
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("VITE_")) env[key] = value;
}

try {
  parseClientEnv(env);
  console.log("Client environment variables validated.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
