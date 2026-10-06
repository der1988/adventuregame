// Original hand-built pixel scenery. Every shape is drawn at the game's native
// resolution; the page can scale the result without smoothing its pixels.
export const machineBeamOrigin = Object.freeze({ x: 521, y: 208 });

const sceneCache = new WeakMap();

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function poly(ctx, points, color) {
  ctx.fillStyle = color;
  // Scanline filling deliberately avoids Canvas path antialiasing. Sloping
  // roofs, sails and dock boards should have authentic stair-stepped pixels.
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

function line(ctx, x1, y1, x2, y2, color, size = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    rect(ctx, x1 + dx * i / steps, y1 + dy * i / steps, size, size, color);
  }
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    rect(ctx, cx - span, cy + y, span * 2 + 1, 1, color);
  }
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function roofTiles(ctx, x, y, width, rows) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < width / 11; col++) {
      rect(ctx, x + col * 11 + (row % 2) * 5, y + row * 5, 8, 2,
        row % 3 ? '#332543' : '#49334e');
    }
  }
}

function window(ctx, x, y, w, h, tilt = 0) {
  poly(ctx, [[x - 3, y - 3], [x + w + 3, y - 4 + tilt], [x + w + 3, y + h + 3], [x - 3, y + h + 4]], '#11172c');
  rect(ctx, x, y, w, h, '#8d4639');
  rect(ctx, x + 2, y + 2, w - 4, h - 3, '#db9050');
  rect(ctx, x + 3, y + 3, Math.max(2, w - 7), 3, '#f8cc7a');
  rect(ctx, x + Math.floor(w / 2), y, 2, h, '#42344c');
  rect(ctx, x, y + Math.floor(h / 2), w, 2, '#493444');
  rect(ctx, x - 4, y + h + 2, w + 8, 3, '#665063');
}

function drawSky(ctx) {
  const rng = seededRandom(92);
  rect(ctx, 0, 0, 640, 360, '#13142d');
  rect(ctx, 0, 28, 640, 26, '#181730');
  rect(ctx, 0, 54, 640, 38, '#1c1b38');
  rect(ctx, 0, 92, 640, 49, '#242140');
  rect(ctx, 0, 141, 640, 49, '#2c2847');
  // Coarse color dithering softens the dusk bands while preserving hard pixels.
  for (let y = 50; y < 157; y += 4) {
    for (let x = (y % 8); x < 640; x += 14) {
      if (rng() > .58) rect(ctx, x, y, 2, 1, y < 92 ? '#24203f' : '#31284b');
    }
  }
  for (let i = 0; i < 74; i++) {
    const x = Math.floor(rng() * 640);
    const y = Math.floor(rng() * 122);
    rect(ctx, x, y, 1 + (i % 19 === 0 ? 1 : 0), 1, i % 4 ? '#707799' : '#aaaec0');
  }
  // A chipped ivory moon; its halo uses discrete palette steps.
  ellipse(ctx, 102, 54, 32, 30, '#272743');
  ellipse(ctx, 102, 54, 26, 25, '#35334d');
  ellipse(ctx, 102, 54, 21, 21, '#b5b8aa');
  ellipse(ctx, 100, 52, 19, 19, '#e3dcc0');
  ellipse(ctx, 101, 49, 17, 16, '#f2e7c8');
  ellipse(ctx, 92, 47, 3, 2, '#c3c2ad');
  ellipse(ctx, 105, 59, 5, 3, '#cecab3');
  rect(ctx, 99, 42, 3, 2, '#dbd8bc');
  rect(ctx, 111, 49, 4, 3, '#d5d2b9');
  // Narrow violet clouds pass behind the roofs and mast.
  poly(ctx, [[0,74],[26,74],[26,71],[54,71],[54,75],[77,75],[77,80],[146,80],[146,84],[0,84]], '#302944');
  rect(ctx, 12, 80, 86, 2, '#3a304b');
  poly(ctx, [[149,43],[191,43],[191,40],[225,40],[225,44],[271,44],[271,49],[302,49],[302,52],[163,52]], '#302945');
  rect(ctx, 179, 48, 74, 2, '#3d3050');
  poly(ctx, [[330,87],[358,87],[358,83],[411,83],[411,87],[463,87],[463,91],[524,91],[524,96],[357,96]], '#372b4c');
  rect(ctx, 383, 91, 90, 2, '#433152');
  poly(ctx, [[480,34],[517,34],[517,30],[550,30],[550,35],[588,35],[588,40],[640,40],[640,43],[491,43]], '#29243e');
  // The opposite shore and its faint lamps.
  poly(ctx, [[0,175],[19,166],[40,171],[68,158],[95,166],[124,159],[160,169],[197,153],[224,164],[255,155],[285,165],[333,150],[360,160],[391,151],[426,167],[461,157],[501,170],[528,164],[576,170],[616,158],[640,169],[640,196],[0,196]], '#181d35');
  for (let x = 13; x < 638; x += 29) {
    rect(ctx, x, 183 - (x % 3), 2, 2, '#9f775f');
  }
}

function drawWater(ctx) {
  const rng = seededRandom(210);
  rect(ctx, 0, 190, 640, 93, '#19273f');
  rect(ctx, 0, 204, 640, 20, '#1b2e49');
  rect(ctx, 0, 224, 640, 58, '#213450');
  for (let i = 0; i < 350; i++) {
    const x = Math.floor(rng() * 640);
    const y = 192 + Math.floor(rng() * 79);
    const width = 3 + Math.floor(rng() * (y < 222 ? 13 : 23));
    rect(ctx, x, y, width, 1, ['#2b4160','#304263','#172a43','#3c4160'][i % 4]);
    if (i % 8 === 0) rect(ctx, x + 3, y + 2, width - 2, 1, '#15283f');
  }
  for (let y = 190; y < 252; y += 5) {
    const wide = Math.floor(7 + (y - 188) * .49);
    const x = 103 - wide / 2 + (y % 11) - 4;
    rect(ctx, x, y, wide, 1, y % 3 ? '#53636d' : '#767777');
    if (wide > 10) rect(ctx, x + 5, y + 1, wide - 10, 1, '#444f63');
  }
  // Fragmented golden reflections from the old warehouse.
  for (const center of [264, 305, 373]) {
    for (let y = 197; y < 237; y += 5) {
      rect(ctx, center - 6 + (y % 7), y, 8 + (y % 8), 1, y % 2 ? '#865653' : '#5c4650');
    }
  }
}

function drawShip(ctx) {
  // A sleeping merchant schooner, built from a stepped dark hull and rigging.
  poly(ctx, [[2,177],[172,174],[165,184],[150,195],[38,199],[19,192]], '#10182d');
  line(ctx, 9, 178, 167, 176, '#485269', 2);
  line(ctx, 32, 189, 152, 186, '#22283e', 2);
  rect(ctx, 64, 170, 54, 8, '#20223a');
  rect(ctx, 73, 162, 38, 9, '#182036');
  rect(ctx, 80, 165, 5, 4, '#9a694e');
  rect(ctx, 97, 165, 5, 4, '#7e5146');
  rect(ctx, 68, 75, 3, 104, '#10172d');
  rect(ctx, 70, 80, 1, 94, '#3b3b50');
  rect(ctx, 125, 98, 2, 80, '#11182c');
  line(ctx, 17, 121, 108, 121, '#171a2e', 2);
  line(ctx, 95, 136, 159, 136, '#151b2f', 2);
  poly(ctx, [[67,87],[23,118],[26,120],[66,116]], '#292b42');
  poly(ctx, [[75,85],[78,115],[113,120],[105,105]], '#25273d');
  line(ctx, 72, 79, 9, 177, '#35364d');
  line(ctx, 73, 79, 157, 178, '#35364d');
  line(ctx, 126, 101, 167, 179, '#2e3349');
  line(ctx, 125, 101, 101, 178, '#2c3248');
  line(ctx, 31, 121, 27, 172, '#2c3148');
  line(ctx, 51, 121, 43, 174, '#272e45');
  line(ctx, 102, 122, 115, 173, '#292f45');
  line(ctx, 102, 136, 107, 174, '#2c3147');
  poly(ctx, [[72,78],[89,83],[72,87]], '#785253');
  rect(ctx, 148, 167, 1, 8, '#4e4050');
  rect(ctx, 145, 171, 5, 3, '#efb268');
}

function drawBuildings(ctx) {
  // Crooked waterfront silhouettes retain the comic, painted adventure feel.
  poly(ctx, [[174,161],[189,160],[189,99],[215,88],[239,104],[246,182],[177,187]], '#25233b');
  poly(ctx, [[184,100],[209,77],[215,77],[244,101],[244,107],[181,107]], '#181c31');
  line(ctx, 191, 98, 212, 81, '#4d3b50', 2);
  rect(ctx, 224, 72, 9, 24, '#28253d');
  rect(ctx, 222, 70, 12, 3, '#4d3e50');
  window(ctx, 198, 114, 13, 17);
  window(ctx, 224, 137, 11, 16);
  line(ctx, 178, 171, 244, 166, '#514050', 2);

  poly(ctx, [[241,111],[306,103],[324,198],[246,204]], '#433045');
  poly(ctx, [[231,112],[274,66],[312,102],[317,114]], '#241e36');
  poly(ctx, [[239,104],[272,73],[300,101],[304,105]], '#382b43');
  roofTiles(ctx, 255, 90, 41, 3);
  line(ctx, 235, 112, 310, 105, '#72505b', 2);
  line(ctx, 241, 113, 247, 198, '#72505b', 3);
  line(ctx, 305, 112, 321, 195, '#271e34', 4);
  line(ctx, 276, 111, 281, 198, '#302338', 3);
  line(ctx, 246, 151, 313, 145, '#2a2238', 4);
  line(ctx, 246, 154, 313, 148, '#705061');
  window(ctx, 253, 121, 15, 21, -1);
  window(ctx, 288, 117, 14, 21, -1);
  window(ctx, 258, 169, 15, 20);
  rect(ctx, 290, 166, 16, 34, '#1a1c31');
  rect(ctx, 292, 168, 12, 3, '#624052');
  rect(ctx, 301, 184, 2, 2, '#bf8056');
  // A sleepy leaning clock tower and neighboring tavern.
  poly(ctx, [[321,85],[343,82],[351,196],[326,198]], '#302a40');
  poly(ctx, [[314,86],[329,62],[338,61],[348,81]], '#1b1c30');
  line(ctx, 330, 62, 346, 81, '#625063');
  ellipse(ctx, 333, 104, 7, 8, '#655466');
  ellipse(ctx, 333, 104, 5, 6, '#c1a579');
  line(ctx, 333, 104, 331, 99, '#30283a');
  line(ctx, 333, 104, 337, 104, '#30283a');
  rect(ctx, 334, 144, 5, 15, '#121a2d');
  poly(ctx, [[346,130],[414,135],[414,207],[351,204]], '#3b3047');
  poly(ctx, [[340,130],[380,96],[423,136],[420,142],[342,135]], '#211f36');
  line(ctx, 347, 131, 378, 101, '#5a4056', 2);
  roofTiles(ctx, 365, 123, 48, 3);
  line(ctx, 350, 140, 412, 147, '#705065', 2);
  line(ctx, 348, 141, 354, 205, '#655064', 3);
  line(ctx, 383, 144, 383, 202, '#2a2337', 3);
  window(ctx, 359, 153, 14, 20);
  window(ctx, 391, 158, 12, 20);
  poly(ctx, [[354,181],[413,185],[426,195],[352,192]], '#202036');
  line(ctx, 354, 182, 412, 186, '#5b3b51', 2);
  rect(ctx, 363, 194, 12, 13, '#111a2c');
  rect(ctx, 396, 195, 10, 14, '#111a2c');
  // Tiny pier lamp and low background pilings.
  rect(ctx, 426, 178, 3, 33, '#141b2f');
  rect(ctx, 421, 175, 12, 3, '#493849');
  rect(ctx, 424, 165, 6, 11, '#a77a5d');
  rect(ctx, 425, 167, 4, 7, '#f4c279');
  rect(ctx, 422, 163, 10, 3, '#1a1c31');
  for (const x of [185, 229, 317, 361, 418]) {
    rect(ctx, x, 202, 6, 31, '#131c2e');
    rect(ctx, x, 202, 2, 27, '#3c3b52');
  }
  line(ctx, 173, 210, 440, 208, '#172032', 4);
  line(ctx, 171, 210, 440, 208, '#51404e');
}

function drawDeck(ctx) {
  poly(ctx, [[0,242],[394,220],[640,274],[640,360],[0,360]], '#211d30');
  poly(ctx, [[0,238],[394,215],[640,267],[640,353],[0,353]], '#534052');
  poly(ctx, [[0,242],[394,220],[640,272],[640,282],[0,260]], '#6b4d5a');
  line(ctx, 0, 238, 394, 215, '#a17270', 2);
  line(ctx, 394, 215, 640, 267, '#ae7970', 2);
  line(ctx, 0, 241, 394, 218, '#382c43', 2);
  // Perspective boards are wide at the bottom and finely spaced at the back.
  const boardLines = [233,244,258,275,295,319,346];
  for (let i = 0; i < boardLines.length; i++) {
    const y = boardLines[i];
    const bend = 391 - i * 26;
    const middleY = y - (i < 2 ? 14 : 8);
    line(ctx, 0, y + 10, bend, middleY, '#302639', 2);
    line(ctx, bend, middleY, 640, y + 37, '#302639', 2);
    line(ctx, 0, y + 12, bend, middleY + 2, '#80606a');
    line(ctx, bend, middleY + 2, 640, y + 39, '#80606a');
  }
  const rng = seededRandom(330);
  for (let i = 0; i < 295; i++) {
    const x = Math.floor(rng() * 640);
    const y = 242 + Math.floor(rng() * 107);
    const edge = x < 394 ? 238 - x * .058 : 215 + (x - 394) * .211;
    if (y < edge + 8) continue;
    const w = 2 + Math.floor(rng() * 27);
    rect(ctx, x, y, w, 1, ['#654959','#755262','#493748','#3f3142'][i % 4]);
    if (i % 7 === 0) rect(ctx, x + 3, y + 2, w / 2, 1, '#825d67');
  }
  // Staggered board joins, nail heads and weathered knots.
  for (const [x,y] of [[67,251],[192,245],[285,254],[440,254],[71,276],[178,280],[335,273],[532,292],[33,307],[236,310],[421,317],[146,347],[361,347],[590,335]]) {
    line(ctx, x, y - 4, x + 5, y + 12, '#302739', 2);
    rect(ctx, x - 4, y, 2, 2, '#aaa0a0');
    rect(ctx, x + 7, y + 8, 2, 2, '#98868c');
    rect(ctx, x - 4, y + 2, 2, 1, '#292538');
  }
  for (const [x,y] of [[162,261],[343,306],[65,332],[567,324]]) {
    ellipse(ctx,x,y,8,2,'#372b3e');
    rect(ctx,x-3,y,5,1,'#82616b');
  }
  // The visible front lip makes the scene feel like a small theatrical set.
  rect(ctx, 0, 352, 640, 8, '#262438');
  rect(ctx, 0, 352, 640, 2, '#755163');
  for (let x = 8; x < 640; x += 51) rect(ctx, x, 355, 2, 3, '#9f7376');
}

function drawCrate(ctx, x, y, width, height) {
  poly(ctx, [[x,y],[x+width,y-3],[x+width+12,y+4],[x+12,y+8]], '#71525b');
  poly(ctx, [[x+width,y-3],[x+width+12,y+4],[x+width+12,y+height],[x+width,y+height-3]], '#372b40');
  rect(ctx,x,y+5,width,height-5,'#573b49');
  for(let col=8;col<width;col+=9) rect(ctx,x+col,y+5,1,height-7,'#302639');
  rect(ctx,x,y+5,width,4,'#956564');
  rect(ctx,x,y+height-6,width,4,'#956564');
  rect(ctx,x+2,y+7,4,height-8,'#79525a');
  rect(ctx,x+width-6,y+7,4,height-8,'#79525a');
  line(ctx,x+5,y+10,x+width-5,y+height-9,'#b1766b',4);
  line(ctx,x+6,y+11,x+width-4,y+height-8,'#59404e');
  for(const dx of [3,width-5]) for(const dy of [9,height-6]) rect(ctx,x+dx,y+dy,2,2,'#252536');
}

function drawPierProps(ctx) {
  // Left foreground clutter leaves a generous central walking area.
  ellipse(ctx, 41, 284, 50, 8, '#322739');
  drawCrate(ctx, 3, 229, 43, 42);
  drawCrate(ctx, 33, 255, 47, 39);
  rect(ctx, 17, 241, 18, 8, '#483346');
  rect(ctx, 19, 243, 14, 4, '#c5a17b');
  rect(ctx, 22, 243, 1, 4, '#765260');
  rect(ctx, 28, 243, 1, 4, '#765260');
  // A barrel bound with pale steel hoops.
  ellipse(ctx, 111, 292, 24, 5, '#302638');
  poly(ctx, [[95,241],[123,241],[128,253],[128,279],[122,289],[94,289],[89,279],[89,253]], '#513442');
  for(let x=96;x<126;x+=6) line(ctx,x,247,x-2,285,'#845661',2);
  rect(ctx,91,250,36,4,'#24283c');
  rect(ctx,92,250,34,1,'#777786');
  rect(ctx,91,275,36,4,'#24283c');
  rect(ctx,92,275,34,1,'#777786');
  ellipse(ctx,108,242,15,5,'#956970');
  ellipse(ctx,108,242,12,3,'#503342');
  line(ctx,97,242,119,242,'#76525e');
  // Dock mooring posts, chipped caps and looped rope.
  for(const [x,y,h] of [[151,207,49],[433,204,45],[622,241,69]]) {
    rect(ctx,x-7,y+6,13,h,'#2d293d');
    rect(ctx,x-5,y+7,3,h-2,'#705465');
    rect(ctx,x+2,y+10,2,h-6,'#49384f');
    ellipse(ctx,x,y+5,8,4,'#91747a');
    ellipse(ctx,x,y+4,6,2,'#b2958b');
    rect(ctx,x-8,y+15,17,3,'#b29a83');
    rect(ctx,x-8,y+19,17,2,'#6c5660');
  }
  line(ctx,151,225,434,223,'#887180',2);
  line(ctx,151,228,293,237,'#544758',2);
  line(ctx,293,237,434,224,'#544758',2);
  // Coiled rope in the left foreground: concentric, broken pixel ovals.
  for(let i=0;i<5;i++) {
    ellipse(ctx, 177, 320, 23-i*4, 8-i, i%2?'#54404b':'#ad8972');
  }
  ellipse(ctx,177,320,4,2,'#3d3041');
  line(ctx,194,321,218,328,'#a78570',2);
  line(ctx,218,328,227,324,'#a78570',2);
  // A small bottle and crumpled sailcloth, just scenery.
  poly(ctx, [[18,300],[24,298],[25,291],[29,291],[30,303],[26,307],[20,307]], '#4a736a');
  rect(ctx,25,290,4,2,'#b39075');
  rect(ctx,22,300,2,5,'#86a897');
  poly(ctx, [[85,317],[94,312],[108,318],[116,316],[126,326],[111,330],[101,326],[89,327]], '#7c7380');
  line(ctx,93,316,109,327,'#a99a9c',2);
  line(ctx,107,320,116,324,'#514657');
}

function drawMachine(ctx) {
  // A brass chronoscope, with a deliberately crooked cabinet and horseshoe
  // resonator. The silhouette and all details are original artwork.
  ellipse(ctx, 521, 285, 69, 12, '#322b45');
  ellipse(ctx, 521, 278, 58, 9, '#304758');
  poly(ctx, [[457,266],[559,258],[586,270],[586,287],[454,294],[448,283],[448,273]], '#1c2234');
  poly(ctx, [[458,265],[559,258],[583,269],[478,281],[448,273]], '#526074');
  line(ctx,449,273,478,282,'#96a5b1',2);
  line(ctx,478,282,583,270,'#9aafb6',2);
  poly(ctx, [[478,282],[583,270],[583,285],[478,294]], '#303344');
  line(ctx,482,286,578,275,'#53586c',2);
  line(ctx,482,291,578,280,'#151e30',2);
  for(let x=486;x<578;x+=15) rect(ctx,x,285-(x-486)*.1,4,2,'#bd916b');
  // Two feet support a copper frame that encloses an empty dark chamber.
  poly(ctx, [[477,167],[484,148],[496,137],[518,130],[543,135],[560,147],[567,168],[567,262],[552,267],[547,166],[539,153],[520,147],[505,154],[496,167],[494,272],[476,274]], '#172235');
  poly(ctx, [[480,165],[487,149],[497,141],[518,134],[541,138],[555,151],[561,170],[561,261],[552,263],[548,168],[538,152],[520,144],[504,151],[492,167],[490,268],[480,269]], '#88634f');
  poly(ctx, [[483,163],[491,147],[499,142],[519,137],[540,141],[552,153],[558,172],[558,259],[553,260],[550,168],[539,149],[520,142],[502,148],[489,164],[487,266],[483,266]], '#c19362');
  line(ctx,484,170,484,263,'#e2c08b',2);
  line(ctx,552,174,555,257,'#d0a572',2);
  line(ctx,499,144,518,138,'#e0bd87',2);
  line(ctx,522,139,538,143,'#e0bd87',2);
  for(const [x,y] of [[486,176],[486,194],[486,213],[486,234],[486,253],[550,177],[551,197],[552,217],[553,237]]) {
    rect(ctx,x-2,y-2,5,5,'#533e42');
    rect(ctx,x-1,y-1,3,3,'#e0b47b');
    rect(ctx,x,y,1,1,'#fff0b8');
  }
  // Dark central chamber and bright induction rails.
  poly(ctx, [[500,166],[511,155],[528,154],[540,166],[545,253],[498,261]], '#123343');
  poly(ctx, [[509,167],[517,160],[527,163],[534,174],[540,251],[504,255]], '#154454');
  line(ctx,500,173,500,253,'#428788',2);
  line(ctx,542,175,545,249,'#5b9392',2);
  rect(ctx,509,249,29,5,'#718b86');
  rect(ctx,505,257,36,4,'#343848');
  // Projector core, aimed from the exact shared beam origin.
  ellipse(ctx,521,208,19,20,'#182b39');
  ellipse(ctx,521,208,16,17,'#77958d');
  ellipse(ctx,521,208,13,14,'#a8c0aa');
  ellipse(ctx,521,208,10,11,'#245868');
  ellipse(ctx,521,208,7,8,'#4fb8b1');
  ellipse(ctx,520,207,4,5,'#acffe0');
  rect(ctx,516,196,11,2,'#d7deb1');
  rect(ctx,508,206,2,5,'#e0ddae');
  rect(ctx,528,218,2,3,'#667c7d');
  // Weathered side cabinet, two dials, handles and an unmistakable slot.
  poly(ctx, [[562,206],[586,211],[588,266],[561,263]], '#302f43');
  poly(ctx, [[562,206],[587,211],[592,215],[567,211]], '#7c6c65');
  rect(ctx,564,215,21,45,'#77614f');
  rect(ctx,566,216,2,42,'#ba8c62');
  ellipse(ctx,575,226,7,7,'#252d3e');
  ellipse(ctx,575,226,5,5,'#d8ca95');
  line(ctx,575,226,578,222,'#503a40',2);
  rect(ctx,570,239,12,5,'#292438');
  rect(ctx,571,239,10,1,'#baa578');
  rect(ctx,572,248,3,3,'#98c985');
  rect(ctx,579,248,3,3,'#d78667');
  line(ctx,567,260,582,262,'#b79773',2);
  // A copper coil and bent wires bring the apparatus into the woodwork.
  line(ctx,475,175,463,183,'#c09668',3);
  line(ctx,463,183,463,252,'#c09668',3);
  for(let y=192;y<247;y+=6) rect(ctx,458,y,11,3,'#664b49');
  for(let y=193;y<247;y+=6) rect(ctx,459,y,10,1,'#d3a274');
  line(ctx,464,254,475,263,'#80695d',3);
  line(ctx,575,260,591,276,'#152438',3);
  line(ctx,591,276,607,282,'#152438',3);
  line(ctx,607,282,610,298,'#152438',3);
  line(ctx,607,282,610,298,'#687076');
  // Makers' plate, unreadable tiny glyphs at this scale by design.
  rect(ctx,504,272,28,6,'#be976e');
  for(let x=507;x<529;x+=4) rect(ctx,x,274,2,2,'#413541');
}

function drawStaticScene(ctx) {
  ctx.imageSmoothingEnabled = false;
  drawSky(ctx);
  drawWater(ctx);
  drawShip(ctx);
  drawBuildings(ctx);
  drawDeck(ctx);
  drawPierProps(ctx);
  drawMachine(ctx);
}

function cachedScene(ctx) {
  if (sceneCache.has(ctx)) return sceneCache.get(ctx);
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(640, 360)
    : ctx.canvas.ownerDocument.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  drawStaticScene(canvas.getContext('2d'));
  sceneCache.set(ctx, canvas);
  return canvas;
}

function drawScrew(ctx, time) {
  // This tiny silver screw is intentionally the only bright object on the dock.
  ellipse(ctx,319,306,11,2,'#352c41');
  line(ctx,315,304,323,299,'#b3bbc5',3);
  line(ctx,316,303,322,299,'#eff1d9');
  for(const [x,y] of [[317,303],[319,301],[321,300]]) rect(ctx,x,y,1,3,'#606c83');
  poly(ctx,[[310,300],[312,297],[317,298],[319,302],[317,305],[313,304]],'#66768b');
  poly(ctx,[[310,299],[312,296],[317,297],[318,300],[316,303],[312,302]],'#e3ded0');
  line(ctx,312,298,316,301,'#49576b');
  rect(ctx,323,298,3,2,'#ecebcc');
  if(Math.sin(time*1.6)>.96) {
    rect(ctx,328,294,1,7,'#fff2c7');
    rect(ctx,325,297,7,1,'#fff2c7');
  }
}

export function drawBackground(ctx, time = 0, state = {}) {
  const flags = state.flags || {};
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cachedScene(ctx), 0, 0);

  // Gentle discrete ripples avoid smooth modern glow/blur filters.
  for(let i=0;i<17;i++) {
    const phase = Math.floor(time*2+i*1.7)%8;
    const x = 32 + (i*71)%604;
    const y = 195 + (i*13)%36;
    rect(ctx,x+phase,y,7+(i%4)*3,1,i%3?'#455574':'#5c6681');
  }
  const charge = state.rendererFx?.charging || 0;
  const active = (flags.machineTriggered || charge > 0) && !flags.dead;
  const pulse = Math.sin(time * (active ? 15 : 2.5));
  const coreColor = pulse > .4 ? '#d9ffe3' : '#9ff3d4';
  ellipse(ctx,521,208,5,6,active?'#edfff3':coreColor);
  rect(ctx,519,203,3,8,'#e2ffe6');
  const railColor = pulse > 0 ? '#65c6bf' : '#3a9b9e';
  line(ctx,500,177,500,188,railColor);
  line(ctx,500,227,500,247,railColor);
  line(ctx,543,177,544,188,railColor);
  line(ctx,544,232,545,244,railColor);
  rect(ctx,573,248,2,2,pulse>.15?'#d1ed9c':'#8fad75');
  if(charge>0) {
    for(let i=0;i<Math.ceil(charge*12);i++) {
      const a=time*4+i*.52;
      const radius=29-charge*12;
      const x=521+Math.round(Math.cos(a)*radius);
      const y=208+Math.round(Math.sin(a)*radius*1.15);
      rect(ctx,x,y,2,2,i%3?'#abf3d9':'#f4ffe3');
    }
  }
  // Three tiny orbiting motes hint at the machine's unstable energy.
  for(let i=0;i<5;i++) {
    const phase = time*(active?2.4:.55)+i*1.256;
    const x = 521 + Math.round(Math.cos(phase)*26);
    const y = 208 + Math.round(Math.sin(phase)*30);
    rect(ctx,x,y,2,2,'#6ed1c4');
    if(i===0) { rect(ctx,x-1,y+1,4,1,'#8fe5ca'); rect(ctx,x+1,y-1,1,4,'#8fe5ca'); }
  }
  if(!flags.screwTaken) drawScrew(ctx,time);
}
