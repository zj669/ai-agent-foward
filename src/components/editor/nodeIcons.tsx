import React from 'react';
import llmIcon from '@/assets/icons/llm.svg';
import codeIcon from '@/assets/icons/code.svg';
import apiIcon from '@/assets/icons/api.svg';
import routerIcon from '@/assets/icons/router.svg';
import humanIcon from '@/assets/icons/human.svg';
import planIcon from '@/assets/icons/plan.svg';
import reactIcon from '@/assets/icons/react.svg';
import actIcon from '@/assets/icons/act.svg';

// Map icon strings to images
export const getIcon = (iconName: string) => {
    if (!iconName) return <img src={codeIcon} className="w-5 h-5 opacity-50" alt="default" />;
    const name = iconName.toLowerCase();

    // Specific matches
    if (name.includes('llm')) return <img src={llmIcon} className="w-6 h-6" alt="llm" />;
    if (name.includes('code')) return <img src={codeIcon} className="w-6 h-6" alt="code" />;
    if (name.includes('api')) return <img src={apiIcon} className="w-6 h-6" alt="api" />;
    if (name.includes('router')) return <img src={routerIcon} className="w-6 h-6" alt="router" />;
    if (name.includes('act')) return <img src={actIcon} className="w-6 h-6" alt="act" />;
    if (name.includes('human')) return <img src={humanIcon} className="w-6 h-6" alt="human" />;
    if (name.includes('plan')) return <img src={planIcon} className="w-6 h-6" alt="plan" />;
    if (name.includes('react')) return <img src={reactIcon} className="w-6 h-6" alt="react" />;

    // Fallback
    return <img src={codeIcon} className="w-6 h-6 opacity-50" alt="unknown" />;
};
