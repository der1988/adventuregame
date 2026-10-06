# Adventuregame

Un'avventura punta e clicca in pixel art, ispirata alle avventure grafiche degli anni Novanta. La scena è un porto di notte: cielo blu intenso, isola al chiaro di luna, molo di pietra e una macchina del tempo con camera cilindrica luminescente. Il protagonista cammina sul molo e trova una **Vite fuori posto**.

Raccogli la vite e usala con la macchina: un raggio luminoso colpisce il protagonista e conclude la partita con la scritta **«Sei morto»**.

## Come giocare

- Clicca sul terreno del molo per far camminare il protagonista.
- Scegli un verbo dal pannello di azioni, poi clicca un oggetto della scena.
- Per prendere la vite, scegli **Prendi** e clicca **Vite fuori posto**.
- Seleziona la vite nell'inventario, quindi usala con la macchina del tempo.
- Il menu permette di **salvare**, **caricare** e **ricominciare** la partita nello stesso browser.
- Usa **Tab** per raggiungere i pulsanti, **Invio** o **Spazio** per attivarli ed **Esc** per annullare l'azione selezionata.
- Le **frecce** muovono il protagonista; **Spazio**, quando non è selezionato un pulsante, evidenzia gli oggetti interattivi.

## Avvio

È richiesto Node.js 22 o successivo. Non ci sono dipendenze da installare.

```sh
npm run dev
```

Il server usa l’indirizzo locale `127.0.0.1` e la porta `4173`. Anche `npm start` avvia lo stesso server. Per scegliere una porta diversa:

```sh
PORT=4174 npm run dev
```

Il server ascolta solo su loopback per impostazione predefinita. `HOST` consente di scegliere un altro indirizzo quando l'ambiente lo richiede. Espone esclusivamente `index.html`, `src/` e `assets/`.

## Verifica

```sh
npm test
npm run check
```

`npm test` esegue i test del motore e del server HTTP con il runner integrato di Node.js. `npm run check` verifica la sintassi del server e dei moduli JavaScript.

## Pubblicazione su Vercel

Importa il repository GitHub `der1988/adventuregame` in Vercel e seleziona il ramo `main`. La configurazione `vercel.json` imposta automaticamente:

- Framework: **Other**.
- Build command: `npm run build`.
- Output directory: `dist`.
- Nessuna dipendenza da installare, variabile d’ambiente o chiave segreta richiesta.

La build produce esclusivamente il sito statico; server di sviluppo, test e metadati Git restano fuori dalla cartella pubblicata. Vercel servirà direttamente HTML, JavaScript e CSS: non serve un server Node.js in produzione.

Puoi verificare la build anche in locale con `npm run build`. Una volta collegato il repository, i successivi push su `main` attivano i deploy di produzione di Vercel.

## Struttura

- `index.html`: pagina di ingresso.
- `src/engine.js`: logica del motore.
- `src/game.js`: scena del porto e interazioni del gioco.
- `src/renderer.js` e `src/background.js`: disegno e animazione in pixel art.
- `src/app.js` e `src/style.css`: interfaccia nel browser.
- `assets/harbor-night.png`: scenario in pixel art; il canvas aggiunge riflessi, luminescenza, vite e personaggio animato. Tutti i file sono inclusi nel sito, senza servizi esterni.
- `assets/VT323-Regular.ttf`: font pixel VT323 di Peter Hull, distribuito sotto SIL Open Font License 1.1; licenza inclusa in `assets/VT323-OFL.txt`.
- `scripts/dev-server.mjs`: server locale senza dipendenze esterne.
