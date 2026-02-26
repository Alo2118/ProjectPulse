import React from 'react';

interface HudDividerProps {
  label?: string;
}

export const HudDivider: React.FC<HudDividerProps> = ({ label }) => {
  if (label) {
    return <div className="hud-divider-label">{label}</div>;
  }
  return <div className="hud-divider" />;
};
