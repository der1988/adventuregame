const DEFAULT_MESSAGES = {
  look: 'Non vedo nulla di particolare.',
  take: 'Non posso raccoglierlo.',
  talk: 'Non sembra disposto a parlare.',
  give: 'Non credo che lo voglia.',
  open: 'Non posso aprirlo.',
  close: 'Non posso chiuderlo.',
  push: 'Non riesco a spostarlo.',
  pull: 'Non riesco a tirarlo.',
  walk: 'Non posso andare da quella parte.',
  use: 'Questa combinazione non funziona.',
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isFlagValue = (value) => value === null || typeof value === 'boolean'
  || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

/** A small, data-driven adventure engine. Every public state is a defensive copy. */
export function createGame(definition) {
  if (!isRecord(definition) || typeof definition.id !== 'string' || !definition.id
      || !['string', 'number'].includes(typeof definition.version)
      || !isRecord(definition.scenes) || !isRecord(definition.items)
      || !has(definition.scenes, definition.startScene)) {
    throw new Error('Definizione del gioco non valida.');
  }

  const game = clone(definition);
  game.dialogs ??= {};
  if (!isRecord(game.dialogs)) throw new Error('Definizione dei dialoghi non valida.');

  function validateState(candidate) {
    if (!isRecord(candidate)
        || typeof candidate.scene !== 'string' || !has(game.scenes, candidate.scene)
        || !Array.isArray(candidate.inventory)
        || candidate.inventory.some((id) => typeof id !== 'string' || !has(game.items, id))
        || new Set(candidate.inventory).size !== candidate.inventory.length
        || !isRecord(candidate.flags) || Object.values(candidate.flags).some((value) => !isFlagValue(value))
        || !(candidate.dialogue === null || (typeof candidate.dialogue === 'string' && has(game.dialogs, candidate.dialogue)))
        || typeof candidate.completed !== 'boolean') {
      throw new Error('Stato del gioco non valido.');
    }
    return {
      scene: candidate.scene,
      inventory: [...candidate.inventory],
      flags: { ...candidate.flags },
      dialogue: candidate.dialogue,
      completed: candidate.completed,
    };
  }

  const initialState = validateState({
    scene: game.startScene,
    inventory: [],
    flags: game.initialFlags ?? {},
    dialogue: null,
    completed: false,
  });
  let state = clone(initialState);

  function getState() {
    return clone(state);
  }

  function result(message) {
    return { message, state: getState() };
  }

  function meetsRequirements(effect) {
    const requirements = effect.requires ?? {};
    return Object.entries(requirements.flags ?? {}).every(([key, value]) => state.flags[key] === value)
      && (requirements.items ?? []).every((id) => state.inventory.includes(id));
  }

  function applyEffect(effect) {
    if (!meetsRequirements(effect)) {
      return result(effect.blockedMessage ?? 'Mi manca qualcosa per farlo.');
    }
    const next = getState();
    for (const id of effect.removeItems ?? []) {
      next.inventory = next.inventory.filter((item) => item !== id);
    }
    for (const id of effect.addItems ?? []) {
      if (!next.inventory.includes(id)) next.inventory.push(id);
    }
    next.flags = { ...next.flags, ...(effect.setFlags ?? {}) };
    if (effect.scene !== undefined) next.scene = effect.scene;
    if (effect.closeDialogue === true) next.dialogue = null;
    if (effect.dialogue !== undefined) next.dialogue = effect.dialogue;
    if (effect.complete === true) next.completed = true;
    // Validate before committing so even a malformed effect cannot partially apply.
    state = validateState(next);
    return result(effect.message ?? (next.dialogue ? game.dialogs[next.dialogue].text : '') ?? '');
  }

  function fallback(hotspot, verb) {
    if (typeof hotspot?.fallback === 'string') return hotspot.fallback;
    if (typeof hotspot?.fallback?.[verb] === 'string') return hotspot.fallback[verb];
    return DEFAULT_MESSAGES[verb] ?? 'Non posso farlo.';
  }

  function isVisible(hotspot) {
    const matches = (condition) => Object.entries(condition.flags ?? condition)
      .every(([key, value]) => state.flags[key] === value);
    return (!hotspot.visibleWhen || matches(hotspot.visibleWhen))
      && (!hotspot.hiddenWhen || !matches(hotspot.hiddenWhen));
  }

  function interact({ verb, targetId, itemId } = {}) {
    if (state.dialogue !== null) return result('Prima devo terminare la conversazione.');
    if (typeof verb !== 'string' || !has(DEFAULT_MESSAGES, verb)) return result('Non posso farlo.');
    const scene = game.scenes[state.scene];
    const hotspot = (scene.hotspots ?? []).find((target) => target.id === targetId && isVisible(target));
    if (!hotspot) return result('Non vedo questo oggetto qui.');
    const action = hotspot.actions?.[verb];
    if (!action) return result(fallback(hotspot, verb));

    if (verb === 'use') {
      if (typeof itemId !== 'string' || !state.inventory.includes(itemId)) {
        return result('Devo prima avere questo oggetto nell’inventario.');
      }
      const options = Array.isArray(action) ? action : [action];
      const matching = options.filter((effect) => effect.item === itemId);
      const effect = matching.find(meetsRequirements) ?? matching[0];
      return effect ? applyEffect(effect) : result(fallback(hotspot, verb));
    }
    return applyEffect(action);
  }

  function chooseDialogue(choiceId) {
    if (state.dialogue === null) return result('Non c’è una conversazione in corso.');
    const dialog = game.dialogs[state.dialogue];
    const choice = (dialog.choices ?? []).find((option) => option.id === choiceId);
    return choice ? applyEffect(choice) : result('Questa risposta non è disponibile.');
  }

  function serialize() {
    return JSON.stringify({ id: game.id, version: game.version, state: getState() });
  }

  function restore(serialized) {
    let saved;
    try {
      if (typeof serialized !== 'string') throw new Error();
      saved = JSON.parse(serialized);
    } catch {
      throw new Error('Salvataggio non valido: il formato JSON è danneggiato.');
    }
    if (!isRecord(saved) || saved.id !== game.id || saved.version !== game.version) {
      throw new Error('Il salvataggio appartiene a un altro gioco o a una versione diversa.');
    }
    const restored = validateState(saved.state);
    state = clone(restored);
    return getState();
  }

  function reset() {
    state = clone(initialState);
    return getState();
  }

  return { getState, interact, chooseDialogue, serialize, restore, reset };
}
