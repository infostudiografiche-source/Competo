import React, { useMemo, useState } from 'react';
import { Volume2, VolumeX, Sparkles, Users } from 'lucide-react';
import { preloadedAssets } from '../assets/preloadedAssets';
import { PawnShowcase3D, ShowcaseHeroSpec } from './PawnShowcase3D';

export interface GameSettings {
    players: number;
    mode: 'online' | 'offline';
    temperature: number;
    audio: boolean;
}

const PREVIEW_ROSTER: ShowcaseHeroSpec[] = [
    { playerClass: 'determinato', color: 'black', label: 'Sognatore 1' },
    { playerClass: 'intuitivo', color: 'white', label: 'Sognatore 2' },
    { playerClass: 'pacifico', color: 'yellow', label: 'Sognatore 3' },
    { playerClass: 'determinato', color: 'red', label: 'Sognatore 4' },
];

export const SelectionScreen: React.FC<{ onSettingsConfirm: (settings: GameSettings) => void }> = ({ onSettingsConfirm }) => {
    const [settings, setSettings] = useState<GameSettings>({
        players: 4,
        mode: 'offline',
        temperature: 0.5,
        audio: false,
    });

    const previewHeroes = useMemo(
        () => PREVIEW_ROSTER.slice(0, settings.players),
        [settings.players]
    );

    return (
        <div className="selection-screen-container">
            <div className="selection-layout">
                <section className="selection-stage-panel">
                    <div className="selection-stage-header">
                        <img src="/assets/loghi/TITOLO.png" alt="Competo" className="selection-logo" style={{ maxHeight: '42px', width: 'auto', objectFit: 'contain' }} />
                        <p className="selection-stage-tagline">Prepara la compagnia dei Sognatori</p>
                    </div>
                    <div className="selection-stage-viewport">
                        <PawnShowcase3D
                            mode="selection_spotlight"
                            heroes={previewHeroes}
                            interactive={true}
                        />
                    </div>
                    <p className="selection-stage-hint">
                        <Users size={15} />
                        <span className="tabular-nums">{settings.players} {settings.players === 1 ? 'Sognatore' : 'Sognatori'} · Trascina per osservare il cerchio</span>
                    </p>
                </section>

                <section className="selection-form">
                    <h2 className="selection-form-title">Configura la Partita</h2>

                    <div className="form-group">
                        <label>Numero di Giocatori</label>
                        <div className="radio-group">
                            {[1, 2, 3, 4].map(num => (
                                <label key={num} className={`radio-label ${settings.players === num ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="players"
                                        value={num}
                                        checked={settings.players === num}
                                        onChange={() => setSettings(s => ({ ...s, players: num }))}
                                    />
                                    <span className="tabular-nums">{num}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Modalità di Gioco</label>
                        <div className="radio-group">
                            <label className={`radio-label ${settings.mode === 'offline' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="mode"
                                    value="offline"
                                    checked={settings.mode === 'offline'}
                                    onChange={() => setSettings(s => ({ ...s, mode: 'offline' }))}
                                />
                                Offline
                            </label>
                            <label className={`radio-label ${settings.mode === 'online' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="mode"
                                    value="online"
                                    checked={settings.mode === 'online'}
                                    onChange={() => setSettings(s => ({ ...s, mode: 'online' }))}
                                />
                                Online
                            </label>
                        </div>
                    </div>

                    {settings.mode === 'online' && (
                        <div className="form-group">
                            <label htmlFor="temperature" className="tabular-nums">
                                Creatività IA: {settings.temperature.toFixed(1)}
                            </label>
                            <input
                                type="range"
                                id="temperature"
                                min="0.1"
                                max="1.0"
                                step="0.1"
                                value={settings.temperature}
                                onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                                className="slider-input"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Paesaggio Sonoro</label>
                        <div className="radio-group">
                            <label className={`radio-label radio-icon-label ${!settings.audio ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="audio"
                                    value="no"
                                    checked={!settings.audio}
                                    onChange={() => setSettings(s => ({ ...s, audio: false }))}
                                />
                                <VolumeX size={16} />
                                <span>Disattivato</span>
                            </label>
                            <label className={`radio-label radio-icon-label ${settings.audio ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="audio"
                                    value="yes"
                                    checked={settings.audio}
                                    onChange={() => setSettings(s => ({ ...s, audio: true }))}
                                />
                                <Volume2 size={16} />
                                <span>Attivo</span>
                            </label>
                        </div>
                    </div>

                    <button type="button" className="start-game-button" onClick={() => onSettingsConfirm(settings)}>
                        <Sparkles size={18} />
                        <span>Configura i Sognatori</span>
                    </button>
                </section>
            </div>
        </div>
    );
};
