export const gameDefinition = {
  id: 'una-vite-fuori-posto', version: 1, title: 'Una vite fuori posto', startScene: 'harbor',
  initialFlags: { screwTaken: false, machineTriggered: false, dead: false },
  items: { screw: { name: 'Vite fuori posto', description: 'Una vite metallica. Non so da dove sia caduta… e forse è meglio così.' } },
  scenes: {
    harbor: {
      name: 'Porto di notte',
      hotspots: [
        { id: 'time-machine', label: 'Macchina del tempo', x: 460, y: 135, width: 125, height: 157, stand: { x: 435, y: 305 }, actions: {
          look: { message: 'Una macchina del tempo luminescente. C’è un alloggiamento vuoto vicino al nucleo.' },
          take: { message: 'Non credo che entri in tasca.' },
          talk: { message: '«Ehi, tu sai che ore sono?» Nessuna risposta. Solo un ronzio inquietante.' },
          open: { message: 'Lo sportello è già aperto. Manca una vite.' },
          close: { message: 'Senza quella vite non resta chiuso.' },
          push: { message: 'Non si muove. E il ronzio non mi incoraggia.' },
          pull: { message: 'Preferisco non tirare quei cavi.' },
          use: [{ item: 'screw', message: 'La vite entra perfettamente. Un attimo… perché punta verso di me?', requires: { flags: { dead: false } }, removeItems: ['screw'], setFlags: { machineTriggered: true, dead: true }, complete: true }],
        } },
        { id: 'loose-screw', label: 'Vite fuori posto', x: 304, y: 289, width: 31, height: 25, stand: { x: 295, y: 315 }, hiddenWhen: { screwTaken: true }, actions: {
          look: { message: 'Una vite fuori posto. Luccica sul legno del molo.' },
          take: { message: 'Raccolgo la vite fuori posto. Potrebbe servirmi.', addItems: ['screw'], setFlags: { screwTaken: true } },
        } },
        { id: 'boat', label: 'Veliero', x: 22, y: 77, width: 184, height: 135, stand: { x: 170, y: 285 }, actions: {
          look: { message: 'Un vecchio veliero. L’equipaggio deve essere in qualche taverna.' },
          talk: { message: '«C’è nessuno?» Il porto resta in silenzio.' },
          take: { message: 'Mi servirebbe una tasca decisamente più grande.' },
        } },
        { id: 'crates', label: 'Casse', x: 24, y: 225, width: 108, height: 63, stand: { x: 142, y: 304 }, actions: {
          look: { message: 'Casse di merci. Odorano di sale e di viaggi lunghi.' },
          open: { message: 'Sono inchiodate. E non sono mie.' },
          take: { message: 'Troppo pesanti. Anche per un’avventura.' },
          push: { message: 'Niente da fare. Restano lì.' },
        } },
      ],
    },
  },
  dialogs: {},
};
