import React from 'react';
import { PawnShowcase3D } from './PawnShowcase3D';

export const SplashScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="splash-screen-container">
        <div className="splash-backdrop-glow" aria-hidden="true" />
        <div className="splash-stage-fullscreen">
            <PawnShowcase3D mode="splash_diorama" interactive={true} />
        </div>
        <div className="splash-top-scrim" aria-hidden="true" />
        <div className="splash-bottom-scrim" aria-hidden="true" />

        <header className="splash-header">
            <img src="/assets/loghi/TITOLO.png" alt="Competo" className="splash-logo-rect" />
            <p className="splash-subtitle">Viaggio Cooperativo nell'Onirico</p>
        </header>

        <footer className="splash-footer">
            <p className="splash-interaction-hint">Trascina ovunque per ruotare i sognatori</p>
            <img src="/assets/loghi/mio-logo.png" alt="Vincenzo Aiello" className="splash-author-logo" />
            <button type="button" className="splash-cta-button" onClick={onStart}>
                <img src="/assets/loghi/mio-logo.png" alt="" style={{ filter: 'invert(1)', width: '20px', height: '20px', objectFit: 'contain' }} />
                <span>Entra nel Sogno</span>
            </button>
            <p className="splash-author">di Vincenzo Aiello</p>
        </footer>
    </div>
);
