import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Sparkles } from 'lucide-react';
import { PlayerCustomization } from '../gameLogic';
import { generatePsychologicalTest } from '../game/master';

interface PsychologicalTestProps {
    players: PlayerCustomization[];
    onComplete: (profiles: string[]) => void;
}

export const PsychologicalTest: React.FC<PsychologicalTestProps> = ({ players, onComplete }) => {
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<string[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [profiles, setProfiles] = useState<string[]>([]);

    const currentPlayer = players[currentPlayerIndex];

    useEffect(() => {
        let cancelled = false;
        const fetchQuestions = async () => {
            setIsLoading(true);
            const q = await generatePsychologicalTest(currentPlayer.playerClass);
            if (cancelled) return;
            setQuestions(q || []);
            setIsLoading(false);
            setCurrentQuestionIndex(0);
            setAnswers([]);
        };
        fetchQuestions();
        return () => {
            cancelled = true;
        };
    }, [currentPlayerIndex, currentPlayer.playerClass]);

    const handleNext = () => {
        if (!currentAnswer.trim()) return;

        const updatedAnswers = [...answers, currentAnswer.trim()];
        setAnswers(updatedAnswers);
        setCurrentAnswer('');

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            const profileString = updatedAnswers.map((a, i) => `D: ${questions[i]} R: ${a}`).join('\n');
            const newProfiles = [...profiles, profileString];
            setProfiles(newProfiles);

            if (currentPlayerIndex < players.length - 1) {
                setCurrentPlayerIndex(prev => prev + 1);
            } else {
                onComplete(newProfiles);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="psych-test-overlay">
                <div className="psych-test-card psych-test-loading">
                    <Eye size={32} className="psych-loading-icon" />
                    <motion.p
                        animate={{ opacity: [0.45, 1, 0.45] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="psych-loading-text"
                    >
                        Interrogando l'Inconscio di {currentPlayer.name}...
                    </motion.p>
                </div>
            </div>
        );
    }

    return (
        <div className="psych-test-overlay">
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="psych-test-card"
            >
                <div className="psych-test-header">
                    <span className="psych-test-kicker">Test dell'Ombra · Sognatore {currentPlayerIndex + 1} di {players.length}</span>
                    <h1>{currentPlayer.name}</h1>
                    <div className="psych-progress-track">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`psych-progress-pip ${i <= currentQuestionIndex ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentPlayerIndex}-${currentQuestionIndex}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="psych-question-body"
                    >
                        <div className="psych-question-scroll">
                            <p className="psych-question-text">"{questions[currentQuestionIndex]}"</p>
                        </div>

                        <div className="psych-input-wrap">
                            <textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim()) {
                                        e.preventDefault();
                                        handleNext();
                                    }
                                }}
                                placeholder="Rispondi dal profondo del tuo ricordo..."
                                className="psych-textarea"
                                autoFocus
                            />
                            <span className="psych-input-hint">Invio per proseguire</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={!currentAnswer.trim()}
                            className="psych-submit-button"
                        >
                            <Sparkles size={16} />
                            <span>{currentQuestionIndex === questions.length - 1 ? 'Concludi Analisi' : 'Vedi Oltre'}</span>
                        </button>
                    </motion.div>
                </AnimatePresence>

                <p className="psych-footnote">
                    Ogni risposta modella la forma dell'ombra che incontrerai nel tabellone.
                </p>
            </motion.div>
        </div>
    );
};
