import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { ModalInfo, Weapon } from '../../gameLogic';
import { preloadedAssets } from '../../assets/preloadedAssets';
import { InteractiveCard3D } from '../cards/InteractiveCard3D';

interface SwapConfirmationModalContentProps {
    modalInfo: Extract<ModalInfo, { type: 'swap_confirmation' }>;
}

const WishCard3D: React.FC<{ label: string; weapon: Weapon }> = ({ label, weapon }) => {
    const [flipped, setFlipped] = useState(false);
    const img = preloadedAssets.items.weapons[weapon?.name] || preloadedAssets.items.weapons.generic;

    const front = (
        <div className="wish-card-content">
            <div className="duel-card-header">
                <span className="duel-card-kicker">{label}</span>
                <h3>{weapon?.name}</h3>
            </div>
            <div className="wish-card-art">
                <img src={img} alt={weapon?.name} />
            </div>
            <div className="duel-card-box">
                <strong className="tabular-nums">Livello {weapon?.level} · {weapon?.damageDice} Dadi</strong>
                <span>"{weapon?.bonusEffect.name}"</span>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Clicca per effetto</span>
            </div>
        </div>
    );

    const back = (
        <div className="wish-card-content back">
            <div className="duel-card-header">
                <span className="duel-card-kicker">Effetto del Desiderio</span>
                <h3>{weapon?.name}</h3>
            </div>
            <div className="duel-card-back-body">
                <p className="duel-back-desc">{weapon?.bonusEffect.description}</p>
            </div>
            <div className="duel-card-flip-cue">
                <RotateCw size={12} />
                <span>Torna al fronte</span>
            </div>
        </div>
    );

    return (
        <InteractiveCard3D
            className="wish-card-3d"
            variant="wish"
            accentColor="#f0bd17"
            front={front}
            back={back}
            isFlipped={flipped}
            onCardClick={() => setFlipped(f => !f)}
        />
    );
};

export const SwapConfirmationModalContent: React.FC<SwapConfirmationModalContentProps> = ({ modalInfo }) => {
    const { oldWeapon, newWeapon, message } = modalInfo;

    return (
        <div className="swap-confirmation">
            <p>{message}</p>
            <div className="swap-comparison">
                <WishCard3D label="Il tuo Desiderio" weapon={oldWeapon} />
                <div className="swap-arrow">➔</div>
                <WishCard3D label="Desiderio a Terra" weapon={newWeapon} />
            </div>
        </div>
    );
};