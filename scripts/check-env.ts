import { loadEnv } from "vite";
import { parseClientEnv } from "@/lib/env";

const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("VITE_")),
  ),
};

try {
  parseClientEnv(env);
  console.log("Client environment variables validated.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
