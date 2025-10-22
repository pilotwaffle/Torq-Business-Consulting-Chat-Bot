
import React from 'react';

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 8V4H8" />
    <rect x="4" y="12" width="16" height="8" rx="2" />
    <path d="M4 12v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M14 12v-2" />
    <path d="M20 12v-2" />
    <path d="M12 12v-2" />
  </svg>
);
