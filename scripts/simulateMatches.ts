import assert from 'node:assert/strict';
import * as gameEngine from '../game/engine';
import { createInitialGameState, createWeaponInstance } from '../game/initialState';
import { allConsumables, allMagicSpells, PLAYER_START_POSITIONS } from '../game/constants';
import type { GameState, KeyColor, PlayerClass, PlayerCustomization } from '../gameLogic';

const ALL_CLASSES: PlayerClass[] = ['guerriero', 'sentinella', 'mago'];
const ALL_COLORS: KeyColor[] = ['red', 'yellow', 'white', 'black'];

function assertInvariants(state: GameState, context: string): void {
    for (const p of state.players) {
        assert(!Number.isNaN(p.hp), `${context}: player ${p.id} hp is NaN`);
        assert(!Number.isNaN(p.coins), `${context}: player ${p.id} coins is NaN`);
        assert(p.hp >= 0 && p.hp <= p.maxHp, `${context}: player ${p.id} hp out of range (${p.hp}/${p.maxHp})`);
        assert(p.coins >= 0, `${context}: player ${p.id} negative coins (${p.coins})`);
        assert(p.inventory.length <= p.inventorySize, `${context}: player ${p.id} inventory overflow`);
        assert(p.position >= 1 && p.position <= 69, `${context}: player ${p.id} invalid position ${p.position}`);
        if (p.isDead) {
            assert(
                !(state.combatState.active && state.players[state.currentPlayerIndex]?.id === p.id),
                `${context}: dead active player stuck in combatState.active`
            );
        }
    }
    for (const c of ALL_COLORS) {
        const prog = state.teamKeyProgress?.[c] ?? 0;
        assert(prog >= 0 && prog <= 5, `${context}: invalid teamKeyProgress[${c}]=${prog}`);
    }
}

function stepCombatForCurrentActor(state: GameState): GameState {
    let s = state;
    let safety = 0;
    while (s.combatState.active && safety < 25) {
        safety++;
        const phase = s.combatState.combatPhase;
        const enemy = s.enemies.find(e => e.id === s.combatState.enemyId);
        if ((phase === 'initial' || phase === 'round_over') && s.combatState.attacksMadeThisTurn < 3 && enemy && enemy.hp > 0) {
            s = gameEngine.startAttackRolls(s).newState;
        } else if (phase === 'attack_rolls') {
            s = gameEngine.startDefenseRolls(s);
        } else if (phase === 'defense_rolls') {
            s = gameEngine.applyCombatResults(s);
        } else if (phase === 'results_display') {
            const res = gameEngine.resolveCombatRound(s);
            s = res.newState;
            if (res.modalInfo?.type === 'loot_choice') {
                s = gameEngine.pickUpAllLoot(s);
            }
        } else {
            s = gameEngine.endCombatAndTurn(s).newState;
            break;
        }
        assertInvariants(s, 'combat-step');
    }
    assert(safety < 25, 'Combat loop exceeded safety limit');
    return s;
}

function autoHandlePendingUpgrades(state: GameState): GameState {
    let s = state;
    const player = s.players[s.currentPlayerIndex];
    if (!player || player.pendingUpgrades <= 0) return s;

    let guard = 0;
    while (s.players[s.currentPlayerIndex].pendingUpgrades > 0 && guard < 10) {
        guard++;
        const p = s.players[s.currentPlayerIndex];
        const atk = p.attackDice.find(d => d.hits < 5);
        const def = p.defenseDice.find(d => d.hits < 5);
        if (atk) {
            s = gameEngine.applyDiceUpgrade(s, 'attack', atk.id, 'add_hit');
        } else if (def) {
            s = gameEngine.applyDiceUpgrade(s, 'defense', def.id, 'add_hit');
        } else {
            break;
        }
    }
    return s;
}

async function runFullMatchSimulations(matchCount: number): Promise<void> {
    let victories = 0;
    let defeats = 0;
    let turnCaps = 0;
    let treasureLandings = 0;
    let specialLandings = 0;
    let combatEncounters = 0;

    for (let m = 0; m < matchCount; m++) {
        const playerCount = (m % 4) + 1;
        const customizations: PlayerCustomization[] = Array.from({ length: playerCount }, (_, idx) => ({
            name: `Sim${idx + 1}`,
            playerClass: ALL_CLASSES[(m + idx) % ALL_CLASSES.length],
            controller: 'ai',
        }));

        let state = await createInitialGameState(playerCount, customizations, 'offline', []);
        assert.equal(state.merchants.length, 2, `match-${m}: expected 2 merchants`);
        assert.equal(state.specialSquares.length, 10, `match-${m}: expected 10 special squares`);
        assertInvariants(state, `match-${m}-init`);

        let steps = 0;
        const maxSteps = 120;
        while (
            steps < maxSteps &&
            state.gameStatePhase !== 'gameOver' &&
            !state.players.every(p => p.isDead)
        ) {
            steps++;
            state = autoHandlePendingUpgrades(state);

            if (state.gameStatePhase === 'rolling') {
                const { newState } = gameEngine.rollDice(state);
                state = newState;
                const action = gameEngine.calculateAIMove(state);

                if (action.type === 'move') {
                    const { newState: landedState, modalInfo } = gameEngine.movePlayerAndResolveLanding(state, action.targetCellId);
                    state = landedState;
                    if (modalInfo?.type === 'treasure_reveal') treasureLandings++;
                    if (modalInfo?.type === 'special_square_reveal') specialLandings++;
                    if (modalInfo?.type === 'loot_choice') {
                        state = gameEngine.pickUpAllLoot(state);
                    }
                    if (modalInfo?.type === 'enemy_encounter') {
                        combatEncounters++;
                        state = gameEngine.initiateCombat(state, modalInfo.enemy.id, modalInfo.hasPlayerMoved).newState;
                    }
                    if (state.gameStatePhase === 'cell_inspection') {
                        state = gameEngine.inspectCell(state, ((steps * 7) % 48) + 1);
                    }
                } else if (action.type === 'use_consumable') {
                    const p = state.players[state.currentPlayerIndex];
                    state = gameEngine.useConsumable(state, p.id, action.inventoryIndex).newState;
                } else if (action.type === 'initiate_combat') {
                    combatEncounters++;
                    state = gameEngine.initiateCombat(state, action.enemyId, false).newState;
                } else if (action.type === 'attack') {
                    combatEncounters++;
                }
            }

            if (state.combatState.active) {
                state = stepCombatForCurrentActor(state);
            }

            if (state.gameStatePhase === 'cell_inspection') {
                state = gameEngine.inspectCell(state, ((steps * 11) % 48) + 1);
            }
            if (state.gameStatePhase === 'spell_target_enemy' || state.gameStatePhase === 'spell_target_cell') {
                state = gameEngine.cancelTargetingMode(state);
            }

            state = autoHandlePendingUpgrades(state);
            if (state.gameStatePhase === 'gameOver' || state.players.every(p => p.isDead)) break;

            if (state.gameStatePhase !== 'rolling') {
                const endRes = gameEngine.endTurn(state);
                state = endRes.newState;
                if (endRes.modalInfo?.type === 'enemy_encounter') {
                    combatEncounters++;
                    state = gameEngine.initiateCombat(state, endRes.modalInfo.enemy.id, endRes.modalInfo.hasPlayerMoved).newState;
                    state = stepCombatForCurrentActor(state);
                    if (state.gameStatePhase !== 'rolling' && state.gameStatePhase !== 'gameOver' && !state.players.every(p => p.isDead)) {
                        state = gameEngine.endTurn(state).newState;
                    }
                }
            }

            assertInvariants(state, `match-${m}-step-${steps}`);
        }

        if (state.gameStatePhase === 'gameOver') victories++;
        else if (state.players.every(p => p.isDead)) defeats++;
        else turnCaps++;
    }

    assert(treasureLandings > 0, 'Expected simulated players to land on treasures');
    assert(specialLandings > 0, 'Expected simulated players to land on special squares');
    assert(combatEncounters > 0, 'Expected simulated players to engage in combat');
    console.log(
        `[Match Sim] ${matchCount} matches passed! Victories=${victories}, Defeats=${defeats}, TurnCap=${turnCaps}, Treasures=${treasureLandings}, Specials=${specialLandings}, Combats=${combatEncounters}`
    );
}

async function runTargetedFlowChecks(): Promise<void> {
    const baseCustom: PlayerCustomization[] = [
        { name: 'Aria', playerClass: 'guerriero', controller: 'human' },
        { name: 'Bram', playerClass: 'sentinella', controller: 'human' },
        { name: 'Ciro', playerClass: 'mago', controller: 'human' },
    ];
    let state = await createInitialGameState(3, baseCustom, 'offline', []);

    // Helper to clone a clean board without random entities on specific test cells
    const cloneCleanAt = (cellsToClear: number[]): GameState => {
        const s = JSON.parse(JSON.stringify(state)) as GameState;
        const set = new Set(cellsToClear);
        s.enemies = s.enemies.map(e => (set.has(e.position) && !e.isFinalBoss ? { ...e, position: 48 } : e));
        s.treasures = s.treasures.filter(t => !set.has(t.position));
        s.specialSquares = s.specialSquares.filter(sq => !set.has(sq.position));
        s.npcs = s.npcs.filter(n => !set.has(n.position));
        s.worldItems = s.worldItems.filter(w => !set.has(w.position));
        s.merchants = s.merchants.map(m => (set.has(m.position) ? { ...m, position: 47 } : m));
        return s;
    };

    // 1. Treasure & Special Squares (every index 0..9 blessing + misfortune, including dead-Titan fallback)
    const testSquarePos = 3;
    const tState = cloneCleanAt([testSquarePos]);
    tState.players[0].position = 1;
    tState.gameStatePhase = 'moving';
    tState.diceResult = 2;
    tState.reachableCells = [testSquarePos];
    tState.treasures.push({
        id: 999,
        position: testSquarePos,
        isVisible: false,
        pawnImage: '',
        name: 'Scrigno Onirico',
        type: 'coins',
        value: 15,
    });
    const tCoinsBefore = tState.players[0].coins;
    const origRandTreasure = Math.random;
    Math.random = () => 0.4; // Coin reward branch (roll >= finalSpellChance and < finalSpellChance + coinChance)
    try {
        const tLanding = gameEngine.movePlayerAndResolveLanding(tState, testSquarePos);
        assert.equal(tLanding.modalInfo?.type, 'treasure_reveal');
        assert(!tLanding.newState.treasures.some(t => t.id === 999), 'Treasure should be consumed upon discovery');
        assert(
            tLanding.newState.players[0].coins >= tCoinsBefore + 10 &&
            tLanding.newState.players[0].coins <= tCoinsBefore + 30,
            `Expected coin reward between 10 and 30, got ${tLanding.newState.players[0].coins - tCoinsBefore}`
        );
        assert.equal(tLanding.newState.gameStatePhase, 'end_turn');
        assert.equal(gameEngine.shouldPreservePhaseOnModalClose('end_turn'), false);
    } finally {
        Math.random = origRandTreasure;
    }

    // Test Intuition (blessing index 5) preserves cell_inspection phase & inspectCell clears it
    for (let idx = 0; idx < 10; idx++) {
        const origRandom = Math.random;
        Math.random = () => idx / 10 + 0.01;
        try {
            const s = cloneCleanAt([4, 7]);
            s.specialSquares = [
                { id: 800 + idx, type: 'blessing', name: 'Benedizione', position: 4, isVisible: false, pawnImage: '' },
            ];
            const res = gameEngine.applySpecialSquareEffect(s, s.specialSquares[0]);
            if (idx === 5) {
                assert.equal(res.newState.gameStatePhase, 'cell_inspection');
                assert.equal(gameEngine.shouldPreservePhaseOnModalClose(res.newState.gameStatePhase), true);
                const inspected = gameEngine.inspectCell(res.newState, 7);
                assert.equal(inspected.gameStatePhase, 'end_turn');
            }
            assertInvariants(res.newState, `blessing-${idx}`);
        } finally {
            Math.random = origRandom;
        }
    }

    // Misfortunes 0..9 including dead Wandering Titan case 0 fallback
    for (let idx = 0; idx < 10; idx++) {
        const origRandom = Math.random;
        Math.random = () => idx / 10 + 0.01;
        try {
            const s = cloneCleanAt([5]);
            s.specialSquares = [
                { id: 900 + idx, type: 'misfortune', name: 'Sventura', position: 5, isVisible: false, pawnImage: '' },
            ];
            s.players[0].coins = 12;
            const titan = s.enemies.find(e => e.isWanderingTitan);
            if (titan) titan.hp = 0; // test dead Titan fallback on index 0
            const res = gameEngine.applySpecialSquareEffect(s, s.specialSquares[0]);
            if (idx === 0) {
                assert.equal(res.newState.players[0].coins, 7, 'Dead Titan fallback should deduct 5 coins');
            }
            assertInvariants(res.newState, `misfortune-${idx}`);
        } finally {
            Math.random = origRandom;
        }
    }

    // 2. Merchant purchase & insufficient coins
    const mState = JSON.parse(JSON.stringify(state)) as GameState;
    const merchant = mState.merchants[0];
    mState.players[0].coins = 200;
    if (merchant.stock.length > 0) {
        const buyOk = gameEngine.purchaseItemFromMerchant(mState, merchant.stock[0], merchant.id);
        assert.equal(buyOk.success, true);
        mState.players[0].coins = 0;
        const buyFail = gameEngine.purchaseItemFromMerchant(mState, merchant.stock[0], merchant.id);
        assert.equal(buyFail.success, false);
    }

    // 3. Shared Stash deposit / withdraw / moveItem
    const stashState = JSON.parse(JSON.stringify(state)) as GameState;
    stashState.players[0].position = PLAYER_START_POSITIONS[1];
    stashState.players[0].inventory.push(createWeaponInstance('d_a_01', 1));
    const depState = gameEngine.depositToStash(stashState, 0);
    assert(depState.sharedStash.some(i => i !== null));
    const wState = gameEngine.withdrawFromStash(depState, 0);
    assert.equal(wState.players[0].inventory.length, stashState.players[0].inventory.length);

    // 4. Ally revival
    const revState = cloneCleanAt([2, 6]);
    revState.players[1].isDead = true;
    revState.players[1].hp = 0;
    revState.players[1].position = 6;
    revState.players[0].position = 2;
    revState.gameStatePhase = 'moving';
    revState.diceResult = 4;
    revState.reachableCells = [6];
    const afterRev = gameEngine.movePlayerAndResolveLanding(revState, 6).newState;
    assert.equal(afterRev.players[1].isDead, false);
    assert.equal(afterRev.players[1].hp, 1);

    // 5. Combat defeat leaves combat inactive & phase end_turn
    const defeatState = JSON.parse(JSON.stringify(state)) as GameState;
    const targetEnemy = defeatState.enemies.find(e => !e.isFinalBoss && !e.isWanderingTitan)!;
    defeatState.players[0].hp = 1;
    defeatState.combatState = {
        active: true,
        enemyId: targetEnemy.id,
        combatPhase: 'results_display',
        attacksMadeThisTurn: 1,
        playerRolls: null,
        enemyRolls: null,
        playerDefenseRolls: null,
        enemyDefenseRolls: null,
        playerDamageTaken: 5,
        enemyDamageTaken: 0,
        hasPlayerMoved: true,
    };
    const defeated = gameEngine.resolveCombatRound(defeatState);
    assert.equal(defeated.newState.players[0].isDead, true);
    assert.equal(defeated.newState.combatState.active, false);
    assert.equal(defeated.newState.gameStatePhase, 'end_turn');

    // 6. Attempt flee & Dialogue failure
    const fleeState = JSON.parse(JSON.stringify(state)) as GameState;
    const fleeEnemy = fleeState.enemies[0];
    fleeState.players[0].position = fleeEnemy.position;
    const fleeRes = gameEngine.attemptFlee(fleeState, false);
    assert(fleeRes.modalInfo?.title === 'Fuga Riuscita!' || fleeRes.modalInfo?.title === 'Fuga Fallita!');
    const diagFail = gameEngine.handleDialogueFailure(fleeState, fleeEnemy.id, true);
    assert.equal(diagFail.modalInfo?.title, 'Dialogo Fallito!');

    // 7. Fireball Scroll targeting & cancelTargetingMode
    const fireballTemplate = allConsumables.find(c => c.name === 'Pergamena Palla di Fuoco')!;
    const scrollState = JSON.parse(JSON.stringify(state)) as GameState;
    const visEnemy = scrollState.enemies.find(e => !e.isFinalBoss && !e.isWanderingTitan)!;
    visEnemy.isVisible = true;
    const origVisHp = visEnemy.hp;
    scrollState.players[0].inventory.push({ ...fireballTemplate, id: 'fb_test' });
    const fbIdx = scrollState.players[0].inventory.length - 1;
    const useScroll = gameEngine.useConsumable(scrollState, scrollState.players[0].id, fbIdx);
    assert.equal(useScroll.newState.gameStatePhase, 'spell_target_enemy');
    const cancelled = gameEngine.cancelTargetingMode(useScroll.newState);
    assert.equal(cancelled.gameStatePhase, 'rolling');
    assert.equal(cancelled.players[0].inventory.length, scrollState.players[0].inventory.length);

    const reUse = gameEngine.useConsumable(cancelled, cancelled.players[0].id, fbIdx);
    const fbHit = gameEngine.applySpellEffectToTarget(reUse.newState, visEnemy.position);
    const enemyAfterFb = fbHit.newState.enemies.find(e => e.id === visEnemy.id);
    assert(!enemyAfterFb || enemyAfterFb.hp < origVisHp, 'Fireball scroll should damage or defeat target enemy');

    // 8. All 20 Magic Spells + interactive resolvers + copy prompt
    for (const template of allMagicSpells) {
        const spState = JSON.parse(JSON.stringify(state)) as GameState;
        const caster = spState.players[0];
        caster.coins = 50;
        caster.hp = Math.max(10, caster.hp);
        spState.enemies[0].isVisible = true;
        const spellInstance = { ...template, id: `sp_${template.name}` };
        caster.spells = [spellInstance];

        const castOut = gameEngine.castSpell(spState, caster.id, spellInstance.id);
        if (castOut.modalInfo?.type === 'choose_enemy_type_for_spell') {
            const resolved = gameEngine.resolveRevealEnemyTypeSpell(castOut.newState, spellInstance.id, 'black');
            assert.equal(resolved.modalInfo?.type, 'info');
        } else if (castOut.modalInfo?.type === 'hp_sacrifice_choice') {
            const resolved = gameEngine.resolveHpSacrificeSpell(castOut.newState, spellInstance.id, 2);
            assert(resolved.newState.players[0].coins > spState.players[0].coins - spellInstance.costToUse);
        } else if (
            castOut.newState.gameStatePhase === 'spell_target_enemy' ||
            castOut.newState.gameStatePhase === 'spell_target_cell'
        ) {
            const targetPos =
                castOut.newState.gameStatePhase === 'spell_target_enemy'
                    ? spState.enemies[0].position
                    : 4;
            const applied = gameEngine.applySpellEffectToTarget(castOut.newState, targetPos);
            assertInvariants(applied.newState, `spell-target-${template.name}`);
        }
    }

    // Copy spell prompt resolution (true & false)
    const copySetup = JSON.parse(JSON.stringify(state)) as GameState;
    copySetup.players[0].coins = 30;
    copySetup.players[1].coins = 30;
    copySetup.players[1].isCopyingNextSpell = true;
    const healSpell = { ...allMagicSpells.find(s => s.effectTag === 'heal_target')!, id: 'heal_copy_test' };
    copySetup.players[0].spells = [healSpell];
    copySetup.players[0].hp = 10;
    copySetup.players[1].hp = 10;
    const promptRes = gameEngine.castSpell(copySetup, copySetup.players[0].id, healSpell.id);
    assert.equal(promptRes.modalInfo?.type, 'copy_spell_prompt');
    const copiedRes = gameEngine.resolveCopySpellDecision(promptRes.newState, true);
    assert.equal(copiedRes.newState.players[1].isCopyingNextSpell, false);
    assert(copiedRes.newState.players[0].hp > 10);
    assert(copiedRes.newState.players[1].hp > 10);

    // 9. 4 Keys -> Gates Open (even with 3 players!) -> Path to Cell 69 -> Defeat Boss Finale -> gameOver
    const keyState = JSON.parse(JSON.stringify(state)) as GameState;
    for (const color of ALL_COLORS) {
        for (let i = 0; i < 5; i++) {
            const dummyId = 5000 + ALL_COLORS.indexOf(color) * 10 + i;
            keyState.enemies.push({
                id: dummyId,
                name: `Test-${color}-${i}`,
                position: 10,
                isVisible: true,
                pawnImage: '',
                avatar: '',
                hp: 1,
                maxHp: 1,
                level: 1,
                toughness: 0,
                bootyValue: 'low',
                hasBeenAttacked: true,
                enemyType: color,
                ownerId: 1,
            });
            keyState.combatState = {
                active: true,
                enemyId: dummyId,
                combatPhase: 'results_display',
                attacksMadeThisTurn: 1,
                playerRolls: null,
                enemyRolls: null,
                playerDefenseRolls: null,
                enemyDefenseRolls: null,
                playerDamageTaken: 0,
                enemyDamageTaken: 5,
                hasPlayerMoved: true,
            };
            const r = gameEngine.resolveCombatRound(keyState);
            Object.assign(keyState, r.newState);
        }
        assert.equal(keyState.keys[color], true, `Key ${color} must unlock after 5 defeated`);
    }
    assert.equal(keyState.gates.redOpen, true);
    assert.equal(keyState.gates.yellowOpen, true);
    assert.equal(keyState.gates.whiteOpen, true);
    assert.equal(keyState.gates.blackOpen, true);

    const pathToCenter = gameEngine.findShortestPath(1, 69, keyState.gates);
    assert(pathToCenter && pathToCenter[pathToCenter.length - 1] === 69, 'Gates open must allow pathfinding to cell 69');

    const boss = keyState.enemies.find(e => e.isFinalBoss)!;
    assert.equal(boss.isVisible, true, 'Final boss should become visible when all 4 gates open');
    keyState.combatState = {
        active: true,
        enemyId: boss.id,
        combatPhase: 'results_display',
        attacksMadeThisTurn: 1,
        playerRolls: null,
        enemyRolls: null,
        playerDefenseRolls: null,
        enemyDefenseRolls: null,
        playerDamageTaken: 0,
        enemyDamageTaken: 999,
        hasPlayerMoved: true,
    };
    const finalVictory = gameEngine.resolveCombatRound(keyState);
    assert.equal(finalVictory.newState.gameStatePhase, 'gameOver');

    console.log('[Targeted Flows] All UI/engine flow assertions passed!');
}

async function main(): Promise<void> {
    await runFullMatchSimulations(200);
    await runTargetedFlowChecks();
    console.log('ALL AUTOMATED GAME & UI FLOW VERIFICATIONS PASSED!');
}

main().catch(err => {
    console.error('SIMULATION FAILED:', err);
    process.exit(1);
});
