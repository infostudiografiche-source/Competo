import React from 'react';
import { ModalInfo } from '../../gameLogic';

interface InfoModalContentProps {
    // FIX: Narrow the ModalInfo type to what this component actually receives.
    modalInfo: Extract<ModalInfo, { type: 'info' | 'titan_encounter' }>;
}

export const InfoModalContent: React.FC<InfoModalContentProps> = ({ modalInfo }) => {
    return <p style={{ whiteSpace: 'pre-wrap' }}>{modalInfo.message}</p>;
};