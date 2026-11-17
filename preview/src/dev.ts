/**
 * Development preview mode.
 *
 * `npm run dev` enables it automatically so the dashboard (and every feature
 * section) opens with sample data, without a backend or a signed-in session.
 * Production builds stay gated unless `VITE_DEV_PREVIEW=1` is set explicitly.
 */
export const devPreview =
  import.meta.env.DEV || import.meta.env.VITE_DEV_PREVIEW === "1"
