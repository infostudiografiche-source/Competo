import React from 'react';
import { ScrollText, Volume2, VolumeX, Bug } from 'lucide-react';
import { GameState } from '../../gameLogic';
import { AudioManager } from '../../services/AudioManager';

interface MenuModalContentProps {
    gameState: GameState;
    onOpenRules: () => void;
    onOpenDebug: () => void;
    onClose: () => void;
}

export const MenuModalContent: React.FC<MenuModalContentProps> = ({ onOpenRules, onOpenDebug, onClose }) => {
    const isAudioEnabled = AudioManager.isAudioEnabled();

    return (
        <div className="menu-modal-content">
            <p className="menu-description">Configurazioni e informazioni sul viaggio onirico.</p>

            <div className="menu-options-grid">
                <button type="button" className="menu-option-card" onClick={onOpenRules}>
                    <span className="option-icon">
                        <ScrollText size={28} />
                    </span>
                    <div className="option-text">
                        <h4>Regolamento</h4>
                        <p>Leggi le leggi del mondo di Competo.</p>
                    </div>
                </button>

                <button type="button" className="menu-option-card" onClick={onOpenDebug}>
                    <span className="option-icon">
                        <Bug size={28} style={{ color: '#f0bd17' }} />
                    </span>
                    <div className="option-text">
                        <h4>Pannello di Debug</h4>
                        <p>Simulazione partite e test invarianti (0 Token).</p>
                    </div>
                </button>

                <button
                    type="button"
                    className="menu-option-card"
                    onClick={() => {
                        AudioManager.setAudioEnabled(!isAudioEnabled);
                        onClose();
                    }}
                >
                    <span className="option-icon">
                        {isAudioEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
                    </span>
                    <div className="option-text">
                        <h4>Audio: {isAudioEnabled ? 'Attivo' : 'Disattivato'}</h4>
                        <p>Attiva o disattiva la voce narrante e i suoni di gioco.</p>
                    </div>
                </button>
            </div>

            <div className="menu-footer">
                <p>Edizione "Il Risveglio"</p>
                <button type="button" className="modal-action-button confirm" onClick={onClose}>
                    Torna al Gioco
                </button>
            </div>
        </div>
    );
};
