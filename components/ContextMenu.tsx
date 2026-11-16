import React, { useEffect } from 'react';

export interface ContextMenuProps {
    x: number;
    y: number;
    options: { label: string; action: () => void }[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    useEffect(() => {
        const handleClickOutside = () => onClose();
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    return (
        <div className="context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
            {options.map((option, index) => (
                <div key={index} className="context-menu-item" onClick={option.action}>
                    {option.label}
                </div>
            ))}
        </div>
    );
};
