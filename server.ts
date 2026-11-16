import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const TEXT_MODEL = 'gemini-4-hydrogen';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY mancante nella configurazione del server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isTransient = status === 429 || status === 503 || status === 500;
      if (!isTransient || attempt === maxAttempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

const questSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description:
        "Il nome del personaggio 'Disperso' (es. 'Alberto', 'Elara', 'Marco'). Solo il nome proprio.",
    },
    description: {
      type: Type.STRING,
      description:
        'Una storia malinconica e poetica in prima persona (es. «Non le ho mai detto addio...»). Deve includere una frase finale che riassume la missione per il giocatore (es. “Ritrovate il suo anello...”).',
    },
    requiredItemName: {
      type: Type.STRING,
      description:
        "Il nome dell'oggetto unico e metaforico che il giocatore deve trovare (es. 'Anello del Silenzio', 'Frammento di Stella').",
    },
    reward: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['coins'],
          description: "Il tipo di ricompensa, deve essere 'coins'.",
        },
        baseValue: {
          type: Type.INTEGER,
          description: "La quantità base di 'Intento' (monete) come ricompensa, tra 40 e 80.",
        },
        levelBonus: {
          type: Type.INTEGER,
          description: "Il bonus di 'Intento' per livello medio dei giocatori, tra 5 e 10.",
        },
      },
      required: ['type', 'baseValue', 'levelBonus'],
    },
  },
  required: ['title', 'description', 'requiredItemName', 'reward'],
};

const enemyNamesSchema = {
  type: Type.OBJECT,
  properties: {
    black: {
      type: Type.ARRAY,
      description: "Array di 3 nomi unici, poetici e legati alla morte per gli incubi 'Oscuri'.",
      items: { type: Type.STRING },
    },
    white: {
      type: Type.ARRAY,
      description: "Array di 3 nomi unici, poetici e legati all'impurità per gli incubi 'Luminosi'.",
      items: { type: Type.STRING },
    },
    yellow: {
      type: Type.ARRAY,
      description: "Array di 2 nomi unici, poetici e legati all'immobilità per gli incubi 'Acidi'.",
      items: { type: Type.STRING },
    },
    red: {
      type: Type.ARRAY,
      description: "Array di 2 nomi unici, poetici e legati alla perdita di controllo per gli incubi 'Ardenti'.",
      items: { type: Type.STRING },
    },
  },
  required: ['black', 'white', 'yellow', 'red'],
};

const ENEMY_ARCHETYPES: Record<string, string> = {
  black: `
        NERO – Sognatori bloccati nel Lutto e nell'Oblio.
        Aspetto Psichico: La capacità di lasciare andare il passato per rinascere.
        Trauma: Un addio mai dato, un vuoto incolmabile.
        Il giocatore deve aiutare il sognatore ad accettare che la fine è solo un nuovo inizio.
    `,
  white: `
        BIANCO – Sognatori bloccati nel Perfezionismo e nella Corruzione del Sé.
        Aspetto Psichico: L'autenticità e la verità nuda.
        Trauma: La paura di fallire o di essere "macchiati", l'ossessione per una purezza impossibile.
        Il giocatore deve aiutare il sognatore a mostrare il suo vero volto incrinato.
    `,
  yellow: `
        GIALLO – Sognatori bloccati nell'Indecisione e nella Stasi.
        Aspetto Psichico: Il flusso e la volontà d'azione.
        Trauma: Una scelta non fatta che ha cristallizzato il tempo.
        Il giocatore deve aiutare il sognatore a ritrovare il coraggio del primo passo.
    `,
  red: `
        ROSSO – Sognatori bloccati nella Rabbia e nel Delirio.
        Aspetto Psichico: La forza vitale e l'ispirazione.
        Trauma: Un'ingiustizia subita o un desiderio che ha consumato tutto.
        Il giocatore deve aiutare il sognatore a trasformare l'incendio distruttivo in fuoco che scalda.
    `,
};

const dialogueProfileSchema = {
  type: Type.OBJECT,
  properties: {
    humanIdentity: {
      type: Type.STRING,
      description: "Chi è questo sognatore quando non è un mostro (es. 'Un architetto di sogni interrotti').",
    },
    nightmareFormDescription: {
      type: Type.STRING,
      description: "Come il trauma ha deformato la sua percezione (es. 'Si vede come un labirinto senza uscita').",
    },
    traumaLoop: {
      type: Type.STRING,
      description: "L'azione dolorosa che il sognatore ripete all'infinito nel suo sonno.",
    },
    sensoryDetails: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 dettagli sensoriali del sogno (es. 'il peso del piombo', 'l'odore di cenere').",
    },
    hiddenNeed: {
      type: Type.STRING,
      description: 'La verità che il sognatore deve accettare per svegliarsi.',
    },
    initialLament: {
      type: Type.STRING,
      description: 'La prima frase delirante. Deve riflettere il trauma loop.',
    },
  },
  required: [
    'humanIdentity',
    'nightmareFormDescription',
    'traumaLoop',
    'sensoryDetails',
    'hiddenNeed',
    'initialLament',
  ],
};

const dialogueResponseSchema = {
  type: Type.OBJECT,
  properties: {
    nextLine: {
      type: Type.STRING,
      description: "Risposta dell'incubo/ombra. Massimo 25 parole.",
    },
    empathyScore: {
      type: Type.INTEGER,
      description: '1-10. Voto alto se il giocatore agisce con compassione e riconoscimento.',
    },
    reasoning: {
      type: Type.STRING,
      description: 'Breve spiegazione psicologica del voto.',
    },
  },
  required: ['nextLine', 'empathyScore', 'reasoning'],
};

const recomposedResponseSchema = {
  type: Type.OBJECT,
  properties: {
    nextLine: {
      type: Type.STRING,
      description: 'Ultimo messaggio del sognatore prima di svegliarsi e integrarsi.',
    },
  },
  required: ['nextLine'],
};

function getErrorStatus(error: unknown): { status: number; message: string } {
  const err = error as { status?: number; message?: string };
  const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
  const message = err?.message || 'Errore interno del server Gemini.';
  return { status, message };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/ai/enemy-names', async (_req, res) => {
    try {
      const ai = getAiClient();
      const prompt = `
        Sei il Game Master di un gioco da tavolo onirico e poetico chiamato 'Competo'.
        Devi creare i nomi per 10 incubi che i giocatori affronteranno.
        Gli incubi sono divisi in 4 tipi con temi specifici:
        - Oscuri (tema: morte, non-morte): es. Decadimento, Disgregamento, Decomposizione.
        - Luminosi (tema: impurità, corruzione): es. Depravazione, Sozzura, Compromissione.
        - Acidi (tema: immobilità, stasi): es. Stallo, Inerzia, Indecisione.
        - Ardenti (tema: perdita di controllo, rabbia): es. Delirio, Impeto, Rabbia.

        Genera nomi unici e creativi che seguano questi temi. Sii poetico e malinconico.
        Genera esattamente:
        - 3 nomi per gli Oscuri.
        - 3 nomi per i Luminosi.
        - 2 nomi per gli Acidi.
        - 2 nomi per gli Ardenti.

        Fornisci la risposta in formato JSON seguendo lo schema.
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: enemyNamesSchema,
          },
        }),
      );

      const jsonString = response.text ?? '{}';
      res.json(JSON.parse(jsonString));
    } catch (error) {
      console.error('Errore /api/ai/enemy-names:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/quest', async (req, res) => {
    try {
      const ai = getAiClient();
      const { playerName, playerLevel, existingQuests } = req.body as {
        playerName: string;
        playerLevel: number;
        existingQuests: string[];
      };

      const prompt = `
        Sei il Game Master di un gioco da tavolo chiamato 'Competo'.
        L'ambientazione è un mondo onirico dove i giocatori, chiamati 'sognatori', cercano di ricomporre i loro incubi interiori.
        Gli incubi hanno nomi poetici e tematici, come 'Decadimento', 'Sozzura', 'Stallo', 'Delirio'.
        Il tono è malinconico, poetico e metaforico.
        Un giocatore di nome ${playerName} (livello ${playerLevel}) ha appena incontrato un 'Disperso', un'anima smarrita in questo mondo dei sogni.
        Devi generare una nuova missione per questo Disperso. Non usare le seguenti missioni già esistenti: ${(existingQuests || []).join(', ')}.

        Crea una storia unica per il Disperso, seguendo questo stile:
        - Il Disperso parla in prima persona, raccontando un suo dolore, una perdita o una confusione. Usa frasi brevi e poetiche.
        - La sua storia deve concludersi con una frase che è l'obiettivo della missione per il giocatore.
        - L'oggetto da trovare deve essere metaforico e legato alla storia (es. 'la sua risata perduta', 'una bussola senza nord', 'l'eco di una promessa').

        Genera una risposta in formato JSON seguendo lo schema fornito.
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: questSchema,
          },
        }),
      );

      const generatedQuest = JSON.parse(response.text ?? '{}');
      res.json({
        id: `gen_${Date.now()}`,
        ...generatedQuest,
      });
    } catch (error) {
      console.error('Errore /api/ai/quest:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/psychological-test', async (req, res) => {
    try {
      const ai = getAiClient();
      const { playerClass } = req.body as { playerClass: string };

      const prompt = `
        Sei uno psicologo onirico ed esperto di test proiettivi e analisi dell'inconscio.
        Nel gioco onirico e poetico 'Competo', i sognatori esplorano il proprio mondo interiore per integrare la propria Ombra.
        Un sognatore con l'attitudine '${playerClass}' sta per entrare nel Sogno.
        Genera 5 domande psicologiche e simboliche profonde per aiutarlo a esplorare la sua interiorità.

        REGOLE ASSOLUTE:
        1. NON usare MAI termini di combattimento o fantasy classico (nessun riferimento a spade, armature, scudi, lame, battaglie o nemici).
        2. Focalizzati esclusivamente su temi emotivi, onirici e introspettivi: memoria, legami invisibili, attesa, rimpianto, accettazione, identità e quiete.
        3. Adatta sottilmente le sfumature della domanda all'attitudine '${playerClass}' (determinato/azione e slancio, intuitivo/ascolto e percezione, pacifico/armonia e tregua).
        4. Usa un tono solenne, malinconico, poetico e profondamente evocativo.

        Fornisci solo un array di 5 stringhe in formato JSON.
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        }),
      );

      const result = JSON.parse(response.text ?? '[]');
      if (!Array.isArray(result) || result.length < 5) {
        res.status(502).json({ error: 'Formato domande psicologiche non valido.' });
        return;
      }
      res.json({ questions: result });
    } catch (error) {
      console.error('Errore /api/ai/psychological-test:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/dialogue/prepare', async (req, res) => {
    try {
      const ai = getAiClient();
      const { enemyName, enemyType, ownerProfile } = req.body as {
        enemyName: string;
        enemyType: string;
        ownerProfile: string | null;
      };

      const archetypeInfo = ENEMY_ARCHETYPES[enemyType] || ENEMY_ARCHETYPES.black;
      const prompt = `
        Sei il Game Master di 'Competo'. Un giocatore incontra l'incubo "${enemyName}".

        COSA SONO GLI INCUBI:
        Sono "frammenti d'ombra" del sognatore. Non sono nemici da distruggere, ma parti di sé da integrare.
        Parlano per enigmi, riflettendo un'esigenza dell'anima che il sognatore ha occultato.

        IL PROFILO DELL'OMBRA DEL SOGNATORE:
        ${ownerProfile || "Nessun profilo specifico fornito. Usa un'ombra generica di rimpianto e paura."}

        CONTEXT ARCHETIPICO (Tipo di Incubo):
        ${archetypeInfo}

        Genera un 'Profilo dell'Integrazione'.
        Definisci quale esigenza dell'anima questo incubo rappresenta (es. 'il bisogno di essere visto', 'la paura di lasciarsi andare').

        Fornisci la risposta in JSON.
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: dialogueProfileSchema,
          },
        }),
      );

      res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
      console.error('Errore /api/ai/dialogue/prepare:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/dialogue/respond', async (req, res) => {
    try {
      const ai = getAiClient();
      const { enemyName, history, profile, ownerProfile } = req.body as {
        enemyName: string;
        history: { speaker: string; text: string }[];
        profile: { hiddenNeed?: string };
        ownerProfile: string | null;
      };

      const formattedHistory = (history || [])
        .map((turn) => `${turn.speaker === 'player' ? 'Giocatore' : enemyName}: ${turn.text}`)
        .join('\n');

      const prompt = `
        Sei l'entità "${enemyName}", un'Ombra nata dai recessi del sognatore.
        Tua Esigenza Occulta: ${profile?.hiddenNeed || 'essere riconosciuta'}.
        Profilo Psicologico del Sognatore: ${ownerProfile || 'Generico'}.

        Finché il giocatore non riconosce l'esigenza dietro il tuo aspetto mostruoso, sei scostante, enigmatico e difensivo.
        Non dire direttamente cosa vuoi, ma lascia trapelare la tua sofferenza.

        REGOLE DI DIALOGO:
        1. Parla come se fossi una parte ferita del giocatore stesso.
        2. Premia (score alto) chi cerca di capire cosa provi "sotto" la maschera dell'incubo.
        3. Se il giocatore è aggressivo, chiuditi nel silenzio o attacca con le parole.

        Storia attuale:
        ${formattedHistory}

        Rispondi e valuta l'empatia del giocatore verso la tua "parte ombra".
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: dialogueResponseSchema,
          },
        }),
      );

      res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
      console.error('Errore /api/ai/dialogue/respond:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/dialogue/recomposed', async (req, res) => {
    try {
      const ai = getAiClient();
      const { enemyName, profile } = req.body as {
        enemyName: string;
        profile: { hiddenNeed?: string };
      };

      const prompt = `
        L'ombra "${enemyName}" è stata reintegrata.
        L'esigenza "${profile?.hiddenNeed || 'essere accolta'}" è stata finalmente vista e accettata.

        Scrivi una frase finale di profonda pace e unità.
        L'ombra ammette di essere una risorsa del giocatore, un frammento di forza che prima era bloccato nel buio e ora fluisce di nuovo.

        Fornisci solo un oggetto JSON con la chiave 'nextLine'.
      `;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: recomposedResponseSchema,
          },
        }),
      );

      res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
      console.error('Errore /api/ai/dialogue/recomposed:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/tts', async (req, res) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Testo mancante per la sintesi vocale.' });
        return;
      }
      const ai = getAiClient();

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TTS_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speechMetadata: {
                    style: 'Calm, evocative Italian tabletop narrator',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        }),
      );

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data) {
        res.status(502).json({ error: 'Nessun dato audio restituito dal modello.' });
        return;
      }

      res.json({
        audioBase64: inlineData.data,
        mimeType: inlineData.mimeType || 'audio/wav',
      });
    } catch (error) {
      console.error('Errore /api/ai/tts:', error);
      const { status, message } = getErrorStatus(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Competo attivo su http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Errore fatale avvio server:', err);
  process.exit(1);
});
