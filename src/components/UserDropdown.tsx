/**
 * UserDropdown Component
 * 
 * A dropdown menu component for displaying user information and actions.
 * Displays a person icon button that opens a menu with username and logout option.
 */

import React from 'react';
import { DropDownButton } from 'devextreme-react/drop-down-button';
import type { ItemClickEvent } from 'devextreme/ui/drop_down_button';
import './UserDropdown.css';

interface UserDropdownProps {
  userEmail: string | null;
  displayName?: string | null;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  userEmail,
  displayName,
  onLogout,
}) => {
  const menuItems = [
    {
      id: 'user-info',
      text: displayName || userEmail || 'Bruker',
      icon: 'user',
      disabled: true, // Make it non-clickable, just informational
    },
    {
      id: 'logout',
      text: 'Logg ut',
      icon: 'runner',
      onClick: onLogout,
    },
  ];

  const handleItemClick = (e: ItemClickEvent) => {
    const item = e.itemData as typeof menuItems[number];
    if (item.id === 'logout') {
      onLogout();
    }
  };

  return (
    <div className="user-dropdown">
      <DropDownButton
        text=""
        icon="user"
        items={menuItems}
        displayExpr="text"
        keyExpr="id"
        onItemClick={handleItemClick}
        stylingMode="outlined"
        dropDownOptions={{
          width: 250,
        }}
        className="user-dropdown-button"
      />
    </div>
  );
};
