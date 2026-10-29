// o.f.f. device — concept teardown. All dimensions in millimetres, invented for illustration.
// Device lies screen-up: x = width, y = length (USB-C at -y), z = thickness.
self.DrawingModels ??= {};
self.DrawingModels.device = (parameters, options) => {
  const G = TechnicalGeometry;
  const bezel = parameters.bezel;
  if (!Number.isFinite(bezel) || bezel < 6 || bezel > 14) throw Error('Bezel must be 6–14 mm');

  const W = 50, L = 80, H = 10, wall = 1.5, floor = 1.5, radius = 8;
  const coverDepth = 1.5;
  const port = {width: 8.94, height: 3.26, z: 5.63}; // USB-C receptacle envelope, centred on x = 0

  const stadium = (width, height, cx = 0, cy = 0, segments = 24) => {
    const r = height / 2, x = width / 2 - r, points = [];
    for (let i = 0; i <= segments; i++) {
      const t = -Math.PI / 2 + Math.PI * i / segments;
      points.push([cx + x + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    for (let i = 0; i <= segments; i++) {
      const t = Math.PI / 2 + Math.PI * i / segments;
      points.push([cx - x + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return points;
  };

  // Rear housing: one shell from the outer skin over the rim into the cavity floor
  const housing = G.part('housing', 'Rear housing');
  const angles = G.ringAngles(W, L, radius);
  G.loft(housing, [
    G.roundedRing(W, L, radius, {z: 0, angles}),
    G.roundedRing(W, L, radius, {z: H, angles}),
    G.roundedRing(W - 2 * wall, L - 2 * wall, radius - wall, {z: H, angles}),
    G.roundedRing(W - 2 * wall, L - 2 * wall, radius - wall, {z: floor, angles}),
  ]);
  // Board standoffs, seated just below the cavity floor
  const posts = [[-17, -30], [17, -30], [-17, 30], [17, 30]];
  for (const [x, y] of posts) G.box(housing, [x - 2, y - 2, floor - 0.1], [x + 2, y + 2, 3], {radius: 2});
  // USB-C opening in the end wall, drawn just proud of the outer face
  const opening = stadium(port.width + 0.6, port.height + 0.6).map(([x, z]) => [x, -L / 2 - 0.05, port.z + z]);
  G.polyline(housing, opening, {closed: true, role: 'outline'});
  G.polyline(housing, stadium(port.width - 0.2, port.height - 0.6).map(([x, z]) => [x, -L / 2 - 0.05, port.z + z]), {closed: true, role: 'detail'});

  // Logic board resting on the standoffs
  const board = G.part('board', 'Logic board');
  G.box(board, [-22.5, -37.5, 3], [22.5, 37.5, 4], {radius: 5});
  for (const [x, y] of posts) G.circle(board, [x, y, 4.02], 1.2, [0, 0, 1], {role: 'detail'});

  // Processor package on the board
  const chip = G.part('chip', 'Processor');
  G.box(chip, [-6, -22, 4], [6, -10, 5.2], {radius: 0.6});
  G.polyline(chip, [[-4.5, -20.5, 5.22], [4.5, -20.5, 5.22], [4.5, -11.5, 5.22], [-4.5, -11.5, 5.22]], {closed: true, role: 'detail'});
  G.circle(chip, [-3.6, -19.6, 5.22], 0.5, [0, 0, 1], {role: 'detail', segments: 24});

  // USB-C receptacle soldered to the board's front edge
  const usb = G.part('usb', 'USB-C port');
  const sleeve = G.extrude(G.piece(), stadium(port.width, port.height), {depth: 7.4});
  // plane('xz') extrudes toward -y, so start at the back of the receptacle and end at the inner wall
  G.transform(sleeve, {origin: [0, -L / 2 + wall + 0.1 + 7.4, port.z], ...G.plane('xz')});
  G.merge(usb, sleeve);
  G.polyline(usb, stadium(port.width - 1.2, port.height - 1.2).map(([x, z]) => [x, -L / 2 + wall + 0.05, port.z + z]), {closed: true, role: 'detail'});
  G.polyline(usb, [[-2.6, -L / 2 + wall + 0.05, port.z], [2.6, -L / 2 + wall + 0.05, port.z]], {role: 'detail'});

  // Display module under the front cover; its active area matches the bezel window
  const screenW = W - 2 * bezel, screenL = L - 2 * bezel;
  const display = G.part('display', 'Display');
  G.box(display, [-screenW / 2 - 2, -screenL / 2 - 2, H - 1.6], [screenW / 2 + 2, screenL / 2 + 2, H - 0.05], {radius: 1});
  G.polyline(display, G.roundedRectangle(screenW, screenL, 2).map(([x, y]) => [x, y, H - 0.03]), {closed: true, role: 'detail'});

  // Front cover with the bezel window
  const cover = G.part('cover', 'Front cover');
  G.extrude(cover, G.roundedRectangle(W, L, radius), {depth: coverDepth, holes: [G.roundedRectangle(screenW, screenL, 2)]});
  G.transform(cover, {origin: [0, 0, H]});

  housing.explosion = [0, 0, 0];
  board.explosion = [0, 0, 22];
  chip.explosion = [0, 0, 22]; // soldered to the board, so it travels with it
  usb.explosion = [0, 0, 22];
  display.explosion = [0, 0, 50];
  cover.explosion = [0, 0, 72];

  return TechnicalProjection.render([housing, board, chip, usb, display, cover], {
    ...options,
    camera: {azimuth: -118, elevation: 28, roll: 0},
  });
};
