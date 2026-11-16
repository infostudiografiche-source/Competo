import React from 'react';
import { Coins } from 'lucide-react';
import { GameState, ModalInfo, Weapon, Consumable, MagicSpell, InventoryItem } from '../../gameLogic';
import { preloadedAssets } from '../../assets/preloadedAssets';

interface MerchantModalContentProps {
    modalInfo: Extract<ModalInfo, { type: 'merchant' }>;
    gameState: GameState;
    onPurchaseItem: (item: Weapon | Consumable | MagicSpell, merchantId: number) => void;
}

export const MerchantModalContent: React.FC<MerchantModalContentProps> = ({ modalInfo, gameState, onPurchaseItem }) => {
    const merchant = modalInfo.merchant;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const getItemInfo = (item: InventoryItem) => {
        let cost = 0;
        let description = '';
        let name = item.name;
        let icon = preloadedAssets.items.treasure;

        switch (item.type) {
            case 'melee':
            case 'ranged':
            case 'magic':
                cost = item.costsByLevel[item.level - 1];
                description = item.bonusEffect.description;
                name = `${item.name} (Liv: ${item.level})`;
                icon = preloadedAssets.items.weapons[item.name] || preloadedAssets.items.weapons.generic;
                break;
            case 'potion':
            case 'spellScroll':
            case 'bag':
                cost = item.cost;
                description = item.description;
                icon = preloadedAssets.items.consumables[item.name] || preloadedAssets.items.treasure;
                break;
            case 'intention':
                cost = item.costToBuy;
                description = item.description;
                icon = preloadedAssets.magicSpells[item.name] || preloadedAssets.items.treasure;
                break;
        }
        return { cost, description, name, icon };
    };

    return (
        <>
            <div className="merchant-wallet-banner">
                <span>Il tuo Intento disponibile:</span>
                <strong className="merchant-wallet-amount tabular-nums">
                    <Coins size={16} />
                    <span>{currentPlayer.coins}</span>
                </strong>
            </div>
            <ul className="merchant-stock-list">
                {merchant.stock.map(item => {
                    const { cost, description, name, icon } = getItemInfo(item);
                    const canAfford = currentPlayer.coins >= cost;
                    const hasSpace = item.type === 'intention'
                        ? currentPlayer.spells.length < 4
                        : currentPlayer.inventory.length < currentPlayer.inventorySize;

                    const canBuy = canAfford && hasSpace;

                    const disabledReason = !canAfford
                        ? 'Non hai abbastanza Intento.'
                        : !hasSpace
                        ? (item.type === 'intention' ? 'Spazio intenzioni pieno.' : 'Inventario pieno.')
                        : '';

                    return (
                        <li key={item.id} className="merchant-item">
                            <img src={icon} alt={name} className="merchant-item-icon" />
                            <div className="merchant-item-info">
                                <span>{name}</span>
                                <small title={description}>{description}</small>
                            </div>
                            <div className="merchant-item-action">
                                <span className="item-cost tabular-nums">
                                    <Coins size={14} />
                                    <span>{cost}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onPurchaseItem(item, merchant.id)}
                                    className="modal-action-button confirm"
                                    disabled={!canBuy}
                                    title={disabledReason}
                                >
                                    Compra
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};