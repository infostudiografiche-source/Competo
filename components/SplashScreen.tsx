import React from 'react';
import { Sparkles } from 'lucide-react';
import { preloadedAssets } from '../assets/preloadedAssets';
import { PawnShowcase3D } from './PawnShowcase3D';

export const SplashScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="splash-screen-container">
        <div className="splash-backdrop-glow" aria-hidden="true" />
        <div className="splash-stage-fullscreen">
            <PawnShowcase3D mode="splash_diorama" interactive={true} onTap={onStart} />
        </div>
        <div className="splash-top-scrim" aria-hidden="true" />
        <div className="splash-bottom-scrim" aria-hidden="true" />

        <header className="splash-header">
            <img src={preloadedAssets.logos.logoRectangle} alt="Competo" className="splash-logo-rect" />
            <p className="splash-subtitle">Viaggio Cooperativo nell'Onirico</p>
        </header>

        <footer className="splash-footer">
            <p className="splash-interaction-hint">Trascina ovunque per ruotare · Clicca per iniziare</p>
            <button type="button" className="splash-cta-button" onClick={onStart}>
                <Sparkles size={18} />
                <span>Entra nel Sogno</span>
            </button>
            <p className="splash-author">di Vincenzo Aiello</p>
        </footer>
    </div>
);
