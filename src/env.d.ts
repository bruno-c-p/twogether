/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: "development" | "production" | "test";
      CLERK_SECRET_KEY: string;
      CLERK_PUBLISHABLE_KEY?: string;
      BUDGET_DATABASE_PATH?: string;
      TURSO_DATABASE_URL?: string;
      TURSO_AUTH_TOKEN?: string;
      E2E_PORT?: string;
    }
  }
}

export {};
