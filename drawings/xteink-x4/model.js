// Xteink X4 pocket e-reader. Outer size from published specs (114 × 69 × 5.9 mm);
// face layout estimated from product photos; internal layout illustrative.
// Device lies screen-up: x = width (+x is the right edge), y = length (+y is the top), z = thickness.
self.DrawingModels ??= {};
self.DrawingModels['xteink-x4'] = (parameters, options) => {
  const G = TechnicalGeometry;
  const W = 69, L = 114, T = 5.9, radius = 5.5;
  const frameDepth = 0.7, H = T - frameDepth, wall = 1, floor = 0.8;
  const window = {width: 56, length: 94, cy: 5}; // 4.3" 800 × 480 active area, 5 mm top bezel
  const chinY = -49.5; // centre of the front button row
  const bottom = -L / 2, right = W / 2;

  const stadium = (width, height, segments = 20) => {
    const r = height / 2, x = width / 2 - r, points = [];
    for (let i = 0; i <= segments; i++) {
      const t = -Math.PI / 2 + Math.PI * i / segments;
      points.push([x + r * Math.cos(t), r * Math.sin(t)]);
    }
    for (let i = 0; i <= segments; i++) {
      const t = Math.PI / 2 + Math.PI * i / segments;
      points.push([-x + r * Math.cos(t), r * Math.sin(t)]);
    }
    return points;
  };
  const disc = (r, n = 96) => Array.from({length: n}, (_, i) => [r * Math.cos(2 * Math.PI * i / n), r * Math.sin(2 * Math.PI * i / n)]);
  // Outline drawn just proud of a wall: bottom wall (y = bottom) uses [x, z]; right wall (x = right) uses [y, z]
  const onBottom = (profile, cx, cz) => profile.map(([u, v]) => [cx + u, bottom - 0.05, cz + v]);
  const onRight = (profile, cy, cz) => profile.map(([u, v]) => [right + 0.05, cy + u, cz + v]);

  const port = {z: 3.28, width: 8.94, height: 3.26};
  const sideKeys = [{y: 40, length: 8}, {y: 22, length: 16}]; // power, page rocker

  // Rear housing: one shell from the outer skin over the rim into the floor
  const housing = G.part('housing', 'Rear housing');
  const angles = G.ringAngles(W, L, radius);
  G.loft(housing, [
    G.roundedRing(W, L, radius, {z: 0, angles}),
    G.roundedRing(W, L, radius, {z: H, angles}),
    G.roundedRing(W - 2 * wall, L - 2 * wall, radius - wall, {z: H, angles}),
    G.roundedRing(W - 2 * wall, L - 2 * wall, radius - wall, {z: floor, angles}),
  ]);
  G.polyline(housing, onBottom(stadium(port.width + 0.5, port.height + 0.5), 0, port.z), {closed: true, role: 'outline'});
  G.polyline(housing, onBottom(stadium(12, 1.2), -18, 2.4), {closed: true, role: 'outline'});
  G.polyline(housing, onBottom(disc(0.5, 24), 16, 2.6), {closed: true, role: 'detail'});
  for (const key of sideKeys) G.polyline(housing, onRight(stadium(key.length + 0.6, 2), key.y, 2.9), {closed: true, role: 'detail'});

  // MagSafe-style magnet ring on the floor
  const magnets = G.part('magnets', 'Magnet ring');
  G.extrude(magnets, disc(27, 144), {depth: 0.4, holes: [disc(23, 144)]});
  G.transform(magnets, {origin: [0, 0, floor + 0.02]});

  // Battery pouch above the magnets
  const battery = G.part('battery', 'Battery, 650 mAh');
  G.box(battery, [-22, -35, 1.25], [22, 23, 3.85], {radius: 1});
  G.polyline(battery, [[-20, 19, 3.87], [20, 19, 3.87]], {role: 'detail'});

  // Logic board in the chin with the ESP32, USB-C and microSD
  const board = G.part('board', 'Logic board');
  G.box(board, [-30, -55.8, floor + 0.05], [30, -35.8, floor + 0.85], {radius: 1});
  const boardTop = floor + 0.85;
  const chip = G.part('chip', 'ESP32 processor');
  G.box(chip, [7.5, -45, boardTop], [12.5, -40, boardTop + 0.85], {radius: 0.3});
  G.circle(chip, [8.4, -44.1, boardTop + 0.87], 0.35, [0, 0, 1], {role: 'detail', segments: 24});
  const usb = G.part('usb', 'USB-C port');
  const sleeve = G.extrude(G.piece(), stadium(port.width, port.height), {depth: 7.3});
  // plane('xz') extrudes toward -y, so start at the back of the receptacle and end at the inner wall
  G.transform(sleeve, {origin: [0, bottom + wall + 7.3, port.z], ...G.plane('xz')});
  G.merge(usb, sleeve);
  G.polyline(usb, stadium(port.width - 1.2, port.height - 1.2).map(([x, z]) => [x, bottom + wall - 0.05, port.z + z]), {closed: true, role: 'detail'});
  const card = G.part('card', 'microSD slot');
  G.box(card, [-24, bottom + wall, boardTop], [-12, bottom + wall + 11, boardTop + 1.4], {radius: 0.4});
  G.polyline(card, [[-23, bottom + wall - 0.05, boardTop + 0.7], [-13, bottom + wall - 0.05, boardTop + 0.7]], {role: 'detail'});

  // E-paper panel under the front frame; its active area matches the window
  const display = G.part('display', 'E-paper display');
  G.box(display, [-30.5, window.cy - 50.5, H - 1.05], [30.5, window.cy + 50.5, H - 0.05], {radius: 1});
  G.polyline(display, G.roundedRectangle(window.width, window.length, 1, {center: [0, window.cy]}).map(([x, y]) => [x, y, H - 0.03]), {closed: true, role: 'detail'});

  // Two split rocker keys in the chin
  const keys = G.part('keys', 'Page buttons');
  for (const cx of [-14, 14]) {
    const key = G.extrude(G.piece(), stadium(23.2, 3), {depth: 1.2});
    G.transform(key, {origin: [cx, chinY, H - 0.2]});
    G.merge(keys, key);
    G.line(keys, [cx, chinY - 1.5, T + 0.32], [cx, chinY + 1.5, T + 0.32], 'detail');
  }

  // Side keys: power and page rocker on the right edge
  const side = G.part('side', 'Power and side rocker');
  for (const key of sideKeys) {
    const cap = G.extrude(G.piece(), stadium(key.length, 1.6), {depth: 0.9});
    G.transform(cap, {origin: [right - 0.5, key.y, 2.9], xAxis: [0, 1, 0], yAxis: [0, 0, 1], zAxis: [1, 0, 0]});
    G.merge(side, cap);
  }

  // Front frame: printed bezel around the display window, with slots for the page buttons
  const frame = G.part('frame', 'Front frame');
  const slot = (cx) => stadium(24, 3.6).map(([x, y]) => [cx + x, chinY + y]);
  G.extrude(frame, G.roundedRectangle(W, L, radius), {
    depth: frameDepth,
    holes: [G.roundedRectangle(window.width, window.length, 1, {center: [0, window.cy]}), slot(-14), slot(14)],
  });
  G.transform(frame, {origin: [0, 0, H]});

  magnets.explosion = [0, 0, 14];
  for (const p of [battery, board, chip, usb, card]) p.explosion = [0, 0, 42];
  display.explosion = [0, 0, 64];
  keys.explosion = [0, 0, 80];
  frame.explosion = [0, 0, 92];
  side.explosion = [12, 0, 0];

  return TechnicalProjection.render([housing, magnets, battery, board, chip, usb, card, display, keys, side, frame], {
    ...options,
    camera: {azimuth: -62, elevation: 28, roll: 0},
  });
};
