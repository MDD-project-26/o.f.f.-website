// Demo updates, newest first. Listed on /demo; each has its own page at /demo/<slug>.
// TODO: placeholder rows (an update every two days, one version step each) until the real updates exist,
// along with their names, previews and content.
export type Update = {
  slug: string;
  date: string;
  name: string;
  version: string;
  /** Shown open on touch screens, which have no hover to open a row */
  featured?: boolean;
};

const ROWS = 44;
const pad = (n: number) => String(n).padStart(2, "0");

export const updates: Update[] = Array.from({ length: ROWS }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 12 - index * 2));
  const step = ROWS - 1 - index; // 43 for the newest, 0 for the oldest
  const version = `00.${Math.floor(step / 10)}.${pad(step % 10)}`;
  return {
    slug: `v${version.replaceAll(".", "-")}`,
    date: `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`,
    name: "Name of the update",
    version,
    // The second row is open, as in the design
    featured: index === 1,
  };
});

export const updateHref = (update: Update) => `/demo/${update.slug}`;
