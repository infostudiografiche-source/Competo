import React, { useState, useMemo } from 'react';
import { X, AlertCircle, User, Bot } from 'lucide-react';
import type { KeyColor, PlayerCustomization, PlayerClass } from '../gameLogic';
import { PawnShowcase3D } from './PawnShowcase3D';

interface CustomizationModalProps {
    numberOfPlayers: number;
    onClose: () => void;
    onSave: (customizations: PlayerCustomization[]) => void;
}

const PLAYER_COLORS: KeyColor[] = ['black', 'white', 'yellow', 'red'];

const COLOR_LABELS: Record<KeyColor, { name: string; swatch: string }> = {
    black: { name: 'Nero', swatch: '#2c3e50' },
    white: { name: 'Bianco', swatch: '#edf2f7' },
    yellow: { name: 'Giallo', swatch: '#f1c40f' },
    red: { name: 'Rosso', swatch: '#c0392b' },
};

const CLASS_LABELS: Record<PlayerClass, string> = {
    determinato: 'Determinato',
    intuitivo: 'Intuitivo',
    pacifico: 'Pacifico',
};

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ numberOfPlayers, onClose, onSave }) => {
    const initialCustomizations = useMemo(() => Array.from({ length: numberOfPlayers }, (_, i) => ({
        name: `Sognatore ${i + 1}`,
        playerClass: (['determinato', 'intuitivo', 'pacifico', 'determinato'][i] || 'determinato') as PlayerClass,
        controller: 'human' as 'human' | 'ai',
    })), [numberOfPlayers]);

    const [customizations, setCustomizations] = useState<PlayerCustomization[]>(initialCustomizations);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleUpdate = (index: number, field: 'name' | 'playerClass' | 'controller', value: string) => {
        setFocusedIndex(index);
        if (validationError) setValidationError(null);
        const newCustomizations = [...customizations];
        newCustomizations[index] = { ...newCustomizations[index], [field]: value };
        setCustomizations(newCustomizations);
    };

    const handleSave = () => {
        const emptyIdx = customizations.findIndex(c => c.name.trim().length === 0);
        if (emptyIdx !== -1) {
            setFocusedIndex(emptyIdx);
            setValidationError(`Inserisci un nome valido per il Sognatore ${emptyIdx + 1}.`);
            return;
        }
        onSave(customizations);
    };

    const classDescriptions: Record<PlayerClass, string> = {
        determinato: "Avanza con decisione: affronta i blocchi interiori con slancio diretto e ferma risolutezza.",
        intuitivo: "Percepisce le sfumature invisibili e i frammenti nascosti nel profondo del sonno.",
        pacifico: "Accoglie le ombre con la forza della tregua e dell'ascolto compassionevole.",
    };

    const safeIndex = Math.min(focusedIndex, Math.max(0, customizations.length - 1));
    const focusedPlayer = customizations[safeIndex];
    const focusedColor = PLAYER_COLORS[safeIndex] || 'black';

    return (
        <div className="customization-modal-overlay" style={{ zIndex: 11000 }} onClick={onClose}>
            <div className="customization-modal-compact" onClick={e => e.stopPropagation()}>
                <div className="customization-modal-header">
                    <div>
                        <h2>Forgia i Sognatori</h2>
                        <p className="customization-subtitle">Scegli nome, archetipo e guida per ogni pedina</p>
                    </div>
                    <button type="button" className="modal-close-icon-btn" onClick={onClose} title="Torna indietro">
                        <X size={18} />
                    </button>
                </div>

                <div className="customization-body-grid">
                    <div className="customization-preview-pane">
                        <div className="customization-preview-viewport">
                            <PawnShowcase3D
                                mode="customizer_preview"
                                hero={{
                                    playerClass: focusedPlayer.playerClass,
                                    color: focusedColor,
                                    label: focusedPlayer.name,
                                }}
                                interactive={true}
                            />
                        </div>
                        <div className="customization-preview-caption">
                            <span
                                className="color-sigil-dot"
                                style={{ backgroundColor: COLOR_LABELS[focusedColor].swatch }}
                            />
                            <strong>{focusedPlayer.name.trim() || `Sognatore ${safeIndex + 1}`}</strong>
                            <span>· {CLASS_LABELS[focusedPlayer.playerClass]} ({COLOR_LABELS[focusedColor].name})</span>
                        </div>
                    </div>

                    <div className="customization-roster-pane">
                        <div className="player-grid-container">
                            {customizations.map((player, index) => {
                                const pColor = PLAYER_COLORS[index] || 'black';
                                const isFocused = index === safeIndex;
                                return (
                                    <div
                                        key={index}
                                        className={`player-config-box ${isFocused ? 'is-focused' : ''}`}
                                        data-player-index={index}
                                        onClick={() => setFocusedIndex(index)}
                                    >
                                        <div className="player-config-top">
                                            <span
                                                className="color-sigil-dot"
                                                style={{ backgroundColor: COLOR_LABELS[pColor].swatch }}
                                                title={`Colore: ${COLOR_LABELS[pColor].name}`}
                                            />
                                            <span className="player-color-label">{COLOR_LABELS[pColor].name}</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={player.name}
                                            maxLength={20}
                                            placeholder={`Sognatore ${index + 1}`}
                                            onFocus={() => setFocusedIndex(index)}
                                            onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                                            className="player-name-input"
                                        />
                                        <select
                                            value={player.playerClass}
                                            onFocus={() => setFocusedIndex(index)}
                                            onChange={(e) => handleUpdate(index, 'playerClass', e.target.value)}
                                            className="player-class-select"
                                        >
                                            <option value="determinato">Determinato</option>
                                            <option value="intuitivo">Intuitivo</option>
                                            <option value="pacifico">Pacifico</option>
                                        </select>
                                        <div className="controller-toggle">
                                            <label className={`controller-toggle-label ${player.controller === 'human' ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name={`controller-${index}`}
                                                    value="human"
                                                    checked={player.controller === 'human'}
                                                    onChange={(e) => handleUpdate(index, 'controller', e.target.value)}
                                                />
                                                <User size={13} />
                                                <span>Umano</span>
                                            </label>
                                            <label className={`controller-toggle-label ${player.controller === 'ai' ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name={`controller-${index}`}
                                                    value="ai"
                                                    checked={player.controller === 'ai'}
                                                    onChange={(e) => handleUpdate(index, 'controller', e.target.value)}
                                                />
                                                <Bot size={13} />
                                                <span>IA</span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="class-descriptions-container">
                    {Object.entries(classDescriptions).map(([pClass, desc]) => (
                        <div key={pClass} className="class-description-item">
                            <strong>{CLASS_LABELS[pClass as PlayerClass]}:</strong> {desc}
                        </div>
                    ))}
                </div>

                {validationError && (
                    <div className="customization-error-banner" role="alert">
                        <AlertCircle size={16} />
                        <span>{validationError}</span>
                    </div>
                )}

                <div className="customization-actions">
                    <button type="button" onClick={onClose} className="modal-action-button">Annulla</button>
                    <button type="button" onClick={handleSave} className="modal-action-button confirm">Inizia Partita</button>
                </div>
            </div>
        </div>
    );
};
