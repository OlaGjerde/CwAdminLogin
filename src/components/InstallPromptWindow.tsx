/**
 * InstallPromptWindow Component
 * 
 * A borderless window displayed in the workspace area when CalWin protocol handler fails.
 * Provides instructions and download button for installing CalWin.
 */
import React from 'react';
import { Button } from 'devextreme-react/button';
import './InstallPromptWindow.css';

interface InstallPromptWindowProps {
  installerUrl: string;
  onClose: () => void;
}

export const InstallPromptWindow: React.FC<InstallPromptWindowProps> = ({
  installerUrl,
  onClose,
}) => {
  const handleDownload = () => {
    window.open(installerUrl, '_blank');
    onClose(); // Close the window after initiating download
  };

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-window">
        <button 
          className="install-prompt-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        
        <div className="install-prompt-icon">
          📦
        </div>
        
        <h2 className="install-prompt-title">Install CalWin Desktop</h2>
        
        <div className="install-prompt-content">
          <div className="install-prompt-steps">
            <h3>First-time setup</h3>
            <ol>
              <li>Click the "Download CalWin" button below</li>
              <li>Open the downloaded <strong>.appinstaller</strong> file</li>
              <li>Follow the installation wizard</li>
              <li>When the installation is complete, click "Start CalWin" again</li>
            </ol>
          </div>
          <div className="install-prompt-note">After installation, CalWin Desktop will auto-update itself with new versions.</div>
        </div>
        
        <div className="install-prompt-actions">
          <Button
            text="Download CalWin"
            icon="download"
            type="default"
            stylingMode="contained"
            onClick={handleDownload}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};