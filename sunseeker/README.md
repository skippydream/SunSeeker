# Sun Seeker

Quanto sole c'è davvero — oggi e nei prossimi sette giorni, dove sei o in qualsiasi città.

Il cielo dell'app segue il sole reale della località mostrata: colori, stelle e
posizione del bagliore sono calcolati dall'elevazione solare, non da un orario fisso.

## Il dato principale

Le ore di sole vengono dalla misura `sunshine_duration` di Open-Meteo, cioè il tempo
in cui l'irraggiamento diretto supera i 120 W/m².

Non è la stessa cosa di `ore di luce × (1 − nuvolosità)`: la nuvolosità media è un
pessimo proxy della radiazione diretta. Milano, 27 agosto 2026 — nuvolosità media 72%,
che con quella formula darebbe 3,8 ore di sole. Il valore misurato è 11,7 ore.

## Cosa mostra

- **Oggi** — ore di sole, arco solare con le ore soleggiate dipinte sopra, alba e
  tramonto con golden hour e ora blu, quanta luce si guadagna o si perde rispetto a ieri.
- **Sette giorni** — una striscia oraria per giorno: si vede *quando* ci sarà sole,
  non solo quanto, e quando invece pioverà. Toccando un giorno si apre il dettaglio
  ora per ora.
- **Luna** — fase corrente, percentuale illuminata, età, sorgere e tramontare,
  prossima luna piena e nuova, e le fasi delle sette notti successive.

## Come funziona

| | |
|---|---|
| Previsioni | [Open-Meteo](https://open-meteo.com) — nessuna chiave API |
| Modello, primi 3 giorni | ICON-2I (ItaliaMeteo · ARPAE-SIMC), 2,2 km |
| Modello, oltre | best match Open-Meteo (ECMWF / ICON) |
| Accordo sulla pioggia | ICON-2I, ICON, ECMWF IFS, GFS |
| Ricerca città | Open-Meteo Geocoding |
| Posizione del sole | NOAA Solar Position, calcolata in locale (`lib/sun.ts`) |
| Fase e orari della luna | Meeus a bassa precisione, in locale (`lib/moon.ts`) |

Golden hour, ora blu e gli orari lunari non arrivano da un servizio: sono calcolati
cercando gli attraversamenti delle soglie di elevazione lungo la giornata locale.

Gli orari restano nel fuso della località: le stringhe di Open-Meteo non passano mai
da `new Date()`, che le reinterpreterebbe nel fuso del browser.

Le coordinate rilevate dal GPS vanno solo a Open-Meteo, che serve per avere le
previsioni. Non c'è reverse geocoding: una posizione rilevata si chiama "La tua
posizione", con le coordinate come sottotitolo.

## Scelta del modello

I primi tre giorni usano **ICON-2I**, il modello ad area limitata di
ItaliaMeteo/ARPAE-SIMC: 2,2 km sull'Italia contro gli ~11 km di ECMWF. Oltre il terzo
giorno ICON-2I non ha più dati e si torna al best match di Open-Meteo. Indice UV e
probabilità di precipitazione vengono sempre dalla previsione di base, perché ICON-2I
non li produce. Fuori dal dominio italiano ICON-2I restituisce valori nulli e lo strato
semplicemente non si applica: nessun controllo geografico da mantenere.

Sui siti meteo italiani più noti: **non esiste un'API pubblica utilizzabile**. iLMeteo e
3bmeteo vendono i dati in B2B su contratto; l'Aeronautica Militare li cede solo per
convenzione a pagamento e vieta esplicitamente la cessione a terzi dei dati originali,
il che rende impossibile ridistribuirli in un'app pubblica. Nessuno dei tre produce
comunque previsioni originali: post-processano gli stessi modelli numerici pubblici.

## Accordo fra modelli

Un solo numero nasconde quanto è incerta una previsione. Per la pioggia interroghiamo
quattro centri indipendenti e mostriamo quanti concordano. Milano, 28 agosto 2026:
ICON-2I 0,5 mm, ICON 0,3 mm, ECMWF 1,2 mm, GFS 2,5 mm — un fattore cinque.

Quando l'accordo scende sotto il 75% il giorno viene marcato come incerto, con il
contorno tratteggiato sull'etichetta della pioggia.

## Giorni di pioggia

Un giorno è di pioggia in base ai **millimetri**, non alla probabilità: capita spesso
di avere il 45% di probabilità e zero millimetri (nebbia, nuvole basse). La soglia è
2 mm per "giorno di pioggia", 15 mm per "pioggia forte".

Quando piove sul serio la riga del giorno viene marcata, le ore di sole scendono di un
gradino nella gerarchia visiva e la striscia oraria mostra in blu *quando* piove.

## Pubblicazione

Il sito è su GitHub Pages: **https://skippydream.github.io/SunSeeker/**

Pages serve solo file statici, quindi non ci sono route API: le previsioni si
chiedono a Open-Meteo direttamente dal browser (`lib/forecast.ts`). Si può fare
perché Open-Meteo non richiede chiavi e risponde con `access-control-allow-origin: *`.
Senza chiavi da proteggere, un backend non aggiungerebbe nulla.

Ogni push su `main` fa partire `.github/workflows/deploy.yml`, che controlla tipi e
lint, compila con `NEXT_PUBLIC_BASE_PATH=/SunSeeker` e pubblica la cartella `out/`.

Il prefisso serve perché su Pages il sito vive in una sottocartella, non alla radice
del dominio. In sviluppo la variabile non è impostata e il sito sta alla radice.

Per provare in locale esattamente com'è in produzione:

```bash
NEXT_PUBLIC_BASE_PATH=/SunSeeker npm run build
mkdir -p /tmp/pages && cp -R out /tmp/pages/SunSeeker
python3 -m http.server 4321 --directory /tmp/pages
```

Poi apri http://localhost:4321/SunSeeker/ — un `basePath` sbagliato si vede subito,
perché la pagina si carica senza CSS.

## Sviluppo

```bash
npm install
npm run dev
```

Poi apri [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build di produzione
npm run lint    # ESLint
npx tsc --noEmit  # controllo dei tipi
```

Next.js 16 (App Router), React 19, Tailwind CSS 4. Nessuna dipendenza runtime oltre
a React e Next.

Font: **Fraunces** per i numeri grandi (serif ad alto contrasto, regge sul cielo chiaro
di mezzogiorno), **Inter** per l'interfaccia, **JetBrains Mono** per orari e misure, che
hanno bisogno di cifre a larghezza fissa.

L'icona è `app/icon.svg`: sole e arco, gli stessi dell'eroe, ridotti al minimo perché
restino distinti a 16 px.
