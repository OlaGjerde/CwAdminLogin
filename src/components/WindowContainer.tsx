import React, { useRef, useState, useEffect } from 'react';
import { Button } from 'devextreme-react/button';
import type { WindowState } from '../types/workspace';
import './WindowContainer.css';
import { logDebug } from '../utils/logger';

interface WindowContainerProps {
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
  const [taskbarHeight, setTaskbarHeight] = useState(140); // Default fallback

  const { x, y, width, height, isMinimized, isMaximized, zIndex } = windowState;

  // Dynamically calculate available workspace height (container height minus taskbar)
  useEffect(() => {
    const updateTaskbarHeight = () => {
      const container = document.querySelector('.workbench-windows-container') as HTMLElement;
      const taskbar = document.querySelector('.workbench-apps-grid') as HTMLElement;
      
      if (container && taskbar) {
        const containerHeight = container.offsetHeight;
        const taskbarHeight = taskbar.offsetHeight;
        const availableHeight = containerHeight - taskbarHeight;
        
        // Store just the taskbar height for the calc
        setTaskbarHeight(taskbarHeight);
        logDebug('Container height:', containerHeight, 'Taskbar height:', taskbarHeight, 'Available:', availableHeight);
      } else if (taskbar) {
        // Fallback: just use taskbar height
        const height = taskbar.offsetHeight;
        setTaskbarHeight(height);
        logDebug('Taskbar height calculated:', height);
      }
    };

    // Initial calculation with a small delay to ensure DOM is ready
    setTimeout(updateTaskbarHeight, 100);

    // Recalculate on window resize
    window.addEventListener('resize', updateTaskbarHeight);
    
    // Use ResizeObserver if available for more accurate tracking
    let resizeObserver: ResizeObserver | null = null;
    const taskbar = document.querySelector('.workbench-apps-grid') as HTMLElement;
    
    if (taskbar && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateTaskbarHeight);
      resizeObserver.observe(taskbar);
    }

    return () => {
      window.removeEventListener('resize', updateTaskbarHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

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

  // Handle double-click to toggle maximize
  const handleDoubleClick = () => {
    if (maximizable) {
      onToggleMaximize();
    }
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
    return null; // Window is hidden when minimized
  }

  const style: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: `${taskbarHeight}px`,
        width: '100%',
        height: 'auto',
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
        onDoubleClick={handleDoubleClick}
      >
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <Button
            icon="minus"
            stylingMode="text"
            onClick={() => onMinimize()}
            hint="Minimize"
          />
          {maximizable && (
            <Button
              icon={isMaximized ? "restore" : "expand"}
              stylingMode="text"
              onClick={() => onToggleMaximize()}
              hint={isMaximized ? "Restore" : "Maximize"}
            />
          )}
          <Button
            icon="close"
            stylingMode="text"
            onClick={() => onClose()}
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
