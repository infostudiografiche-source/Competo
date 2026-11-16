import React, { useState } from 'react';
import { GITHUB_ASSETS_BASE_URL } from '../index';

export const getSafeAssetUrl = (path: string, fallback: string): string => {
    if (GITHUB_ASSETS_BASE_URL.includes('vincenzoaiello/competo-assets')) {
        return `${GITHUB_ASSETS_BASE_URL}${path}`;
    }
    return fallback;
};

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    githubPath?: string;
    fallbackSrc: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ githubPath, fallbackSrc, ...props }) => {
    const [useFallback, setUseFallback] = useState(false);
    const githubUrl = githubPath ? `${GITHUB_ASSETS_BASE_URL}${githubPath}` : null;

    const handleError = () => {
        if (!useFallback) {
            setUseFallback(true);
        }
    };

    return React.createElement('img', {
        ...props,
        src: !useFallback && githubUrl ? githubUrl : fallbackSrc,
        onError: handleError,
        referrerPolicy: 'no-referrer',
    });
};
