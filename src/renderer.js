import { drawBackground, machineBeamOrigin } from './background.js';

const WIDTH = 640;
const HEIGHT = 360;
const INITIAL_POSITION = { x: 235, y: 302 };
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const ease = (value) => value * value * (3 - 2 * value);

// The walking surface follows the illustrated stone pier, including its inset
// beside the machine. Clicks on the sea or cliff project to the nearest edge.
const WALKABLE_DOCK = [
  [100, 280], [200, 254], [390, 235], [438, 286], [605, 299],
  [620, 325], [560, 328], [340, 316], [140, 294],
];

function confineToDock(x, y) {
  let inside = false;
  let nearest = null;
  let nearestDistance = Infinity;
  for (let i = 0; i < WALKABLE_DOCK.length; i += 1) {
    const [ax, ay] = WALKABLE_DOCK[i];
    const [bx, by] = WALKABLE_DOCK[(i + 1) % WALKABLE_DOCK.length];
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) {
      inside = !inside;
    }
    const dx = bx - ax;
    const dy = by - ay;
    const along = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const edge = { x: ax + dx * along, y: ay + dy * along };
    const distance = (x - edge.x) ** 2 + (y - edge.y) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = edge;
    }
  }
  return inside ? { x, y } : nearest;
}

// Scanline polygons keep the small original sprites on a strict pixel grid.
function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  const top = Math.floor(Math.min(...points.map((point) => point[1])));
  const bottom = Math.ceil(Math.max(...points.map((point) => point[1])));
  for (let y = top; y < bottom; y += 1) {
    const intersections = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) {
        intersections.push(x1 + ((y + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const left = Math.ceil(intersections[i] - 0.5);
      const right = Math.ceil(intersections[i + 1] - 0.5);
      ctx.fillRect(left, y, right - left, 1);
    }
  }
}

function rect(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function pixelLine(ctx, x1, y1, x2, y2, color, thickness = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    ctx.fillRect(
      Math.round(x1 + (x2 - x1) * progress - thickness / 2),
      Math.round(y1 + (y2 - y1) * progress - thickness / 2),
      thickness,
      thickness,
    );
  }
}

const INK = '#0d1128';
const SHIRT = '#eee5b7';
const SHIRT_LIGHT = '#fff0bf';
const SHIRT_DARK = '#c4bd9a';
const PANTS = '#15172f';
const PANTS_LIGHT = '#333a55';
const SKIN = '#e7a674';
const SKIN_LIGHT = '#ffce98';

function drawUpperBody(ctx, stride, crouch, blink) {
  const armSwing = Math.round(stride * 4);
  // A rolled sleeve and exposed forearm swing behind the narrow shirt.
  polygon(ctx, [[-7, -47], [-12, -43], [-15, -34 + armSwing], [-14, -27 + armSwing], [-10, -24 + armSwing], [-7, -28 + armSwing], [-10, -34], [-3, -42]], INK);
  polygon(ctx, [[-7, -44], [-10, -42], [-12, -35 + armSwing], [-8, -34 + armSwing], [-5, -40]], SHIRT_DARK);
  rect(ctx, SHIRT_LIGHT, -12, -36 + armSwing, 5, 3);
  polygon(ctx, [[-12, -32 + armSwing], [-9, -32 + armSwing], [-10, -28 + armSwing], [-8, -26 + armSwing], [-11, -25 + armSwing], [-13, -28 + armSwing]], SKIN);
  rect(ctx, '#bd7d59', -12, -30 + armSwing, 1, 3);

  // The open collar, tucked shirt and uneven folds are an original design.
  polygon(ctx, [[-7, -48], [4, -48], [8, -42], [6, -32], [7, -26], [-7, -26], [-8, -33], [-10, -42]], INK);
  polygon(ctx, [[-6, -46], [3, -46], [6, -41], [4, -33], [5, -28], [-5, -28], [-6, -34], [-8, -41]], SHIRT);
  polygon(ctx, [[-6, -45], [-4, -42], [-5, -36], [-3, -28], [-6, -28], [-7, -38]], SHIRT_DARK);
  polygon(ctx, [[-2, -43], [4, -42], [3, -33], [4, -30], [0, -30], [-1, -35]], SHIRT_LIGHT);
  polygon(ctx, [[-3, -47], [0, -43], [-2, -39], [-5, -43]], SHIRT_LIGHT);
  polygon(ctx, [[3, -47], [6, -44], [3, -40], [1, -44]], SHIRT_LIGHT);
  polygon(ctx, [[-1, -46], [2, -46], [1, -40], [-1, -41]], '#bd8358');
  rect(ctx, '#a09b82', 0, -37, 1, 2);
  rect(ctx, '#b6ae8c', 1, -33, 1, 2);
  rect(ctx, '#857c66', -5, -29, 3, 1);
  rect(ctx, '#2c2430', -7, -27, 14, 3);
  rect(ctx, '#b68f55', 1, -27, 3, 3);
  rect(ctx, '#e7ca81', 2, -27, 1, 2);

  if (crouch > 0.15) {
    // At full crouch the fingertips meet the screw, just above the feet.
    const reach = Math.round(crouch);
    polygon(ctx, [[4, -44], [9, -41], [12, -32], [13, -24], [13, -20 + reach], [10, -17 + reach], [7, -19 + reach], [8, -25], [7, -31], [3, -36]], INK);
    polygon(ctx, [[5, -42], [7, -40], [10, -33], [7, -32], [4, -37]], SHIRT);
    rect(ctx, SHIRT_LIGHT, 7, -33, 5, 3);
    polygon(ctx, [[8, -29], [11, -30], [11, -23], [11, -19 + reach], [8, -18 + reach], [7, -21 + reach], [9, -24]], SKIN);
    rect(ctx, SKIN_LIGHT, 9, -21 + reach, 3, 3);
  } else {
    polygon(ctx, [[3, -46], [8, -43], [11, -35 - armSwing], [10, -27 - armSwing], [12, -24 - armSwing], [9, -21 - armSwing], [6, -23 - armSwing], [6, -33], [1, -40]], INK);
    polygon(ctx, [[4, -44], [7, -41], [9, -35 - armSwing], [5, -34 - armSwing], [4, -38]], SHIRT_LIGHT);
    rect(ctx, SHIRT_DARK, 5, -35 - armSwing, 5, 3);
    rect(ctx, SHIRT_LIGHT, 6, -35 - armSwing, 3, 1);
    polygon(ctx, [[6, -31 - armSwing], [9, -32 - armSwing], [8, -27 - armSwing], [10, -24 - armSwing], [9, -23 - armSwing], [7, -24 - armSwing], [6, -27 - armSwing]], SKIN);
    rect(ctx, SKIN_LIGHT, 7, -30 - armSwing, 1, 4);
  }

  // Angular nose, expressive eye and tousled hair, all drawn from scratch.
  rect(ctx, INK, -1, -51, 7, 7);
  rect(ctx, SKIN, 0, -51, 4, 6);
  polygon(ctx, [[-6, -62], [3, -65], [9, -60], [10, -55], [14, -53], [12, -50], [8, -49], [6, -45], [0, -45], [-5, -50]], INK);
  polygon(ctx, [[-4, -60], [3, -62], [7, -59], [7, -54], [12, -52], [10, -51], [6, -51], [5, -47], [0, -47], [-3, -51]], SKIN);
  rect(ctx, SKIN_LIGHT, 2, -58, 4, 5);
  rect(ctx, SKIN_LIGHT, 7, -53, 4, 2);
  rect(ctx, '#b77658', -2, -49, 4, 2);
  rect(ctx, '#73442d', 5, -58, 3, 1);
  rect(ctx, INK, 6, -56, 2, blink ? 1 : 3);
  if (!blink) rect(ctx, '#fff0cc', 5, -56, 1, 2);
  rect(ctx, '#713e37', 4, -49, 4, 1);
  rect(ctx, SKIN_LIGHT, 4, -48, 3, 1);
  rect(ctx, SKIN_LIGHT, -4, -55, 3, 4);
  rect(ctx, '#b9754a', -3, -53, 1, 2);
  polygon(ctx, [[-7, -61], [-5, -64], [-2, -66], [3, -66], [5, -65], [9, -63], [8, -60], [5, -59], [2, -61], [-1, -59], [-3, -57], [-3, -53], [-6, -54]], '#86522d');
  polygon(ctx, [[-5, -62], [-2, -65], [3, -65], [6, -63], [7, -61], [3, -62], [0, -60], [-3, -59]], '#bd7933');
  polygon(ctx, [[-2, -65], [2, -65], [5, -63], [2, -63], [-1, -62]], '#edc168');
  rect(ctx, '#d89844', -5, -60, 2, 3);
}

function drawSkeleton(ctx, stride) {
  const left = Math.round(stride * 5);
  rect(ctx, '#b5fcff', -3, -60, 10, 10);
  rect(ctx, '#fffaf1', -2, -60, 7, 7);
  rect(ctx, '#142b4e', 2, -57, 2, 3);
  rect(ctx, '#142b4e', 6, -55, 2, 2);
  rect(ctx, '#d7ffff', 0, -49, 3, 23);
  for (let y = -44; y < -32; y += 4) {
    rect(ctx, '#d7ffff', -4, y, 12, 2);
    rect(ctx, '#7fecf3', -6, y, 2, 3);
    rect(ctx, '#7fecf3', 8, y, 2, 3);
  }
  pixelLine(ctx, -3, -43, -11, -27, '#e9ffff', 2);
  pixelLine(ctx, 7, -43, 12, -25, '#e9ffff', 2);
  pixelLine(ctx, 0, -25, -4 - left, -13, '#e9ffff', 3);
  pixelLine(ctx, -4 - left, -13, -4 + left, -2, '#e9ffff', 2);
  pixelLine(ctx, 4, -25, 8 + left, -13, '#e9ffff', 3);
  pixelLine(ctx, 8 + left, -13, 7 - left, -2, '#e9ffff', 2);
}

function drawCharacterSprite(ctx, { stride = 0, crouch = 0, blink = false, skeleton = false }) {
  const left = Math.round(stride * 5);
  const liftLeft = Math.max(0, Math.round(stride * 3));
  const liftRight = Math.max(0, Math.round(-stride * 3));
  if (crouch > 0) {
    polygon(ctx, [[-6, -25], [2, -22], [-1, -12], [-7, -9], [-4, -3], [-9, -2], [-12, -12], [-7, -18]], INK);
    polygon(ctx, [[-5, -23], [-1, -22], [-4, -14], [-9, -12], [-7, -4], [-9, -5], [-10, -12]], PANTS);
    rect(ctx, PANTS_LIGHT, -7, -18, 2, 4);
    polygon(ctx, [[1, -25], [7, -25], [12, -13], [6, -5], [7, -2], [2, -2], [0, -9], [6, -15]], INK);
    polygon(ctx, [[3, -23], [6, -23], [10, -14], [4, -8], [4, -3], [2, -6], [2, -10], [7, -15]], PANTS_LIGHT);
    rect(ctx, INK, -10, -3, 9, 3);
    rect(ctx, INK, 2, -3, 11, 3);
  } else {
    polygon(ctx, [[-7, -25], [0, -25], [0, -15], [-4 + left, -2 - liftLeft], [-9 + left, -2 - liftLeft], [-7, -15]], INK);
    polygon(ctx, [[-6, -23], [-2, -23], [-3, -14], [-5 + left, -4 - liftLeft], [-7 + left, -4 - liftLeft], [-5, -15]], PANTS);
    pixelLine(ctx, -5, -22, -5 + left, -10 - liftLeft, '#2a3049');
    polygon(ctx, [[0, -25], [7, -24], [8, -14], [8 - left, -2 - liftRight], [3 - left, -2 - liftRight], [1, -14]], INK);
    polygon(ctx, [[2, -23], [5, -23], [6, -14], [6 - left, -4 - liftRight], [4 - left, -4 - liftRight], [3, -14]], PANTS_LIGHT);
    polygon(ctx, [[-9 + left, -9 - liftLeft], [-4 + left, -9 - liftLeft], [-4 + left, -4 - liftLeft], [1 + left, -2 - liftLeft], [1 + left, -liftLeft], [-10 + left, -liftLeft]], INK);
    polygon(ctx, [[3 - left, -9 - liftRight], [8 - left, -9 - liftRight], [8 - left, -4 - liftRight], [12 - left, -2 - liftRight], [12 - left, -liftRight], [2 - left, -liftRight]], INK);
    rect(ctx, '#33384c', -8 + left, -8 - liftLeft, 3, 1);
    rect(ctx, '#44455c', 4 - left, -8 - liftRight, 3, 1);
    rect(ctx, '#535969', -7 + left, -3 - liftLeft, 5, 1);
    rect(ctx, '#65677c', 5 - left, -3 - liftRight, 5, 1);
  }
  ctx.save();
  ctx.translate(Math.round(crouch * 5), Math.round(crouch * 14));
  drawUpperBody(ctx, stride, crouch, blink);
  ctx.restore();
  if (skeleton) {
    ctx.globalAlpha = 0.96;
    drawSkeleton(ctx, stride);
    ctx.globalAlpha = 1;
  }
}

/** Draw the dock and animate the original protagonist; all game rules live elsewhere. */
export function createRenderer(canvas, { getState, onWalkEnd, onDeathComplete } = {}) {
  const ctx = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  ctx.imageSmoothingEnabled = false;
  const sprite = document.createElement('canvas');
  sprite.width = 64;
  sprite.height = 80;
  const spriteCtx = sprite.getContext('2d');
  spriteCtx.imageSmoothingEnabled = false;

  let position = { ...INITIAL_POSITION };
  let facing = 1;
  let animation = null;
  let corpse = false;
  let destroyed = false;
  let frameId = null;

  const readState = () => typeof getState === 'function' ? (getState() ?? {}) : {};
  const isDead = (state) => Boolean(state?.flags?.dead || state?.dead || corpse);

  function cancelAnimation() {
    const cancelled = animation;
    animation = null;
    if (cancelled) cancelled.resolve(false);
  }

  function beginAnimation(kind, duration, extra = {}) {
    cancelAnimation();
    if (destroyed) return Promise.resolve(false);
    return new Promise((resolve) => {
      animation = { kind, duration, start: performance.now(), resolve, ...extra };
    });
  }

  function completeAnimation(current) {
    if (animation !== current) return;
    animation = null;
    if (current.kind === 'death') corpse = true;
    current.resolve(true);
    if (current.kind === 'walk') onWalkEnd?.({ ...position });
    if (current.kind === 'death') onDeathComplete?.();
  }

  function drawCharge(elapsed) {
    const origin = machineBeamOrigin;
    const energy = clamp(elapsed / 600, 0, 1);
    const pulse = Math.sin(elapsed / 48);
    const radius = Math.round(7 + energy * 16 + pulse * 2);
    for (let i = 0; i < 16; i += 1) {
      const angle = (i * Math.PI * 2) / 16 + elapsed / 480;
      const x = Math.round(origin.x + Math.cos(angle) * radius);
      const y = Math.round(origin.y + Math.sin(angle) * radius * 0.8);
      rect(ctx, i % 3 ? '#56dde9' : '#e6ffff', x, y, 2, 2);
    }
    if (energy > 0.45) {
      rect(ctx, '#bcffff', origin.x - 2, origin.y - 6, 4, 12);
      rect(ctx, '#bcffff', origin.x - 6, origin.y - 2, 12, 4);
      rect(ctx, '#fffbe9', origin.x - 2, origin.y - 2, 4, 4);
    }
  }

  function drawBeam(elapsed, characterX, characterY) {
    const origin = machineBeamOrigin;
    const end = { x: characterX + facing * 2, y: characterY - 40 };
    const flicker = Math.floor(elapsed / 36) % 2;
    ctx.save();
    ctx.globalAlpha = 0.2;
    pixelLine(ctx, origin.x, origin.y, end.x, end.y, '#5deafa', 21 + flicker * 3);
    ctx.globalAlpha = 0.65;
    pixelLine(ctx, origin.x, origin.y, end.x, end.y, '#39c7e8', 9 + flicker * 2);
    ctx.globalAlpha = 1;
    pixelLine(ctx, origin.x, origin.y, end.x, end.y, '#a4ffff', 5);
    pixelLine(ctx, origin.x, origin.y, end.x, end.y, '#ffffff', 2);
    for (let i = 0; i < 9; i += 1) {
      const angle = (i * Math.PI * 2) / 9 + elapsed / 85;
      const length = 9 + ((i * 7 + Math.floor(elapsed / 30)) % 18);
      pixelLine(ctx, end.x, end.y, end.x + Math.cos(angle) * length, end.y + Math.sin(angle) * length, i % 2 ? '#ddffff' : '#58d6ff', 2);
    }
    ctx.restore();
  }

  function draw(time) {
    if (destroyed) return;
    const state = readState();
    const current = animation;
    const elapsed = current ? Math.max(0, time - current.start) : 0;
    let stride = 0;
    let crouch = 0;
    let skeleton = false;
    let rotation = 0;
    let x = position.x;
    let y = position.y;
    let showBody = !current && isDead(state);
    let firing = false;

    if (current?.kind === 'walk') {
      const progress = clamp(elapsed / current.duration, 0, 1);
      position = confineToDock(
        current.from.x + (current.to.x - current.from.x) * progress,
        current.from.y + (current.to.y - current.from.y) * progress,
      );
      x = position.x;
      y = position.y;
      // Eight deliberately discrete poses give the animation its 1990s rhythm.
      stride = Math.sin((Math.floor(elapsed / 82) % 8) * Math.PI / 4);
      y -= Math.abs(stride) > 0.65 ? 1 : 0;
      if (progress === 1) completeAnimation(current);
    } else if (current?.kind === 'pickup') {
      const progress = clamp(elapsed / current.duration, 0, 1);
      crouch = progress < 0.38 ? ease(progress / 0.38)
        : progress < 0.65 ? 1 : 1 - ease((progress - 0.65) / 0.35);
      if (progress === 1) completeAnimation(current);
    } else if (current?.kind === 'death') {
      if (elapsed >= 580 && elapsed < 1300) {
        x += (Math.floor(elapsed / 30) % 3 - 1) * 2;
        y -= Math.floor(elapsed / 48) % 2;
        skeleton = Math.floor(elapsed / 64) % 2 === 0;
        firing = elapsed < 1060;
        stride = Math.sin(Math.floor(elapsed / 40) * 2) * 0.8;
      }
      if (elapsed >= 1300) {
        const fall = ease(clamp((elapsed - 1300) / 570, 0, 1));
        rotation = (Math.PI / 2) * fall;
        x += 8 * fall;
        y -= 11 * fall;
      }
      if (elapsed >= current.duration) {
        completeAnimation(current);
        showBody = true;
      }
    } else if (!showBody) {
      y -= Math.floor(time / 620) % 2;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    drawBackground(ctx, time / 1000, {
      ...state,
      rendererFx: {
        charging: current?.kind === 'death' ? clamp(elapsed / 580, 0, 1) : 0,
        fired: current?.kind === 'death' && elapsed >= 580,
      },
    });

    if (showBody) {
      rotation = Math.PI / 2;
      x = position.x + 8;
      y = position.y - 11;
    }

    // A stepped shadow anchors the feet to the dock without blurred edges.
    ctx.save();
    ctx.globalAlpha = 0.42;
    const shadowWidth = showBody || rotation > 0.7 ? 43 : 15;
    rect(ctx, '#080e1b', position.x - shadowWidth, position.y - 2, shadowWidth * 2, 4);
    rect(ctx, '#080e1b', position.x - shadowWidth + 4, position.y + 2, shadowWidth * 2 - 8, 2);
    ctx.restore();

    spriteCtx.setTransform(1, 0, 0, 1, 0, 0);
    spriteCtx.clearRect(0, 0, sprite.width, sprite.height);
    spriteCtx.translate(30, 70);
    drawCharacterSprite(spriteCtx, {
      stride,
      crouch,
      skeleton,
      blink: !current && !showBody && Math.floor(time / 140) % 31 === 0,
    });

    const scale = 1.08 + ((position.y - 275) / 63) * 0.14;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    // Both the fall and walking direction are reflected as a complete sprite.
    ctx.scale(facing, 1);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(sprite, -30, -70);
    ctx.restore();

    if (current?.kind === 'death') {
      if (elapsed < 1060) drawCharge(elapsed);
      if (firing) drawBeam(elapsed, x, y);
      if (elapsed >= 580 && elapsed < 720) {
        ctx.save();
        ctx.globalAlpha = (1 - (elapsed - 580) / 140) * 0.5;
        rect(ctx, '#d0fcff', 0, 0, WIDTH, HEIGHT);
        ctx.restore();
      }
    }
    frameId = requestAnimationFrame(draw);
  }

  frameId = requestAnimationFrame(draw);

  return {
    walkTo(x, y) {
      if (destroyed || isDead(readState())) return Promise.resolve(false);
      const to = confineToDock(
        Number.isFinite(x) ? x : position.x,
        Number.isFinite(y) ? y : position.y,
      );
      const distance = Math.hypot(to.x - position.x, to.y - position.y);
      if (Math.abs(to.x - position.x) > 1) facing = to.x > position.x ? 1 : -1;
      if (distance < 1) {
        cancelAnimation();
        position = to;
        onWalkEnd?.({ ...position });
        return Promise.resolve(true);
      }
      return beginAnimation('walk', Math.max(160, distance / 98 * 1000), { from: { ...position }, to });
    },
    pickup() {
      if (destroyed || isDead(readState())) return Promise.resolve(false);
      facing = 1;
      return beginAnimation('pickup', 720);
    },
    die() {
      corpse = false;
      facing = 1;
      return beginAnimation('death', 1970);
    },
    reset() {
      cancelAnimation();
      corpse = false;
      facing = 1;
      position = { ...INITIAL_POSITION };
    },
    setPosition(x, y) {
      cancelAnimation();
      position = confineToDock(
        Number.isFinite(x) ? x : position.x,
        Number.isFinite(y) ? y : position.y,
      );
    },
    getPosition() {
      return { ...position };
    },
    destroy() {
      destroyed = true;
      cancelAnimation();
      if (frameId !== null) cancelAnimationFrame(frameId);
    },
  };
}
