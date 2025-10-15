import React from 'react';
import type { AppDefinition } from '../types/custom-app';
import './AppIcon.css';

interface AppIconProps {
  /** App definition */
  app: AppDefinition;
  /** Click handler */
  onClick: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({
  app,
  onClick,
  isLoading = false,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled && !isLoading) {
      onClick();
    }
  };

  const renderIcon = () => {
    if (typeof app.icon === 'string') {
      // DevExtreme icon name
      return <i className={`dx-icon dx-icon-${app.icon}`} />;
    } else {
      // Custom SVG component
      const IconComponent = app.icon;
      return <IconComponent className="app-icon-custom" size={32} />;
    }
  };

  return (
    <div
      className={`app-icon ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleClick}
      title={app.description || app.name}
    >
      <div className="app-icon-image">
        {isLoading ? (
          <div className="app-icon-spinner">
            <i className="dx-icon dx-icon-spindown" />
          </div>
        ) : (
          renderIcon()
        )}
      </div>
      <div className="app-icon-label">{app.name}</div>
    </div>
  );
};
