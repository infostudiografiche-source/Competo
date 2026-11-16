import React, { useState, useEffect } from 'react';
import { preloadedAssets } from '../assets/preloadedAssets';

const LOADING_TIPS = [
    "Un sognatore non può terminare il movimento in una casella già occupata da un altro compagno.",
    "Ad ogni giro completo della mappa, la tua Determinazione aumenta, potenziando Volontà e Stabilità.",
    "Puoi equipaggiare un Desiderio solo se il suo livello è pari o inferiore alla tua Determinazione.",
    "Un Incubo si rivela sempre finendo esattamente sulla casella in cui dimora.",
    "In risonanza, il numero di dadi Armonia lanciati equivale ai dadi del tuo Desiderio equipaggiato.",
    "Se inizi il turno sulla casella di un Incubo, puoi entrare in risonanza o tentare la fuga.",
    "Se ricomponi un Incubo senza esserti mosso, ottieni comunque il diritto di lanciare il dado e muoverti.",
    "I Geni si spostano ad ogni ciclo. Una volta scoperti, restano visibili a tutti per quel giro.",
    "Le caselle Sventura e Benedizione restano nascoste e svaniscono dopo essere state attivate.",
    "Ricomporre 5 Incubi dello stesso colore forgia una Chiave del Risveglio.",
    "Le 4 Chiavi aprono i cancelli verso il Nucleo del Sogno al centro del tabellone.",
    "Al centro del sogno dimora l'Incubo Finale: sconfiggilo per liberare tutti i sognatori.",
    "Sulle caselle Casa agli angoli puoi gestire la Cassa Condivisa della squadra.",
    "Puoi rianimare un compagno sconfitto terminando il movimento sulla sua stessa casella.",
];

export const LoadingScreen: React.FC = () => {
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        const tipInterval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
        }, 3600);
        return () => clearInterval(tipInterval);
    }, []);

    return (
        <div className="loading-screen-container">
            <div className="loading-content">
                <div className="loading-astrolabe" aria-hidden="true">
                    <svg viewBox="0 0 120 120" className="astrolabe-ring astrolabe-outer">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a63a" strokeWidth="1.8" strokeDasharray="6 4" />
                        <circle cx="60" cy="60" r="46" fill="none" stroke="#8a6825" strokeWidth="1" />
                        <path d="M60 4 L63 13 L57 13 Z M60 116 L63 107 L57 107 Z M4 60 L13 57 L13 63 Z M116 60 L107 57 L107 63 Z" fill="#f0bd17" />
                    </svg>
                    <svg viewBox="0 0 120 120" className="astrolabe-ring astrolabe-inner">
                        <polygon points="60,18 96,80 24,80" fill="none" stroke="#f0bd17" strokeWidth="1.2" opacity="0.7" />
                        <polygon points="60,102 24,40 96,40" fill="none" stroke="#d4a63a" strokeWidth="1.2" opacity="0.55" />
                    </svg>
                    <img src={preloadedAssets.logos.logoSquare} alt="Competo" className="astrolabe-emblem" />
                </div>

                <h3>Intessendo le Trame del Sogno...</h3>

                <div className="loading-tips-container">
                    <p className="loading-tip-title">Frammento di Lucidità</p>
                    <p className="loading-tip-text">{LOADING_TIPS[tipIndex]}</p>
                </div>
            </div>
        </div>
    );
};