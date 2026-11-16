import { Weapon, KeyColor, Quest, Consumable, Treasure, QuestItem, TreasureType, MagicSpell } from '../gameLogic';

// --- IMPOSTAZIONE DI SVILIPPO ---
export const DEV_MODE_SHOW_ALL = true;

// --- COSTANTI DI GIOCO ---
export const GATE_CELLS: { [key in KeyColor]: number } = {
    red: 68,
    yellow: 58,
    white: 67,
    black: 49,
};
export const STOCK_REFRESH_TURN_INTERVAL = 5;
export const PLAYER_START_POSITIONS: { [key: number]: number } = {
    1: 1,  // Player ID 1 (Black) starts on black square
    2: 16, // Player ID 2 (White) starts on white square
    3: 25, // Player ID 3 (Yellow) starts on yellow square
    4: 40, // Player ID 4 (Red) starts on red square
};
export const MAX_INVENTORY_SIZE = 8;
export const BASE_INVENTORY_SIZE = 4;
export const MAX_SPELLS = 4;


export const ENEMY_TYPE_NAMES: { [key in KeyColor]: { singular: string, plural: string } } = {
    black: { singular: "Oscuro", plural: "Gli Oscuri" },
    white: { singular: "Luminoso", plural: "I Luminosi" },
    yellow: { singular: "Acido", plural: "Gli Acidi" },
    red: { singular: "Ardente", plural: "Gli Ardenti" },
};

export const ENEMY_NAMES_BY_TYPE: Record<KeyColor, string[]> = {
    black: ['Decadimento', 'Disgregamento', 'Decomposizione', 'Deperimento'], // Oscuri
    white: ['Depravazione', 'Sozzura', 'Compromissione', 'Intossicazione'], // Luminosi
    yellow: ['Stallo', 'Inerzia', 'Indecisione', 'Immobilità'], // Acidi
    red: ['Delirio', 'Impeto', 'Rabbia', 'Esaltazione'], // Ardenti
};


// --- DATABASE DI GIOCO ---

// FIX: Updated Omit to match changes in Weapon interface (effectiveness -> level, harmonyDice -> damageDice).
export const baseWeapons: Omit<Weapon, 'level' | 'damageDice'>[] = [
    // DESIDERI DI ARMONIA (melee)
    { 
        id: 'd_a_01', 
        name: 'Desiderio di Calma', 
        type: 'melee', 
        costsByLevel: [20, 50, 90, 150, 250, 400], 
        bonusEffect: { 
            name: 'La tua calma precede ogni passo.', 
            description: 'Una corrente di luce tenue che, al tocco, rallenta il caos e lo invita a respirare. Effetto: Quando entri per la prima volta in risonanza con un Incubo, puoi lanciare +1 dado d’Armonia nel primo scambio.' 
        } 
    },
    { 
        id: 'd_a_02', 
        name: 'Desiderio di Accoglienza', 
        type: 'melee', 
        costsByLevel: [25, 60, 110, 180, 290, 450], 
        bonusEffect: { 
            name: 'Ogni Essere trova posto nel tuo spazio interiore.', 
            description: 'Un gesto aperto che abbraccia le forme distorte dell’incubo, restituendo loro un volto umano. Effetto: Quando incontri un “Disperso” (PNG), la sua Fiducia aumenta del +25%.' 
        } 
    },
    { 
        id: 'd_a_03', 
        name: 'Desiderio di Equilibrio', 
        type: 'melee', 
        costsByLevel: [30, 70, 125, 200, 320, 500], 
        bonusEffect: { 
            name: 'Luce e Ombra danzano insieme al centro.', 
            description: 'La volontà di armonizzare opposti: luce e ombra, paura e amore, si fondono in un unico ritmo. Effetto: Ogni volta che ottieni una Risonanza Profonda (critico), rigeneri il 10% della tua Volontà massima.' 
        } 
    },
    { 
        id: 'd_a_04', 
        name: 'Desiderio di Coraggio', 
        type: 'melee', 
        costsByLevel: [35, 80, 140, 220, 350, 550], 
        bonusEffect: { 
            name: 'La paura non si cancella, si attraversa.', 
            description: 'Una fiamma limpida che illumina i recessi più oscuri, non per combatterli, ma per mostrarne la verità. Effetto: Quando la tua Volontà scende sotto il 50%, hai il 25% di probabilità che un tuo dado mancato diventi una Risonanza.' 
        } 
    },
    { 
        id: 'd_a_05', 
        name: 'Desiderio di Presenza', 
        type: 'melee', 
        costsByLevel: [40, 90, 160, 250, 400, 620], 
        bonusEffect: { 
            name: 'Essere, davvero, nel luogo in cui si è.', 
            description: 'Un atto silenzioso, come posare la mano su qualcosa che trema; dissolve la distanza tra chi sogna e chi è sognato. Effetto: Le caselle Sventura hanno il 30% di probabilità in meno di avere effetto su di te.' 
        } 
    },
    // DESIDERI DI LUCE (ranged)
    { 
        id: 'd_l_01', 
        name: 'Desiderio di Memoria', 
        type: 'ranged', 
        costsByLevel: [25, 60, 110, 180, 290, 450], 
        bonusEffect: { 
            name: 'Ricordare è ridare forma all’amore perduto.', 
            description: 'Evoca un frammento di ricordo bello, che l’incubo aveva cancellato; dove cade, nasce nostalgia luminosa. Effetto: Una volta per turno, puoi ripetere un tiro di dado d’Armonia fallito.' 
        } 
    },
    { 
        id: 'd_l_02', 
        name: 'Desiderio di Perdono', 
        type: 'ranged', 
        costsByLevel: [20, 50, 90, 150, 250, 400], 
        bonusEffect: { 
            name: 'Il perdono scioglie le catene invisibili.', 
            description: 'Un raggio che attraversa le ombre e ne scioglie la rigidità. Gli incubi si piegano, come alberi sotto la pioggia. Effetto: Quando liberi un “Disperso” (PNG) dal suo Incubo, rigeneri il 10% della tua Volontà.' 
        } 
    },
    { 
        id: 'd_l_03', 
        name: 'Desiderio di Silenzio', 
        type: 'ranged', 
        costsByLevel: [40, 90, 160, 250, 400, 620], 
        bonusEffect: { 
            name: 'Nel silenzio, anche l’oscurità impara ad ascoltare.', 
            description: 'Una sfera di quiete che espande intorno equilibrio e sospensione: il tempo si ferma, e tutto respira. Effetto: All’inizio di ogni turno, recuperi +1 Volontà se non hai subito dissonanza nel turno precedente.' 
        } 
    },
    { 
        id: 'd_l_04', 
        name: 'Desiderio di Connessione', 
        type: 'ranged', 
        costsByLevel: [30, 70, 125, 200, 320, 500], 
        bonusEffect: { 
            name: 'Ogni sogno tocca un altro sogno.', 
            description: 'Intreccia fili invisibili tra i sogni dispersi, creando ponti di suono e calore. Effetto: Se uno o più membri del gruppo agiscono sull\'Incubo con cui sei in risonanza, ciascuno ottiene +1 dado d’Armonia nel primo turno di scambio.' 
        } 
    },
    { 
        id: 'd_l_05', 
        name: 'Desiderio di Gioia', 
        type: 'ranged', 
        costsByLevel: [35, 80, 140, 220, 350, 550], 
        bonusEffect: { 
            name: 'La gioia è la vibrazione che dissolve l’ombra.', 
            description: 'Il più raro: quando esplode, ogni ombra si colora, ogni incubo danza, e il sogno trova la sua musica. Effetto: Quando ottieni una Risonanza Profonda (critico), tutti i membri del gruppo recuperano +1 Volontà.' 
        } 
    }
];

export const allMagicSpells: Omit<MagicSpell, 'id'>[] = [
    // Categoria 1: Risonanza
    { type: 'intention', name: 'Raggio di Chiarezza', category: 'Risonanza', costToBuy: 50, costToUse: 20, description: 'Infligge 10 danni alla Paura di un incubo. Efficace contro gli Oscuri.', effectTag: 'damage_enemy_dark', value: 10, targetType: 'enemy_on_map' },
    { type: 'intention', name: 'Barriera Vitale', category: 'Risonanza', costToBuy: 40, costToUse: 15, description: 'Assorbe 8 danni dal prossimo attacco. Efficace contro gli Oscuri.', effectTag: 'defend_dark', value: 8, targetType: 'self' },
    { type: 'intention', name: 'Specchio dell\'Anima', category: 'Risonanza', costToBuy: 50, costToUse: 20, description: 'Infligge 10 danni alla Paura di un incubo. Efficace contro i Luminosi.', effectTag: 'damage_enemy_white', value: 10, targetType: 'enemy_on_map' },
    { type: 'intention', name: 'Aura d\'Integrità', category: 'Risonanza', costToBuy: 40, costToUse: 15, description: 'Assorbe 8 danni dal prossimo attacco. Efficace contro i Luminosi.', effectTag: 'defend_white', value: 8, targetType: 'self' },
    { type: 'intention', name: 'Onda di Liberazione', category: 'Risonanza', costToBuy: 50, costToUse: 20, description: 'Infligge 10 danni alla Paura di un incubo. Efficace contro gli Acidi.', effectTag: 'damage_enemy_yellow', value: 10, targetType: 'enemy_on_map' },
    { type: 'intention', name: 'Manto del Flusso', category: 'Risonanza', costToBuy: 40, costToUse: 15, description: 'Assorbe 8 danni dal prossimo attacco. Efficace contro gli Acidi.', effectTag: 'defend_yellow', value: 8, targetType: 'self' },
    { type: 'intention', name: 'Sussurro di Pace', category: 'Risonanza', costToBuy: 50, costToUse: 20, description: 'Infligge 10 danni alla Paura di un incubo. Efficace contro gli Ardenti.', effectTag: 'damage_enemy_red', value: 10, targetType: 'enemy_on_map' },
    { type: 'intention', name: 'Baluardo di Calma', category: 'Risonanza', costToBuy: 40, costToUse: 15, description: 'Assorbe 8 danni dal prossimo attacco. Efficace contro gli Ardenti.', effectTag: 'defend_red', value: 8, targetType: 'self' },
    // Categoria 2: Utilità e Strategia
    { type: 'intention', name: 'Passo Onirico', category: 'Utilità', costToBuy: 75, costToUse: 30, description: 'Ti teletrasporti in una qualsiasi casella visibile e non occupata.', effectTag: 'teleport', targetType: 'cell_on_map' },
    { type: 'intention', name: 'Sesto Senso', category: 'Utilità', costToBuy: 60, costToUse: 25, description: 'Rivela la posizione del tuo oggetto missione per 3 turni.', effectTag: 'reveal_quest_item', targetType: 'none' },
    { type: 'intention', name: 'Percezione Acuita', category: 'Utilità', costToBuy: 40, costToUse: 15, description: 'Rivela tutti gli incubi nascosti di un tipo a tua scelta.', effectTag: 'reveal_enemy_type', targetType: 'none' },
    { type: 'intention', name: 'Sorgente di Volontà', category: 'Utilità', costToBuy: 45, costToUse: 18, description: 'Ripristini 8 punti Volontà a te stesso o a un alleato.', effectTag: 'heal_target', value: 8, targetType: 'other_player' },
    { type: 'intention', name: 'Eco Ristoratore', category: 'Utilità', costToBuy: 100, costToUse: 40, description: 'Ripristina 4 punti Volontà a tutta la squadra.', effectTag: 'heal_all', value: 4, targetType: 'none' },
    { type: 'intention', name: 'Pelle di Pietra', category: 'Utilità', costToBuy: 50, costToUse: 20, description: 'Aumenta la tua Stabilità di +2 per 3 turni.', effectTag: 'buff_toughness', value: 2, targetType: 'self' },
    { type: 'intention', name: 'Fascino del Sognatore', category: 'Utilità', costToBuy: 25, costToUse: 10, description: 'Il tuo prossimo acquisto da un Genio costa il 30% in meno.', effectTag: 'merchant_discount', value: 0.3, targetType: 'none' },
    { type: 'intention', name: 'Evocazione Instabile', category: 'Utilità', costToBuy: 125, costToUse: 50, description: 'Un Genio appare sulla tua casella fino alla fine del tuo turno.', effectTag: 'summon_merchant', targetType: 'none' },
    { type: 'intention', name: 'Riflesso Inatteso', category: 'Utilità', costToBuy: 85, costToUse: 35, description: 'La prossima volta che ottieni un consumabile, ne ottieni una copia.', effectTag: 'duplicate_consumable', targetType: 'none' },
    { type: 'intention', name: 'Letargia Improvvisa', category: 'Utilità', costToBuy: 60, costToUse: 25, description: 'Un incubo visibile salta il suo prossimo attacco.', effectTag: 'skip_enemy_turn', targetType: 'enemy_on_map' },
    { type: 'intention', name: 'Trasmutazione Volontaria', category: 'Utilità', costToBuy: 0, costToUse: 0, description: 'Sacrifica da 1 a 5 Volontà per guadagnare 4 Intento per ogni punto sacrificato.', effectTag: 'hp_to_coins', value: 4, targetType: 'self' },
    { type: 'intention', name: 'Intuito Mimetico', category: 'Utilità', costToBuy: 100, costToUse: 0, description: 'Copia la prossima Intenzione lanciata da un altro giocatore, pagando metà del suo costo.', effectTag: 'copy_spell', targetType: 'none' },
];

export const allConsumables: Omit<Consumable, 'id'>[] = [
    { name: 'Pozione di Cura Minore', type: 'potion', description: 'Recupera 5 punti Volontà.', effectTag: 'heal', value: 5, cost: 25 },
    { name: 'Pergamena Palla di Fuoco', type: 'spellScroll', description: 'Infligge 3 punti dissonanza a un incubo visibile sulla mappa.', effectTag: 'damage_enemy', value: 3, cost: 40 },
    { name: 'Zaino Piccolo', type: 'bag', description: 'Aumenta permanentemente la capacità del tuo inventario a 5 slot.', effectTag: 'expand_inventory', value: 5, cost: 100 },
    { name: 'Borsa Media', type: 'bag', description: 'Aumenta permanentemente la capacità del tuo inventario a 6 slot.', effectTag: 'expand_inventory', value: 6, cost: 200 },
    { name: 'Zaino Grande', type: 'bag', description: 'Aumenta permanentemente la capacità del tuo inventario a 7 slot.', effectTag: 'expand_inventory', value: 7, cost: 350 },
    { name: 'Sacca da Viaggio', type: 'bag', description: 'Aumenta permanentemente la capacità del tuo inventario a 8 slot (massimo).', effectTag: 'expand_inventory', value: 8, cost: 500 }
];

export const offlineQuests: Quest[] = [
    { id: 'q_alberto', title: 'Alberto', description: '«Non le ho mai detto addio. Lisa, il treno partiva e io restavo lì, muto, come se ci fosse ancora tempo. Ma il tempo non torna, vero?»\n\n“Ritrovate il Treno per Lisa, così che possa dirle addio.”', requiredItemName: 'Treno per Lisa', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_luca', title: 'Luca', description: '«Corro. Le strade si piegano su se stesse... non riesco a ritrovare "Casa". Sento che non arriverò mai da nessuna parte.»\n\n“Trovate la Mappa di Casa per Luca, e tornate a indicargli la direzione.”', requiredItemName: 'Mappa di Casa', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_chiara', title: 'Chiara', description: '«Sono in una stanza piena di specchi. Ogni riflesso ha un volto diverso... ma nessuno è il mio. Quando provo a toccare il vetro, si incrina, e dietro… dietro non c’è niente.»\n\n“Trovate lo Specchio Integro di Chiara. Restituitele il suo volto.”', requiredItemName: 'Specchio Integro', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_danilo', title: 'Danilo', description: '«La mia chitarra suona da sola... i fili si attorcigliano alle mani, stringendo sempre di più. Così sono costretto a strappare via le corde e rimango sempre senza.»\n\n“Trovate la Chitarra Autentica di Danilo. Permettetegli di ritrovare la sua voce.”', requiredItemName: 'Chitarra Autentica', reward: { type: 'coins', baseValue: 60, levelBonus: 5 } },
    { id: 'q_miriam', title: 'Miriam', description: '«Tendo la mano a qualcuno nel buio, ma ogni volta la pelle si indurisce, diventa pietra... il cuore batte, imprigionato nel marmo.»\n\n“Trovate il Cuore di Pietra di Miriam e riportateglielo.”', requiredItemName: 'Cuore di Pietra', reward: { type: 'coins', baseValue: 80, levelBonus: 10 } },
    { id: 'q_enrico', title: 'Enrico', description: '«Apro la finestra e una dopo l’altra le stelle si spengono... Quando resta solo il buio, capisco che sono stato io.»\n\n“Recuperate il Firmamento di Enrico, e riaccendete in lui il cielo interiore.”', requiredItemName: 'Firmamento di Enrico', reward: { type: 'coins', baseValue: 60, levelBonus: 5 } },
    { id: 'q_sofia', title: 'Sofia', description: '«Sono circondata da foto di me che sorridono. Migliaia. Tutti quei sorrisi mi chiedono di continuare a ballare... e io sono nuda, e fa freddo, molto freddo.»\n\n“Trovate la Veste di Sofia. Restituitele il calore che nasce dal riconoscersi.”', requiredItemName: 'Veste di Sofia', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_marco', title: 'Marco', description: '«Riordino la stanza, ma gli oggetti cambiano posto da soli... Più cerco di mettere tutto in ordine, più cresce il disordine.»\n\n“Ritrovate la Spensieratezza di Marco. A volte lasciare andare il controllo vuol dire ritrovarlo.”', requiredItemName: 'Spensieratezza di Marco', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_giulia', title: 'Giulia', description: '«Leggo il libro della mia vita... ma ogni parola cancella un ricordo. Quando chiudo il libro non so più chi sono.»\n\n“Trovate la Pagina Bianca di Giulia. Restituitele lo spazio per scrivere la sua storia.”', requiredItemName: 'Pagina Bianca di Giulia', reward: { type: 'coins', baseValue: 60, levelBonus: 5 } },
    { id: 'q_andrea', title: 'Andrea', description: '«Costruisco torri di vetro. Perfette, bellissime... Ma si frantumano in mille pezzi, senza fare rumore, come se poggiassero nel nulla!»\n\n“Trovate il Punto d\'Appoggio di Andrea.”', requiredItemName: 'Punto d\'Appoggio', reward: { type: 'coins', baseValue: 60, levelBonus: 5 } },
    { id: 'q_irene', title: 'Irene', description: '«Non riesco più a ricordare il suono della sua risata. C’era in un vecchio nastro, ma l’ho fatto cadere e si è srotolato nel vento.»\n\n“Trovate il Nastro Srotolato di Irene. Ridatele il ricordo del suono che amava.”', requiredItemName: 'Nastro Srotolato', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_elena', title: 'Elena', description: '«Ero io quella che rideva, ti ricordi Papà? Ora sogno di ridere ancora, ma la mia bocca non si apre. È come se avessi paura della gioia.»\n\n“Recuperate la Risata di Elena. Restituitele la legittimità di provare felicità.”', requiredItemName: 'Risata di Elena', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
    { id: 'q_roberta', title: 'Roberta', description: '«Non ho mai scelto nulla nella mia vita... Eppure ricordo di avere avuto anch\'io un desiderio, un tempo... ma qual era?»\n\n“Aiutate Roberta a ricordare il suo Desiderio Dimenticato.”', requiredItemName: 'Desiderio Dimenticato', reward: { type: 'coins', baseValue: 50, levelBonus: 5 } },
];

const newQuestItemNames = offlineQuests.map(q => q.requiredItemName);

export const allTreasures: Omit<Treasure, 'id' | 'position' | 'pawnImage' | 'isVisible'>[] = [
    { name: 'Borsa di Monete', type: 'coins', value: 10 }, { name: 'Borsa di Monete', type: 'coins', value: 15 }, { name: 'Borsa di Monete', type: 'coins', value: 20 }, { name: 'Forziere Piccolo', type: 'coins', value: 30 }, { name: 'Forziere Piccolo', type: 'coins', value: 40 }, { name: 'Tesoro Nascosto', type: 'coins', value: 50 }, { name: 'Tesoro Nascosto', type: 'coins', value: 60 }, { name: 'Tesoro Nascosto', type: 'coins', value: 75 },
    // Aggiungi i nuovi oggetti missione come possibili tesori
    // FIX: Explicitly cast the `type` property to `TreasureType` to satisfy the type checker.
    ...newQuestItemNames.map(name => ({ name: 'Oggetto Misterioso', type: 'questItem' as TreasureType, itemName: name as QuestItem['name'] })),
    // FIX: Explicitly cast the `type` property to `TreasureType`.
    { name: 'Pozione Trovata', type: 'consumable' as TreasureType, consumableId: 'Pozione di Cura Minore' },
    // FIX: Explicitly cast the `type` property to `TreasureType`.
    { name: 'Borsa Trovata', type: 'consumable' as TreasureType, consumableId: 'Zaino Piccolo' },
    // FIX: Explicitly cast the `type` property to `TreasureType`.
    { name: 'Borsa Trovata', type: 'consumable' as TreasureType, consumableId: 'Borsa Media' }
];


export const misfortuneEffects: string[] = [
    "Distrazione: Un incubo appare all'improvviso e distrae la tua attenzione, affrontalo! Effetto: Compare un incubo unico, 'Distrazione', e devi affrontarlo.",
    "Vampiri dei sogni: Incontri dei parassiti onirici, si sono approfittati della tua pigrizia e ti hanno sottratto intento. Effetto: Il tuo Intento viene dimezzato (per difetto).",
    "Pigrizia: Saper di poter sognare non è sognare. Sogna chi crea, non chi dorme! Effetto: Perdi il tuo prossimo turno di gioco.",
    "Confusione: La tua mente è confusa, non riesce a tenere il focus sulla realtà sognante. Finisci dove ti porta il Caos. Effetto: Vieni spostato in una casella casuale entro 7 caselle di distanza.",
    "Incanto: Un incubo seduttore ti ha incantato, consumando un po' della tua determinazione. Effetto: Perdi 2 punti Volontà.",
    "Mancanza di fiducia: Hai tentennato di fronte alla paura e il tuo focus si è spento per un attimo. Effetto: Il 'desiderio' che hai equipaggiato viene eliminato dal gioco.",
    "Affaticamento: La stanchezza arriva quando si comincia a sognare senza sapere cosa sognare. Riposati! Effetto: Per il tuo prossimo turno, il risultato del dado è dimezzato (per difetto).",
    "Arroganza: L'arroganza non si addice a un esploratore dei sogni. Effetto: Un incubo nascosto sulla mappa diventa più forte (+1 Determinazione, +1 Stabilità) e ti rivela la sua posizione.",
    "Mancanza di entusiasmo: Nel mondo dei sogni l'entusiasmo è una risorsa preziosa. Effetto: Perdi 10 Intento. Se non ne hai abbastanza, perdi 3 punti Volontà.",
    "Paura: Cedere alla paura nel mondo dei sogni, ti espone agli incubi.\" Effetto: \"Nel tuo prossimo combattimento, lanci un dado in meno."
];

export const blessingEffects: string[] = [
    "Occhio Vigile: \"La tua attenzione è limpida; La chiara attenzione produce \"intento\".\" effetto: Ottieni +20 al tuo \"intento\"",
    "Visione: \"Avere una visione rende chiaro l'intento, e la tua volontà aumenta.\" effetto: \"Recuperi 3 punti \"volontà\".\"",
    "Gioia: La gioia compare quando sei veramente te stesso. Mostra al mondo il tuo tesoro, e il mondo ti mostrerà il suo.\" Effetto: \" rendi visibile un tesoro sulla mappa, in modo permanente.\"",
    "Entusiasmo: L'entusiasmo rende i sogni più incantevoli. Non senti la stanchezza e procedi con coraggio di un altro passo. \" Effetto: \"Se vuoi, puoi giocare un altro turno immediatamente.\"",
    "Nuova esperienza: Grazie a una nuova esperienza ora padroneggi meglio il tuo intento, e usi meglio i tuoi desideri.  Ottieni un desiderio di livello (livello attuale del giocatore) di un tipo che non possiedi.",
    "Intuizione: Quando il cuore è aperto, la percezione illumina ogni cosa e puoi \"vedere\" ovunque tu voglia.\" Effetto: \"scopri cosa contiene una casella di tua scelta.\"",
    "Coraggio: Il coraggio è la delicata forza dell'intento che ti rende impavido e determinato difronte al prossimo incubo.\" effetto: \"Nel tuo prossimo combattimento, lanci un dado in più.\"",
    "Sostegno umano: Tutto e nelle tue mani, ma sapere quando chiedere aiuto è un atto di umiltà necessario. Ricevi protezione da un gruppo di individui che hai incontrato.\" effetto: \"nel tuo prossimo combattimento verrà annullato un danno che dovresti subire.\"",
    "Efficienza: Quando la volontà vuole realizzare un desiderio deve saper essere efficiente, l'Amore, come il calore, sarà sempre lo scarto.\" Effetto: Il prossimo oggetto che negozierai con un \"Genio\" costerà il 50% in meno di intento.\"",
    "Attenzione Viva: I tuoi occhi sono vigili e la tua volontà si rafforza su ogni tuo desiderio.\" Effetto: \"Trovi una pozione di Vita, quando la usi ripristina +5 alla tua volontà."
];