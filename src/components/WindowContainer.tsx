import React, { useRef, useState, useEffect } from 'react';
import { Button } from 'devextreme-react/button';
import type { WindowState } from '../types/workspace';
import './WindowContainer.css';

interface WindowContainerProps {
  /** Unique instance ID */
  instanceId: string;
  /** Window title */
  title: string;
  /** Window state */
  windowState: WindowState;
  /** Children to render in window body */
  children: React.ReactNode;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Can resize */
  resizable?: boolean;
  /** Can maximize */
  maximizable?: boolean;
  /** Callbacks */
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onResize: (width: number, height: number) => void;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
}

export const WindowContainer: React.FC<WindowContainerProps> = ({
  instanceId,
  title,
  windowState,
  children,
  minWidth = 300,
  minHeight = 200,
  resizable = true,
  maximizable = true,
  onClose,
  onMinimize,
  onToggleMaximize,
  onResize,
  onMove,
  onFocus
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { x, y, width, height, isMinimized, isMaximized, zIndex } = windowState;

  // Handle window dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - x,
      y: e.clientY - y
    });
    onFocus();
  };

  // Handle window resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!resizable || isMaximized) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    onFocus();
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onMove(Math.max(0, newX), Math.max(0, newY));
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newWidth = Math.max(minWidth, width + deltaX);
        const newHeight = Math.max(minHeight, height + deltaY);
        
        onResize(newWidth, newHeight);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, width, height, minWidth, minHeight, onMove, onResize]);

  if (isMinimized) {
    return null; // TODO: Add taskbar for minimized windows
  }

  const style: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex
      }
    : {
        position: 'absolute',
        top: y,
        left: x,
        width,
        height,
        zIndex
      };

  return (
    <div
      ref={windowRef}
      className={`window-container ${isMaximized ? 'maximized' : ''}`}
      style={style}
      onClick={onFocus}
    >
      <div 
        className="window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <Button
            icon="minus"
            stylingMode="text"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            hint="Minimize"
          />
          {maximizable && (
            <Button
              icon={isMaximized ? "restore" : "expand"}
              stylingMode="text"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMaximize();
              }}
              hint={isMaximized ? "Restore" : "Maximize"}
            />
          )}
          <Button
            icon="close"
            stylingMode="text"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            hint="Close"
          />
        </div>
      </div>
      
      <div className="window-body">
        {children}
      </div>

      {resizable && !isMaximized && (
        <div 
          className="window-resize-handle"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
};
