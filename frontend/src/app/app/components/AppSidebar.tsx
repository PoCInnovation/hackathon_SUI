"use client";

import { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  AccountTree as WorkflowIcon,
  Store as MarketplaceIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Folder as TemplatesIcon,
} from "@mui/icons-material";

const DRAWER_WIDTH_MINI = 80;
const DRAWER_WIDTH_EXPANDED = 230;

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { id: "builder", label: "Block Builder", icon: <WorkflowIcon /> },
  { id: "marketplace", label: "Marketplace", icon: <MarketplaceIcon />},
  { id: "templates", label: "Strategy Folder", icon: <TemplatesIcon /> },
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onExpandedChange?: (isExpanded: boolean) => void;
}

export function AppSidebar({ activeSection, onSectionChange, onExpandedChange }: AppSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
    onExpandedChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    onExpandedChange?.(false);
  };

  return (
    <Drawer
      variant="permanent"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        width: isExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_MINI,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: isExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_MINI,
          boxSizing: 'border-box',
          backgroundColor: '#0a0f1e',
          borderRight: '2px solid rgba(59, 130, 246, 0.2)',
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Logo/Brand */}
      <Box
        sx={{
          borderBottom: '2px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          component="img"
          src="/logo-simple.png"
          alt="SAIL Logo"
          sx={{
            width: 80,
            height: 80,
            objectFit: 'contain',
          }}
        />
      </Box>

      {/* Navigation Items */}
      <List sx={{ px: 2, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
              sx={{
                borderRadius: 0,
                border: activeSection === item.id 
                  ? '2px solid #3b82f6' 
                  : '2px solid transparent',
                backgroundColor: activeSection === item.id 
                  ? 'rgba(59, 130, 246, 0.1)' 
                  : 'transparent',
                position: 'relative',
                minHeight: 48,
                justifyContent: isExpanded ? 'initial' : 'center',
                px: isExpanded ? 0 : 0,
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  borderColor: 'rgba(59, 130, 246, 0.5)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                },
              }}
            >
              {/* Corner dots for active item */}
              {activeSection === item.id && (
                <>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      width: 6,
                      height: 6,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 6,
                      height: 6,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      left: -2,
                      width: 6,
                      height: 6,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 6,
                      height: 6,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </>
              )}

              <ListItemIcon
                sx={{
                  color: activeSection === item.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                  minWidth: isExpanded ? 40 : 'auto',
                  mr: isExpanded ? 2 : 0,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              
              {isExpanded && (
                <>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em',
                        fontWeight: '600',
                        color: activeSection === item.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.8)',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                      },
                    }}
                  />
                  {item.badge && (
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#3b82f6',
                        color: '#0a0f1e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: '"Press Start 2P", monospace',
                        fontSize: '0.5rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.badge}
                    </Box>
                  )}
                </>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

    </Drawer>
  );
}
