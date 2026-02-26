import React from 'react';

interface HudPanelHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export const HudPanelHeader: React.FC<HudPanelHeaderProps> = ({ title, action }) => {
  return (
    <div className="hud-panel-header">
      <span>{title}</span>
      {action && <div className="relative z-10 ml-auto">{action}</div>}
    </div>
  );
};
