// Суратҳо: агар NEXT_PUBLIC_FILES_URL муқаррар бошад (Supabase: "https://…supabase.co/storage/v1/object/public/uploads"),
// "/uploads/..." мустақим аз он гирифта мешавад — тез ва бе backend. Вагарна тавассути backend (base).
const FILES_URL = process.env.NEXT_PUBLIC_FILES_URL?.replace(/\/+$/, "");

export const toFileUrl = (base: string, path: string) =>
  FILES_URL && path.startsWith("/uploads/") ? `${FILES_URL}${path.slice("/uploads".length)}` : `${base}${path}`;
