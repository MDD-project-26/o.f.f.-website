// Shrinks a teardown frame for playback: drops titles, ids and names (the inline assembled SVG
// already carries the accessible description), and rewrites each path's absolute coordinates as
// relative ones at 1/100 of a unit. The viewBox is ~200 units wide and drawn at most ~580px, so
// that's well under a pixel. Deltas are taken between rounded points so errors never accumulate.
const format = (hundredths) => {
  const text = String(hundredths / 100);
  return text.replace(/^(-?)0\./, "$1.");
};

const slimPath = (d) => {
  let out = "";
  let last = "";
  let x = 0, y = 0, startX = 0, startY = 0;
  const pushNumbers = (values) => {
    for (const value of values) {
      const text = format(value);
      // A minus sign, or a leading dot after a number that already has one, separates by itself
      const needsSpace = /[\d.]$/.test(out) && !text.startsWith("-") && !(text.startsWith(".") && /\.\d*$/.test(out));
      out += (needsSpace ? " " : "") + text;
    }
  };
  for (const [, command, args] of d.matchAll(/([MCLZmclz])([^MCLZmclz]*)/g)) {
    const numbers = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map((n) => Math.round(Number(n) * 100));
    const upper = command.toUpperCase();
    if (command !== upper) throw new Error(`relative path command "${command}" not expected`);
    if (upper === "Z") {
      out += "z";
      last = "z";
      x = startX;
      y = startY;
      continue;
    }
    const size = upper === "C" ? 6 : 2;
    for (let i = 0; i < numbers.length; i += size) {
      const group = numbers.slice(i, i + size);
      const relative = group.map((value, j) => value - (j % 2 === 0 ? x : y));
      // The very first moveto stays absolute; everything after is relative
      const isFirst = out === "";
      const letter = isFirst ? "M" : upper === "M" && i > 0 ? "l" : upper.toLowerCase();
      if (letter !== last || letter === "M" || letter === "m") out += letter;
      last = letter === "M" ? "m" : letter;
      pushNumbers(isFirst ? group : relative);
      x = group[size - 2];
      y = group[size - 1];
      if (upper === "M" && i === 0) {
        startX = x;
        startY = y;
      }
    }
  }
  return out;
};

export const slimFrame = (markup) =>
  markup
    .replace(/<title>.*?<\/title>/g, "")
    .replace(/ (id|data-item|data-name)="[^"]*"/g, "")
    .replace(/ fill="none"/g, "")
    .replace(/ d="([^"]*)"/g, (_, d) => ` d="${slimPath(d)}"`);
