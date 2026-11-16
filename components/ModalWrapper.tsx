import React from 'react';

interface ModalWrapperProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footerContent: React.ReactNode;
    isClosing?: boolean;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children, footerContent, isClosing }) => {
    return (
        <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-footer">
                    {footerContent}
                </div>
            </div>
        </div>
    );
};