// The painted scenery and the interactive sprites share a 640 × 360 canvas.
// Small native-pixel effects animate the water and the chronoscope without
// obscuring the background illustration.
export const machineBeamOrigin = Object.freeze({ x: 521, y: 208 });

let backdrop;
let backdropReady = false;

function loadBackdrop() {
  if (backdrop || typeof Image === 'undefined') return;
  backdrop = new Image();
  backdrop.onload = () => { backdropReady = true; };
  backdrop.src = new URL('../assets/harbor-night.png', import.meta.url).href;
}

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function line(ctx, x1, y1, x2, y2, color, size = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  if (!steps) { rect(ctx, x1, y1, size, size, color); return; }
  for (let i = 0; i <= steps; i++) {
    rect(ctx, x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, size, size, color);
  }
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry))));
    rect(ctx, cx - span, cy + y, span * 2 + 1, 1, color);
  }
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  const first = Math.floor(Math.min(...points.map(point => point[1])));
  const last = Math.ceil(Math.max(...points.map(point => point[1])));
  for (let y = first; y <= last; y++) {
    const crossings = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        crossings.push(ax + (y - ay) * (bx - ax) / (by - ay));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i < crossings.length; i += 2) {
      const x = Math.ceil(crossings[i]);
      ctx.fillRect(x, y, Math.floor(crossings[i + 1]) - x + 1, 1);
    }
  }
}

function drawWater(ctx, time) {
  // Only a few broken crests brighten at a time. These stay in the exposed
  // water, clear of the stone walkway and the timber railing.
  const crests = [
    [23, 170, 7], [51, 178, 10], [96, 173, 9], [138, 182, 6],
    [16, 187, 11], [74, 194, 12], [119, 189, 7], [159, 193, 6],
    [31, 203, 9], [93, 203, 10], [15, 217, 7], [55, 213, 7],
  ];
  ctx.save();
  for (let i = 0; i < crests.length; i++) {
    const [x, y, width] = crests[i];
    const phase = Math.sin(time * .85 + i * 1.71);
    if (phase < .15) continue;
    ctx.globalAlpha = .12 + phase * .13;
    const drift = Math.floor(Math.sin(time * .4 + i) * 2);
    rect(ctx, x + drift, y, width, 1, i % 3 ? '#436bc4' : '#b5cee8');
    rect(ctx, x + drift + 3, y + 1, Math.max(2, width - 5), 1, '#6794d9');
  }
  ctx.restore();
}

function drawMachinePulse(ctx, time, state) {
  const charge = Math.max(0, Math.min(1, state.rendererFx?.charging || 0));
  const fired = !!state.rendererFx?.fired;
  const strength = fired ? charge * .2 : charge;
  const pulse = (Math.sin(time * (strength > 0 ? 11 : 2.1)) + 1) / 2;
  ctx.save();

  // Transparent stepped ovals fit inside the luminous glass cylinder, rather
  // than creating a flat rectangle over the painted machinery.
  ctx.globalAlpha = .018 + pulse * .024 + strength * .13;
  ellipse(ctx, 521, 178, 28, 49, '#75ffd3');
  ctx.globalAlpha = .016 + pulse * .016 + strength * .1;
  ellipse(ctx, 521, 181, 19, 42, '#d5ffdc');

  // Reflections travel along two existing edges of the glass.
  ctx.globalAlpha = .1 + pulse * .12 + strength * .32;
  const streakY = 137 + Math.floor((time * 7) % 62);
  line(ctx, 490, streakY, 490, streakY + 11, '#c9ffec');
  line(ctx, 551, 182, 551, 192, '#9dffe1');
  rect(ctx, 515, 115, 14, 1, '#d1fff0');

  // The projector's light comes from the shared ray origin. It stays subtle
  // while idle and gathers energy during the actual death animation.
  if (strength > 0) {
    ctx.globalAlpha = strength * .24;
    ellipse(ctx, machineBeamOrigin.x, machineBeamOrigin.y, 9, 7, '#f1fff0');
    ctx.globalAlpha = .35 + strength * .35;
    const count = Math.ceil(strength * 9);
    for (let i = 0; i < count; i++) {
      const angle = time * 3.8 + i * .69;
      const radius = 25 - strength * 11;
      const x = 521 + Math.round(Math.cos(angle) * radius);
      const y = 208 + Math.round(Math.sin(angle) * radius * .8);
      rect(ctx, x, y, 1, 2, i % 3 ? '#afffe3' : '#f6ffdc');
    }
  }

  // Rare idle sparks appear on the cylinder, not all around the scene.
  ctx.globalAlpha = .45;
  for (let i = 0; i < 3; i++) {
    const phase = time * .62 + i * 2.2;
    if (Math.sin(phase) < .94) continue;
    const x = 499 + i * 17;
    const y = 154 + i * 22;
    rect(ctx, x, y, 1, 3, '#aeffe3');
    rect(ctx, x - 1, y + 1, 3, 1, '#aeffe3');
  }
  ctx.restore();
}

function drawScrew(ctx, time) {
  // An original silver sprite with a dark outline; readable against blue stone.
  ellipse(ctx, 319, 306, 11, 2, '#111b42');
  line(ctx, 315, 304, 324, 299, '#203052', 4);
  line(ctx, 315, 303, 323, 298, '#b3c7d2', 3);
  line(ctx, 316, 302, 323, 298, '#f1edcf');
  for (const [x, y] of [[317, 303], [319, 301], [321, 300]]) {
    rect(ctx, x, y, 1, 3, '#60768c');
  }
  poly(ctx, [[310, 300], [312, 297], [317, 298], [319, 302], [317, 305], [313, 304]], '#324b69');
  poly(ctx, [[310, 299], [312, 296], [317, 297], [318, 300], [316, 303], [312, 302]], '#e6e6d2');
  line(ctx, 312, 298, 316, 301, '#465b77');
  rect(ctx, 323, 298, 3, 2, '#f3f0d9');
  if (Math.sin(time * 1.6) > .985) {
    rect(ctx, 328, 294, 1, 7, '#fff6cf');
    rect(ctx, 325, 297, 7, 1, '#fff6cf');
  }
}

export function drawBackground(ctx, time = 0, state = {}) {
  loadBackdrop();
  ctx.imageSmoothingEnabled = false;
  if (backdropReady) {
    ctx.drawImage(backdrop, 0, 0, 640, 360);
    drawWater(ctx, time);
    drawMachinePulse(ctx, time, state);
  } else {
    // One brief loading frame; no obsolete scene can flash behind the new art.
    rect(ctx, 0, 0, 640, 360, '#040d37');
    rect(ctx, 0, 160, 640, 90, '#0d1c59');
    poly(ctx, [[0, 270], [390, 230], [640, 270], [640, 360], [0, 360]], '#14245b');
  }
  if (!state.flags?.screwTaken) drawScrew(ctx, time);
}
