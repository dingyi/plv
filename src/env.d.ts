/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Soft gate for /admin (hashed into the client bundle at build). */
  readonly ADMIN_PASSWORD?: string;
  readonly SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
