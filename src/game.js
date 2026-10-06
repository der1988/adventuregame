export const gameDefinition = {
  id: 'una-vite-fuori-posto', version: 1, title: 'Una vite fuori posto', startScene: 'harbor',
  initialFlags: { screwTaken: false, machineTriggered: false, dead: false },
  items: { screw: { name: 'Vite fuori posto', description: 'Una vite metallica. Non so da dove sia caduta… e forse è meglio così.' } },
  scenes: {
    harbor: {
      name: 'Porto di notte',
      hotspots: [
        { id: 'time-machine', label: 'Macchina del tempo', x: 460, y: 75, width: 165, height: 220, stand: { x: 435, y: 300 }, actions: {
          look: { message: 'Una macchina del tempo luminescente. C’è un alloggiamento vuoto vicino al nucleo.' },
          take: { message: 'Non credo che entri in tasca.' },
          talk: { message: '«Ehi, tu sai che ore sono?» Nessuna risposta. Solo un ronzio inquietante.' },
          open: { message: 'Lo sportello è già aperto. Manca una vite.' },
          close: { message: 'Senza quella vite non resta chiuso.' },
          push: { message: 'Non si muove. E il ronzio non mi incoraggia.' },
          pull: { message: 'Preferisco non tirare quei cavi.' },
          use: [{ item: 'screw', message: 'La vite entra perfettamente. Un attimo… perché punta verso di me?', requires: { flags: { dead: false } }, removeItems: ['screw'], setFlags: { machineTriggered: true, dead: true }, complete: true }],
        } },
        { id: 'loose-screw', label: 'Vite fuori posto', x: 304, y: 289, width: 31, height: 25, stand: { x: 305, y: 310 }, hiddenWhen: { screwTaken: true }, actions: {
          look: { message: 'Una vite fuori posto. Luccica sulle pietre del molo.' },
          take: { message: 'Raccolgo la vite fuori posto. Potrebbe servirmi.', addItems: ['screw'], setFlags: { screwTaken: true } },
        } },
        { id: 'island', label: 'Isola lontana', x: 40, y: 75, width: 155, height: 85, stand: { x: 170, y: 282 }, actions: {
          look: { message: 'Un’isola al chiaro di luna. Quelle finestre accese non promettono niente di buono.' },
          talk: { message: '«Ehi, laggiù!» Soltanto un’eco sopra il mare.' },
          take: { message: 'Un’isola intera? Non è il momento di esagerare.' },
        } },
        { id: 'stone-arch', label: 'Arco di pietra', x: 280, y: 98, width: 120, height: 145, stand: { x: 338, y: 277 }, actions: {
          look: { message: 'Un vecchio arco di pietra. Dall’altra parte si vede soltanto buio.' },
          open: { message: 'Non c’è una porta. Solo un passaggio che preferisco evitare.' },
          take: { message: 'Queste pietre stanno bene dove sono.' },
          push: { message: 'Meglio non provarci: sembra abbastanza in rovina.' },
        } },
      ],
    },
  },
  dialogs: {},
};
