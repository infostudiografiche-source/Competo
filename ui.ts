/**
 * Mostra l'animazione del lancio dei dadi e attende il suo completamento.
 * L'animazione può essere saltata cliccando sull'overlay.
 * @param diceValues - Un array di numeri che rappresentano i risultati dei dadi.
 * @param message - Il messaggio da visualizzare durante il lancio.
 * @param color - Il colore di sfondo (esadecimale) per le facce dei dadi.
 * @returns Una Promise che si risolve quando l'animazione è finita.
 */
export const showDiceRoll = (diceValues: number[], message: string, color?: string): Promise<void> => {
    return new Promise(resolve => {
        const overlay = document.getElementById('dice-roll-overlay') as HTMLDivElement;
        const messageEl = document.getElementById('dice-roll-message') as HTMLParagraphElement;
        const die1 = document.getElementById('die1') as HTMLDivElement;
        const die2 = document.getElementById('die2') as HTMLDivElement;

        if (!overlay || !messageEl || !die1 || !die2) {
            console.error("Dice elements not found in the DOM.");
            return resolve();
        }

        const dice = [die1, die2];
        let rollTimeout: ReturnType<typeof setTimeout>;
        let resultTimeout: ReturnType<typeof setTimeout>;
        let isSkipped = false;

        const cleanupAndResolve = () => {
            // Rimuove tutti gli event listener e nasconde l'overlay
            overlay.removeEventListener('click', skipAnimation);
            overlay.classList.add('hidden');
            // Pulisce gli stili inline
            dice.forEach(die => {
                die.style.removeProperty('--die-face-color');
                die.style.removeProperty('--die-dot-color');
            });
            resolve();
        };

        const showResult = () => {
            // Interrompe l'animazione di rotolamento e mostra il risultato finale
            dice.forEach((die, index) => {
                if (index < diceValues.length) {
                    die.classList.remove('rolling');
                    die.classList.add(`show-face-${diceValues[index]}`);
                }
            });

            // Pulisce il timeout del risultato precedente per evitare doppie esecuzioni
            clearTimeout(resultTimeout);
            
            // Imposta un nuovo timeout per nascondere l'overlay.
            // Se l'animazione è stata saltata, l'attesa è più breve.
            const resultDisplayTime = isSkipped ? 500 : 2000;
            resultTimeout = setTimeout(cleanupAndResolve, resultDisplayTime);
        };

        const skipAnimation = () => {
            if (isSkipped) return; // Evita che lo skip venga eseguito più volte
            isSkipped = true;

            clearTimeout(rollTimeout); // Annulla il timeout che avrebbe mostrato il risultato
            showResult(); // Mostra immediatamente il risultato
        };

        // --- Preparazione dei dadi e dell'overlay ---
        messageEl.textContent = message;

        if (color) {
            const dotColor = (color === '#2c3e50' || color === '#c0392b') ? '#fff' : '#333';
            dice.forEach(die => {
                die.style.setProperty('--die-face-color', color);
                die.style.setProperty('--die-dot-color', dotColor);
            });
        }

        dice.forEach((die, index) => {
            die.className = 'die';
            if (index < diceValues.length) {
                die.classList.remove('hidden');
            } else {
                die.classList.add('hidden');
            }
        });

        overlay.classList.remove('hidden');
        overlay.addEventListener('click', skipAnimation);

        // --- Avvio del flusso di animazione ---
        // Avvia l'animazione di rotolamento dopo un breve ritardo
        setTimeout(() => {
            if (isSkipped) return; // Non avviare se nel frattempo è stato saltato
            dice.forEach((die, index) => {
                if (index < diceValues.length) {
                    die.classList.add('rolling');
                }
            });
        }, 50);

        // Imposta il timeout per la fine dell'animazione di rotolamento
        rollTimeout = setTimeout(() => {
            if (!isSkipped) {
                showResult();
            }
        }, 1500); // Durata dell'animazione di rotolamento
    });
};