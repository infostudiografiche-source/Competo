import type { GameState, Quest, KeyColor, Enemy, PlayerClass } from '../gameLogic';

const FALLBACK_PSYCHOLOGICAL_QUESTIONS = [
    "Qual è il ricordo che custodisci con più timore, come fosse vetro sottile?",
    "Quando il silenzio si fa totale, quale voce del tuo passato torna a cercarti?",
    "Se potessi lasciare andare un peso che porti in silenzio da anni, quale forma avrebbe?",
    "Quale promessa non detta continui a sussurrare nei tuoi sogni più quieti?",
    "Cosa temi di più: che nessuno si accorga della tua assenza o di non riconoscerti più?",
];

async function postAI<T>(endpoint: string, payload?: unknown): Promise<T> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
        let errMessage = `Errore API (${response.status})`;
        try {
            const errBody = await response.json();
            if (errBody?.error) errMessage = errBody.error;
        } catch {
            // ignore non-JSON error body
        }
        throw new Error(errMessage);
    }

    return (await response.json()) as T;
}

export const generateEnemyNamesFromAI = async (): Promise<Record<KeyColor, string[]> | null> => {
    try {
        return await postAI<Record<KeyColor, string[]>>('/api/ai/enemy-names', {});
    } catch (error) {
        console.error("Errore durante la generazione dei nomi degli incubi:", error);
        return null;
    }
};

export const generateQuestForNPC = async (gameState: GameState): Promise<Quest | null> => {
    try {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const existingQuests = gameState.players.map(p => p.activeQuestId).filter(Boolean);

        return await postAI<Quest>('/api/ai/quest', {
            playerName: currentPlayer.name,
            playerLevel: currentPlayer.level,
            existingQuests,
        });
    } catch (error) {
        console.error("Errore durante la generazione della missione con l'IA:", error);
        return null;
    }
};

export const generatePsychologicalTest = async (playerClass: PlayerClass): Promise<string[] | null> => {
    try {
        const data = await postAI<{ questions?: string[] }>('/api/ai/psychological-test', {
            playerClass,
        });
        if (Array.isArray(data.questions) && data.questions.length >= 5) {
            return data.questions;
        }
        throw new Error("Invalid response format");
    } catch (error) {
        console.error("Errore generazione test psicologico (uso fallback):", error);
        return FALLBACK_PSYCHOLOGICAL_QUESTIONS;
    }
};

export const prepareDialogueAI = async (enemy: Enemy, ownerProfile: string | null): Promise<any | null> => {
    try {
        return await postAI<any>('/api/ai/dialogue/prepare', {
            enemyName: enemy.name,
            enemyType: enemy.enemyType,
            ownerProfile,
        });
    } catch (error) {
        console.error("Errore preparazione dialogo:", error);
        return null;
    }
};

export const getDialogueResponse = async (
    enemy: Enemy,
    history: { speaker: string; text: string }[],
    profile: any,
    ownerProfile: string | null,
): Promise<{ nextLine: string; empathyScore: number; reasoning: string } | null> => {
    try {
        return await postAI<{ nextLine: string; empathyScore: number; reasoning: string }>(
            '/api/ai/dialogue/respond',
            {
                enemyName: enemy.name,
                history,
                profile,
                ownerProfile,
            },
        );
    } catch (error) {
        console.error("Errore risposta dialogo:", error);
        return null;
    }
};

export const getRecomposedDialogueResponse = async (
    enemy: Enemy,
    history: { speaker: string; text: string }[],
    profile: any,
): Promise<{ nextLine: string } | null> => {
    try {
        return await postAI<{ nextLine: string }>('/api/ai/dialogue/recomposed', {
            enemyName: enemy.name,
            history,
            profile,
        });
    } catch (error) {
        console.error("Errore dialogo ricomposto:", error);
        return null;
    }
};
