import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { gameDefinition } from '../src/game.js';

function fixture() {
  return {
    id: 'engine-test',
    version: 1,
    title: 'Prova motore',
    startScene: 'entry',
    initialFlags: { unlocked: false, clue: false },
    items: {
      key: { name: 'Chiave', description: 'Una chiave.' },
      coin: { name: 'Moneta', description: 'Una moneta.' },
    },
    scenes: {
      entry: {
        name: 'Ingresso',
        hotspots: [
          { id: 'key', actions: { take: { message: 'Chiave raccolta.', addItems: ['key'] } } },
          { id: 'coin', actions: { take: { message: 'Moneta raccolta.', addItems: ['coin'] } } },
          {
            id: 'door',
            actions: {
              look: { message: 'La porta è chiusa.' },
              use: [{
                item: 'key',
                requires: { flags: { clue: true }, items: ['key'] },
                blockedMessage: 'Devo capire come girarla.',
                message: 'Porta aperta.',
                removeItems: ['key'],
                setFlags: { unlocked: true },
              }],
              walk: {
                requires: { flags: { unlocked: true } },
                blockedMessage: 'La porta è ancora chiusa.',
                scene: 'exit',
                message: 'Entro nella stanza.',
              },
            },
          },
          { id: 'guide', actions: { talk: { dialogue: 'hint' } } },
        ],
      },
      exit: {
        name: 'Stanza',
        hotspots: [{ id: 'finish', actions: { look: { message: 'Finito.', complete: true } } }],
      },
    },
    dialogs: {
      hint: {
        text: 'Chiedimi della porta.',
        choices: [
          { id: 'locked', label: 'Posso entrare?', requires: { flags: { unlocked: true } }, blockedMessage: 'Prima apri la porta.', complete: true },
          { id: 'hint', label: 'Come si apre?', message: 'Gira la chiave a sinistra.', setFlags: { clue: true }, closeDialogue: true },
          { id: 'bye', label: 'Ciao.', message: 'Ciao.', closeDialogue: true },
        ],
      },
    },
  };
}

test('inventory puzzle requires the clue and correct item, then unlocks travel and completion', () => {
  const game = createGame(fixture());
  game.interact({ verb: 'take', targetId: 'key' });
  game.interact({ verb: 'take', targetId: 'coin' });
  game.interact({ verb: 'take', targetId: 'coin' });
  assert.deepEqual(game.getState().inventory, ['key', 'coin']);

  const before = game.getState();
  assert.match(game.interact({ verb: 'use', targetId: 'door', itemId: 'coin' }).message, /combinazione/);
  assert.deepEqual(game.getState(), before);
  assert.equal(game.interact({ verb: 'use', targetId: 'door', itemId: 'key' }).message, 'Devo capire come girarla.');
  assert.deepEqual(game.getState(), before);
  assert.equal(game.interact({ verb: 'walk', targetId: 'door' }).message, 'La porta è ancora chiusa.');
  assert.deepEqual(game.getState(), before);

  assert.equal(game.interact({ verb: 'talk', targetId: 'guide' }).message, 'Chiedimi della porta.');
  game.chooseDialogue('hint');
  game.interact({ verb: 'use', targetId: 'door', itemId: 'key' });
  assert.deepEqual(game.getState().inventory, ['coin']);
  assert.equal(game.getState().flags.unlocked, true);
  game.interact({ verb: 'walk', targetId: 'door' });
  assert.equal(game.getState().scene, 'exit');
  game.interact({ verb: 'look', targetId: 'finish' });
  assert.equal(game.getState().completed, true);
});

test('dialogue choices validate requirements and preserve state on unavailable actions', () => {
  const game = createGame(fixture());
  const idle = game.getState();
  game.chooseDialogue('hint');
  assert.deepEqual(game.getState(), idle);
  game.interact({ verb: 'talk', targetId: 'guide' });
  const talking = game.getState();
  assert.equal(talking.dialogue, 'hint');
  game.chooseDialogue('missing');
  game.chooseDialogue('locked');
  game.interact({ verb: 'take', targetId: 'key' });
  assert.deepEqual(game.getState(), talking);
  game.chooseDialogue('bye');
  assert.equal(game.getState().dialogue, null);
  assert.equal(game.getState().flags.clue, false);
});

test('definition and all returned states are defensively copied', () => {
  const definition = fixture();
  const game = createGame(definition);
  definition.initialFlags.clue = true;
  definition.scenes.entry.hotspots[0].actions.take.addItems.push('coin');
  const copy = game.getState();
  copy.inventory.push('key');
  copy.flags.clue = true;
  assert.equal(game.getState().flags.clue, false);
  assert.deepEqual(game.getState().inventory, []);
  const returned = game.interact({ verb: 'take', targetId: 'key' }).state;
  returned.inventory.length = 0;
  returned.flags.unlocked = true;
  assert.deepEqual(game.getState().inventory, ['key']);
  assert.equal(game.getState().flags.unlocked, false);
});

test('save and restore round-trip dialogue and inventory, and reset restores initial state', () => {
  const game = createGame(fixture());
  const initial = game.getState();
  game.interact({ verb: 'take', targetId: 'key' });
  game.interact({ verb: 'talk', targetId: 'guide' });
  const progress = game.getState();
  const save = game.serialize();
  assert.deepEqual(game.reset(), initial);
  assert.deepEqual(game.restore(save), progress);
  const restored = game.restore(save);
  restored.flags.clue = true;
  assert.deepEqual(game.getState(), progress);
});

test('invalid saves cannot partially mutate current progress', () => {
  const game = createGame(fixture());
  game.interact({ verb: 'take', targetId: 'key' });
  const before = game.getState();
  const valid = JSON.parse(game.serialize());
  const malformed = [
    '{broken',
    JSON.stringify({ ...valid, id: 'another-game' }),
    JSON.stringify({ ...valid, version: 2 }),
    ...[
      { scene: 'unknown' },
      { inventory: ['missing'] },
      { inventory: ['key', 'key'] },
      { inventory: 'key' },
      { flags: [] },
      { flags: { clue: {} } },
      { dialogue: 'missing' },
      { dialogue: 42 },
      { completed: 'yes' },
    ].map((patch) => JSON.stringify({ ...valid, state: { ...valid.state, ...patch } })),
  ];
  for (const save of malformed) {
    assert.throws(() => game.restore(save));
    assert.deepEqual(game.getState(), before);
  }
});

test('invalid effect is atomic and missing verbs and targets give feedback', () => {
  const definition = fixture();
  definition.scenes.entry.hotspots.push({ id: 'broken', actions: { take: { addItems: ['key'], scene: 'missing' } } });
  const game = createGame(definition);
  const before = game.getState();
  assert.throws(() => game.interact({ verb: 'take', targetId: 'broken' }));
  assert.deepEqual(game.getState(), before);
  assert.equal(game.interact({ verb: 'take', targetId: 'door' }).message, 'Non posso raccoglierlo.');
  assert.match(game.interact({ verb: 'look', targetId: 'missing' }).message, /qui/);
  assert.equal(game.interact({ verb: 'dance', targetId: 'door' }).message, 'Non posso farlo.');
  assert.deepEqual(game.getState(), before);
});

test('use selects the matching item effect whose prerequisites currently pass', () => {
  const definition = fixture();
  definition.scenes.entry.hotspots[2].actions.use.unshift({
    item: 'key', requires: { flags: { unlocked: true } }, message: 'È già aperta.',
  });
  const game = createGame(definition);
  game.interact({ verb: 'take', targetId: 'key' });
  game.interact({ verb: 'talk', targetId: 'guide' });
  game.chooseDialogue('hint');
  assert.equal(game.interact({ verb: 'use', targetId: 'door', itemId: 'key' }).message, 'Porta aperta.');
});

test('hidden hotspots cannot be interacted with through their IDs', () => {
  const definition = fixture();
  definition.scenes.entry.hotspots[0].hiddenWhen = { clue: true };
  definition.scenes.entry.hotspots[1].visibleWhen = { clue: true };
  const game = createGame(definition);
  assert.match(game.interact({ verb: 'take', targetId: 'coin' }).message, /qui/);
  assert.deepEqual(game.getState().inventory, []);
  game.interact({ verb: 'talk', targetId: 'guide' });
  game.chooseDialogue('hint');
  assert.match(game.interact({ verb: 'take', targetId: 'key' }).message, /qui/);
  game.interact({ verb: 'take', targetId: 'coin' });
  assert.deepEqual(game.getState().inventory, ['coin']);
});

test('the real time machine responds to every declared SCUMM verb', () => {
  const game = createGame(gameDefinition);
  const initial = game.getState();
  const machine = gameDefinition.scenes.harbor.hotspots.find((hotspot) => hotspot.id === 'time-machine');
  for (const [verb, effect] of Object.entries(machine.actions)) {
    if (verb === 'use') continue;
    assert.equal(game.interact({ verb, targetId: machine.id }).message, effect.message);
    assert.deepEqual(game.getState(), initial);
  }
  assert.equal(game.interact({ verb: 'give', targetId: machine.id }).message, 'Non credo che lo voglia.');
  assert.deepEqual(game.getState(), initial);
});

test('the real loose screw triggers the time machine only after it has been collected', () => {
  const game = createGame(gameDefinition);
  const initial = game.getState();
  assert.equal(gameDefinition.items.screw.name, 'Vite fuori posto');
  game.interact({ verb: 'use', targetId: 'time-machine', itemId: 'screw' });
  assert.deepEqual(game.getState(), initial);
  game.interact({ verb: 'take', targetId: 'loose-screw' });
  assert.deepEqual(game.getState().inventory, ['screw']);
  assert.equal(game.getState().flags.screwTaken, true);
  assert.match(game.interact({ verb: 'take', targetId: 'loose-screw' }).message, /qui/);
  const death = game.interact({ verb: 'use', targetId: 'time-machine', itemId: 'screw' });
  assert.equal(death.message, gameDefinition.scenes.harbor.hotspots[0].actions.use[0].message);
  assert.equal(death.state.scene, 'harbor');
  assert.equal(death.state.flags.machineTriggered, true);
  assert.equal(death.state.flags.dead, true);
  assert.equal(death.state.completed, true);
  assert.deepEqual(death.state.inventory, []);
  assert.deepEqual(game.restore(game.serialize()), death.state);
});
