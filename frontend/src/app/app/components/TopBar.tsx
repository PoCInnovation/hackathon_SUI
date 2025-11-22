"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import { Box } from "@mui/material";

interface TopBarProps {
  activeSection?: string;
  sidebarExpanded?: boolean;
}

const sectionNames: Record<string, string> = {
  dashboard: "Dashboard",
  builder: "Block Builder",
  marketplace: "Marketplace",
  templates: "Templates",
  history: "History",
  settings: "Settings",
};

const DRAWER_WIDTH_MINI = 80;
const DRAWER_WIDTH_EXPANDED = 230;

export function TopBar({ activeSection = "builder", sidebarExpanded = false }: TopBarProps) {
  const sectionName = sectionNames[activeSection] || activeSection;
  const sidebarWidth = sidebarExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_MINI;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: `${sidebarWidth}px`,
        right: 0,
        height: "82px",
        backgroundColor: '#0a0f1e',
        borderBottom: '2px solid rgba(59, 130, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        zIndex: 40,
        transition: 'left 0.3s ease',
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <div className="font-pixel text-lg">
        {sectionName}
      </div>
      <div className="font-pixel text-xs scale-90">
        <ConnectButton />
      </div>
    </Box>
  );
}
