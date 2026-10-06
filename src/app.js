import { createGame } from './engine.js';
import { gameDefinition } from './game.js';
import { createRenderer } from './renderer.js';

const $ = (selector) => document.querySelector(selector);
const engine = createGame(gameDefinition);
const renderer = createRenderer($('#game-canvas'), { getState: () => engine.getState() });
const storageKey = 'una-vite-fuori-posto:save:v1';
const verbs = { walk: 'Vai a', give: 'Dai', open: 'Apri', close: 'Chiudi', take: 'Prendi', look: 'Guarda', talk: 'Parla con', use: 'Usa', push: 'Spingi', pull: 'Tira' };
let selectedVerb = 'walk';
let selectedItem = null;
let hoverTarget = '';
let locked = false;
let sequence = 0;
let showHotspots = false;

function message(text) { $('#message').textContent = text; }
function currentAction() {
  const item = selectedItem ? gameDefinition.items[selectedItem].name.toLowerCase() : '';
  $('#current-action').textContent = selectedItem ? `Usa ${item} con ${hoverTarget || '…'}` : `${verbs[selectedVerb]} ${hoverTarget || '…'}`;
}
function selectVerb(verb) {
  if (locked || engine.getState().flags.dead) return;
  sequence++;
  selectedVerb = verb; selectedItem = null; renderControls();
}
function visible(hotspot, state) {
  const matches = (flags) => Object.entries(flags || {}).every(([key, value]) => state.flags[key] === value);
  return (!hotspot.visibleWhen || matches(hotspot.visibleWhen)) && (!hotspot.hiddenWhen || !matches(hotspot.hiddenWhen));
}
function renderControls() {
  const state = engine.getState();
  document.querySelectorAll('[data-verb]').forEach((button) => {
    const active = button.dataset.verb === selectedVerb;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); button.disabled = locked || state.flags.dead;
  });
  $('#inventory-count').textContent = `${state.inventory.length} ${state.inventory.length === 1 ? 'OGGETTO' : 'OGGETTI'}`;
  const inventory = $('#inventory'); inventory.replaceChildren();
  if (!state.inventory.length) {
    const empty = document.createElement('span'); empty.className = 'empty-inventory'; empty.textContent = 'Niente in tasca. Per ora.'; inventory.append(empty);
  }
  for (const id of state.inventory) {
    const item = gameDefinition.items[id]; const button = document.createElement('button');
    button.className = `inventory-item${selectedItem === id ? ' selected' : ''}`;
    button.dataset.item = id; button.disabled = locked || state.flags.dead; button.setAttribute('aria-pressed', String(selectedItem === id));
    const icon = document.createElement('span'); icon.className = 'screw-icon'; icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.textContent = item.name; button.append(icon, label);
    button.addEventListener('click', () => {
      if (selectedVerb === 'look') { message(item.description); return; }
      sequence++;
      selectedItem = selectedItem === id ? null : id; selectedVerb = selectedItem ? 'use' : 'walk'; renderControls();
    });
    inventory.append(button);
  }
  $('#clear-item').hidden = !selectedItem; $('#clear-item').disabled = locked; $('#menu-button').disabled = locked;
  $('#ending').hidden = !(state.flags.dead && !locked);
  $('#scene').classList.toggle('is-dead', Boolean(state.flags.dead));
  renderHotspots(state); currentAction();
}
function renderHotspots(state) {
  const container = $('#hotspots'); const focused = document.activeElement?.dataset?.target; container.replaceChildren();
  for (const hotspot of gameDefinition.scenes[state.scene].hotspots) {
    if (!visible(hotspot, state)) continue;
    const button = document.createElement('button'); button.className = 'hotspot'; button.dataset.target = hotspot.id; button.disabled = locked || state.flags.dead;
    button.setAttribute('aria-label', hotspot.label);
    Object.assign(button.style, { left: `${hotspot.x / 6.4}%`, top: `${hotspot.y / 3.6}%`, width: `${hotspot.width / 6.4}%`, height: `${hotspot.height / 3.6}%` });
    const label = document.createElement('span'); label.textContent = hotspot.label; button.append(label);
    button.addEventListener('pointerenter', () => { hoverTarget = hotspot.label.toLowerCase(); currentAction(); });
    button.addEventListener('pointerleave', () => { hoverTarget = ''; currentAction(); });
    button.addEventListener('focus', () => { hoverTarget = hotspot.label.toLowerCase(); currentAction(); });
    button.addEventListener('blur', () => { hoverTarget = ''; currentAction(); });
    button.addEventListener('click', (event) => { event.stopPropagation(); void interact(hotspot); });
    button.addEventListener('contextmenu', (event) => { event.preventDefault(); event.stopPropagation(); void interact(hotspot, 'look'); });
    container.append(button); if (focused === hotspot.id) button.focus({ preventScroll: true });
  }
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ schema: 1, game: engine.serialize(), position: renderer.getPosition() })); return true; }
  catch { return false; }
}
function load() {
  const raw = localStorage.getItem(storageKey); if (!raw) return false;
  const saved = JSON.parse(raw);
  if (saved.schema !== 1 || typeof saved.game !== 'string') throw new Error('Salvataggio non compatibile.');
  if (!saved.position || !Number.isFinite(saved.position.x) || !Number.isFinite(saved.position.y)) throw new Error('Posizione salvata non valida.');
  engine.restore(saved.game); sequence++; renderer.reset(); renderer.setPosition(saved.position.x, saved.position.y);
  selectedVerb = 'walk'; selectedItem = null; hoverTarget = ''; renderControls();
  message(engine.getState().flags.dead ? 'Sei morto. Puoi ricominciare dal menu.' : 'Partita ripresa. Il porto ti stava aspettando.'); return true;
}
async function interact(hotspot, overrideVerb) {
  if (locked || engine.getState().flags.dead) return;
  const verb = overrideVerb || selectedVerb; const itemId = selectedItem; const actionSequence = ++sequence;
  if (verb === 'walk' || verb === 'take' || (verb === 'use' && itemId)) {
    await renderer.walkTo(hotspot.stand.x, hotspot.stand.y); if (actionSequence !== sequence) return;
  }
  if (verb === 'walk') { message(`Sei vicino a ${hotspot.label.toLowerCase()}.`); return; }
  if (verb === 'use' && !itemId) { message('Scegli prima un oggetto nell’inventario.'); return; }
  if (verb === 'take' && hotspot.id === 'loose-screw') { locked = true; renderControls(); await renderer.pickup(); }
  try {
    const result = engine.interact({ verb, targetId: hotspot.id, itemId }); message(result.message);
    if (result.state.flags.dead) {
      locked = true; selectedItem = null; renderControls(); await renderer.die(); message('Sei morto. La macchina del tempo ha colpito ancora.');
    }
    if (selectedItem && !engine.getState().inventory.includes(selectedItem)) { selectedItem = null; selectedVerb = 'walk'; }
    if (!save()) message(`${$('#message').textContent} Il browser non permette il salvataggio automatico.`);
  } catch (error) { message(error.message || 'Questa azione non è disponibile.'); }
  finally { locked = false; hoverTarget = ''; renderControls(); }
}
function restart() {
  sequence++; engine.reset(); renderer.reset(); locked = false; selectedVerb = 'walk'; selectedItem = null; hoverTarget = '';
  renderControls(); save(); message('Un porto silenzioso. Una macchina che non dovrebbe essere qui.');
  $('#menu').close(); $('#scene').focus({ preventScroll: true });
}
function toggleHotspots() {
  showHotspots = !showHotspots; $('#scene').classList.toggle('show-hotspots', showHotspots); $('#show-hotspots').setAttribute('aria-pressed', String(showHotspots));
}
document.querySelectorAll('[data-verb]').forEach((button) => button.addEventListener('click', () => selectVerb(button.dataset.verb)));
$('#clear-item').addEventListener('click', () => selectVerb('walk'));
$('#scene').addEventListener('click', (event) => {
  if (locked || engine.getState().flags.dead || event.target.closest('.hotspot')) return;
  sequence++; selectVerb('walk'); const bounds = $('#scene').getBoundingClientRect();
  void renderer.walkTo((event.clientX - bounds.left) * 640 / bounds.width, (event.clientY - bounds.top) * 360 / bounds.height);
});
$('#show-hotspots').addEventListener('click', toggleHotspots);
$('#menu-button').addEventListener('click', () => { $('#menu-status').textContent = ''; $('#menu').showModal(); });
$('#help-button').addEventListener('click', () => $('#help').showModal());
$('#close-menu').addEventListener('click', () => $('#menu').close());
$('#close-help').addEventListener('click', () => $('#help').close());
$('#save-button').addEventListener('click', () => { $('#menu-status').textContent = save() ? 'Partita salvata.' : 'Salvataggio non disponibile in questo browser.'; });
$('#load-button').addEventListener('click', () => {
  try { if (load()) $('#menu').close(); else $('#menu-status').textContent = 'Non c’è ancora una partita salvata.'; }
  catch { $('#menu-status').textContent = 'Il salvataggio non è leggibile. Puoi ricominciare una partita.'; }
});
$('#new-game').addEventListener('click', restart); $('#replay').addEventListener('click', restart);
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || locked) return;
  if (event.key === 'Escape') { sequence++; selectVerb('walk'); return; }
  if (event.code === 'Space' && !['BUTTON', 'A'].includes(event.target.tagName)) { event.preventDefault(); toggleHotspots(); return; }
  if (engine.getState().flags.dead) return;
  const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
  if (delta) { event.preventDefault(); sequence++; selectVerb('walk'); const position = renderer.getPosition(); void renderer.walkTo(position.x + delta[0], position.y + delta[1]); }
});
renderControls();
try { load(); } catch { message('Il salvataggio precedente non è leggibile. Inizi una nuova partita.'); }
