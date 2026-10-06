import { drawBackground, machineBeamOrigin } from './background.js';

const WIDTH = 640;
const HEIGHT = 360;
const INITIAL_POSITION = { x: 235, y: 302 };
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const ease = (value) => value * value * (3 - 2 * value);

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

const INK = '#161329';
const COAT = '#69508e';
const COAT_LIGHT = '#9273b2';
const COAT_DARK = '#382a58';
const SKIN = '#e6a672';
const SKIN_LIGHT = '#ffd2a0';

function drawUpperBody(ctx, stride, crouch, blink) {
  const armSwing = Math.round(stride * 4);
  // Back arm and a visible cream cuff.
  polygon(ctx, [[-8, -46], [-13, -42], [-17, -31 + armSwing], [-12, -27 + armSwing], [-8, -35], [-3, -41]], INK);
  polygon(ctx, [[-8, -44], [-11, -41], [-14, -32 + armSwing], [-11, -31 + armSwing], [-7, -37]], COAT_DARK);
  rect(ctx, '#d1ba99', -13, -31 + armSwing, 4, 3);
  rect(ctx, SKIN, -13, -28 + armSwing, 4, 4);

  // A long asymmetric coat gives the character a distinctive silhouette.
  polygon(ctx, [[-8, -48], [4, -48], [10, -40], [9, -29], [13, -18], [3, -16], [-1, -21], [-10, -17], [-13, -23], [-11, -36]], INK);
  polygon(ctx, [[-7, -46], [3, -46], [7, -39], [6, -28], [10, -20], [4, -19], [0, -25], [-8, -19], [-10, -23], [-8, -36]], COAT);
  polygon(ctx, [[-8, -44], [-5, -44], [-6, -32], [-8, -23], [-9, -24]], COAT_LIGHT);
  polygon(ctx, [[-3, -44], [3, -44], [4, -36], [2, -30], [-1, -31]], '#efd3a6');
  polygon(ctx, [[-4, -46], [0, -43], [-3, -35], [-6, -39]], '#a887c1');
  polygon(ctx, [[3, -45], [7, -41], [3, -36], [1, -42]], '#b895cc');
  rect(ctx, '#342a3d', -2, -29, 8, 3);
  rect(ctx, '#d49c57', 2, -29, 2, 2);
  rect(ctx, COAT_DARK, -5, -24, 3, 4);
  rect(ctx, COAT_LIGHT, 5, -24, 2, 3);

  if (crouch > 0.15) {
    // Reach for the tiny screw while crouching.
    const reach = Math.round(crouch * 15);
    polygon(ctx, [[5, -43], [10, -40], [13, -29], [18, -20 + reach], [14, -17 + reach], [9, -27], [4, -35]], INK);
    polygon(ctx, [[6, -41], [8, -39], [11, -28], [16, -20 + reach], [14, -19 + reach], [8, -28]], COAT_LIGHT);
    rect(ctx, '#ecd4ac', 14, -20 + reach, 4, 3);
    rect(ctx, SKIN_LIGHT, 14, -17 + reach, 5, 4);
  } else {
    polygon(ctx, [[4, -45], [9, -43], [12, -35 - armSwing], [11, -26 - armSwing], [6, -25 - armSwing], [6, -34], [2, -39]], INK);
    polygon(ctx, [[5, -43], [7, -42], [9, -34 - armSwing], [8, -29 - armSwing], [7, -29 - armSwing], [6, -35]], COAT_LIGHT);
    rect(ctx, '#ead1a5', 6, -29 - armSwing, 5, 3);
    polygon(ctx, [[7, -26 - armSwing], [11, -26 - armSwing], [12, -22 - armSwing], [8, -20 - armSwing], [6, -23 - armSwing]], SKIN);
    rect(ctx, SKIN_LIGHT, 8, -25 - armSwing, 2, 3);
  }

  // Angular nose, expressive eye and tousled hair, all drawn from scratch.
  rect(ctx, INK, -1, -51, 7, 7);
  rect(ctx, SKIN, 0, -51, 4, 6);
  polygon(ctx, [[-6, -62], [3, -65], [9, -60], [10, -55], [14, -53], [12, -50], [8, -49], [6, -45], [0, -45], [-5, -50]], INK);
  polygon(ctx, [[-4, -60], [3, -62], [7, -59], [7, -54], [12, -52], [10, -51], [6, -51], [5, -47], [0, -47], [-3, -51]], SKIN);
  rect(ctx, SKIN_LIGHT, 2, -58, 4, 5);
  rect(ctx, SKIN_LIGHT, 7, -53, 4, 2);
  rect(ctx, '#b77658', -2, -49, 4, 2);
  rect(ctx, INK, 6, -56, 2, blink ? 1 : 3);
  if (!blink) rect(ctx, '#fff0cc', 5, -56, 1, 2);
  rect(ctx, '#7d4a46', 4, -49, 3, 1);
  rect(ctx, SKIN_LIGHT, -4, -55, 3, 4);
  rect(ctx, '#b9754a', -3, -53, 1, 2);
  polygon(ctx, [[-7, -61], [-4, -65], [1, -66], [4, -65], [8, -63], [8, -59], [4, -60], [1, -58], [-3, -58], [-3, -53], [-6, -54]], '#6b392e');
  polygon(ctx, [[-5, -62], [-2, -64], [3, -64], [6, -62], [2, -62], [-1, -60]], '#b87642');
  rect(ctx, '#d7a158', -2, -64, 4, 1);
  rect(ctx, '#925137', -5, -60, 2, 3);
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
    polygon(ctx, [[-5, -23], [-1, -22], [-4, -14], [-9, -12], [-7, -4], [-9, -5], [-10, -12]], '#303b52');
    polygon(ctx, [[1, -25], [7, -25], [12, -13], [6, -5], [7, -2], [2, -2], [0, -9], [6, -15]], INK);
    polygon(ctx, [[3, -23], [6, -23], [10, -14], [4, -8], [4, -3], [2, -6], [2, -10], [7, -15]], '#4e5770');
    rect(ctx, INK, -10, -3, 9, 3);
    rect(ctx, INK, 2, -3, 11, 3);
  } else {
    polygon(ctx, [[-7, -25], [0, -25], [0, -15], [-4 + left, -2 - liftLeft], [-9 + left, -2 - liftLeft], [-7, -15]], INK);
    polygon(ctx, [[-6, -23], [-2, -23], [-3, -14], [-5 + left, -4 - liftLeft], [-7 + left, -4 - liftLeft], [-5, -15]], '#35435a');
    polygon(ctx, [[0, -25], [7, -24], [8, -14], [8 - left, -2 - liftRight], [3 - left, -2 - liftRight], [1, -14]], INK);
    polygon(ctx, [[2, -23], [5, -23], [6, -14], [6 - left, -4 - liftRight], [4 - left, -4 - liftRight], [3, -14]], '#57627b');
    polygon(ctx, [[-9 + left, -5 - liftLeft], [-4 + left, -5 - liftLeft], [1 + left, -2 - liftLeft], [1 + left, -liftLeft], [-10 + left, -liftLeft]], INK);
    polygon(ctx, [[3 - left, -5 - liftRight], [8 - left, -5 - liftRight], [12 - left, -2 - liftRight], [12 - left, -liftRight], [2 - left, -liftRight]], INK);
    rect(ctx, '#747a8c', -7 + left, -3 - liftLeft, 5, 1);
    rect(ctx, '#9490a0', 5 - left, -3 - liftRight, 5, 1);
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
    const end = { x: characterX + facing * 2, y: characterY - 35 };
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
      position = {
        x: current.from.x + (current.to.x - current.from.x) * progress,
        y: current.from.y + (current.to.y - current.from.y) * progress,
      };
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

    const scale = 0.88 + ((position.y - 275) / 63) * 0.16;
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
      const to = {
        x: clamp(Number.isFinite(x) ? x : position.x, 35, 610),
        y: clamp(Number.isFinite(y) ? y : position.y, 275, 338),
      };
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
      position = {
        x: clamp(Number.isFinite(x) ? x : position.x, 35, 610),
        y: clamp(Number.isFinite(y) ? y : position.y, 275, 338),
      };
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
