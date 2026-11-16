import React from 'react';

export const RulesModalContent: React.FC = () => {
    return (
        <div className="rules-modal-content">
            <div className="rules-scroll-area">
                <h1>Regolamento di Gioco - Competo</h1>

                <p className="intro">Benvenuto, Sognatore. In questo gioco cooperativo, la tua missione non è distruggere, ma <strong>risvegliare</strong>.</p>

                <section>
                    <h2>Gli Incubi: Sognatori Bloccati</h2>
                    <p>Il tabellone è popolato da 10 <strong>Incubi</strong>. Non sono mostri esterni, ma sognatori rimasti intrappolati in un <strong>Trauma Loop</strong>: un momento doloroso del passato che si ripete all'infinito, trasformandoli in creature distorte e furiose.</p>

                    <h3>Incontro con un Incubo</h3>
                    <p>Quando finisci sulla casella di un Incubo, hai due strade:</p>
                    <ul>
                        <li>
                            <strong>Parlare (Archeologia Emotiva):</strong> Disponibile solo Online. Cerchi di agire come una <strong>Guida Lucida</strong>. Attraverso il dialogo, devi aiutare il sognatore a rompere il suo loop di dolore. Se il rapporto arriva a +10, il sognatore si sveglia e viene <strong>ricomposto</strong> pacificamente. Se scende a -5, il delirio prende il sopravvento e subisci danni psichici prima di combattere.
                        </li>
                        <li>
                            <strong>Entrare in Risonanza (Combattimento):</strong> Usi i tuoi <strong>Desideri</strong> (armi) per armonizzare la Paura del sognatore. Sconfiggerlo significa integrare quel frammento di coscienza con la forza della volontà.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>Progressione: La Determinazione</h2>
                    <p>Ogni volta che attraversi la tua casella di partenza ("Casa") completando un giro, la tua <strong>Determinazione</strong> aumenta (Level Up):</p>
                    <ul>
                        <li>La tua <strong>Volontà</strong> (HP) aumenta e viene curata.</li>
                        <li>La tua <strong>Stabilità</strong> (Difesa) aumenta, dandoti più dadi per parare i colpi.</li>
                        <li>Più sei determinato, più potenti sono i <strong>Desideri</strong> che puoi equipaggiare.</li>
                    </ul>
                </section>

                <section>
                    <h2>Obiettivo: Le Chiavi del Risveglio</h2>
                    <p>Per vincere, la squadra deve raccogliere le 4 Chiavi colorate (Nera, Bianca, Gialla, Rossa).</p>
                    <ul>
                        <li>Una <strong>Chiave</strong> viene generata quando la squadra ricompone <strong>5 incubi</strong> dello stesso tipo/colore.</li>
                        <li>La chiave rappresenta l'integrazione di quell'archetipo psichico (es. la Chiave Nera rappresenta l'accettazione del distacco).</li>
                        <li>Una volta ottenute tutte le chiavi, i cancelli verso il centro si apriranno. Lì dovrete affrontare l'<strong>Incubo Ancestrale</strong> per liberare definitivamente il sognatore e concludere il viaggio.</li>
                    </ul>
                </section>

                <section>
                    <h2>Collaborazione e Rianimazione</h2>
                    <p>Se la tua Volontà scende a 0, diventi <strong>Sconfitto</strong> (il delirio ti ha avvolto). Non puoi più muoverti o agire, ma i tuoi compagni possono aiutarti.</p>
                    <ul>
                        <li><strong>Rianimazione:</strong> Se un compagno termina il suo movimento sulla tua casella, ti riporta alla lucidità. Recuperi 1 punto Volontà e puoi tornare a giocare dal turno successivo.</li>
                    </ul>
                </section>

                <div className="rules-closure">
                    <p>Sogna con coraggio, Guida. Il risveglio è vicino.</p>
                </div>
            </div>
        </div>
    );
};
