"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { WalletModal } from "@/components/WalletModal";
import { AppSidebar } from "./components/AppSidebar";
import { TopBar } from "./components/TopBar";
import { setWalletCookie, getWalletCookie } from "@/lib/cookieUtils";
import { DashboardSection } from "./sections/DashboardSection";
import { BuilderSection } from "./sections/BuilderSection/index";
import { MarketplaceSection } from "./sections/MarketplaceSection";
import { TemplatesSection } from "./sections/TemplatesSection";
import { HistorySection } from "./sections/HistorySection";
import { SettingsSection } from "./sections/SettingsSection";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Monitor } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentAccount = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("builder");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Determine if we have a persisted wallet session (cookie or dapp-kit localStorage)
    // dapp-kit stores wallet info in localStorage with various keys, so we check our cookie
    const hasSession = typeof window !== 'undefined' && getWalletCookie();
    // Shorter loading: 0.5s if session, 0.1s otherwise
    const loadingDuration = hasSession ? 500 : 100;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, loadingDuration);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Save wallet to cookie when connected
  useEffect(() => {
    if (currentAccount?.address) {
      setWalletCookie(currentAccount.address);
    }
  }, [currentAccount?.address]);

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-[#0a0f1e] flex items-center justify-center"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      >
        <div className="w-3/4 max-w-xl">
          {/* Progress bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5, ease: "linear", repeat: Infinity }}
            />
          </div>
          <p className="mt-4 text-center text-white font-pixel text-2xl tracking-widest">
            INITIALIZING SYSTEM
          </p>
        </div>
      </div>
    );
  }

  // Show mobile warning
  if (isMobile) {
    return (
      <div 
        className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-6"
        style={{
          backgroundImage: `
            linear-gradient(rgba(78, 222, 174, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(78, 222, 174, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <div className="border-4 border-walrus-mint/40 bg-[#0a0f1e]/95 backdrop-blur-xl p-8 relative">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-walrus-mint" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-walrus-mint" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-walrus-mint" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-walrus-mint" />

            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 border-2 border-walrus-mint/40 flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-walrus-mint" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-2xl font-pixel text-white tracking-wider">
                  DESKTOP ONLY
                </h1>
                <p className="text-walrus-mint/80 font-mono text-sm">
                  This application is only available on desktop devices
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-walrus-mint/20" />
                <div className="w-2 h-2 bg-walrus-mint/40" />
                <div className="h-px flex-1 bg-walrus-mint/20" />
              </div>

              {/* Info */}
              <p className="text-gray-400 text-xs font-mono">
                Please access this application from a desktop or laptop computer for the best experience.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show wallet modal only if loading is done and still no account
  const showWalletModal = !isLoading && !currentAccount;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0f1e' }}>
      <WalletModal isOpen={showWalletModal} />

      {/* Sidebar */}
      {currentAccount && (
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onExpandedChange={setSidebarExpanded}
        />
      )}

      {/* TopBar */}
      {currentAccount && <TopBar activeSection={activeSection} sidebarExpanded={sidebarExpanded} />}

      {/* Main Content Area */}
      {currentAccount && (
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            m: 0,
            px: 7,
            py: 7,
            pt: 'calc(80px + 24px + 24px)', // TopBar height + padding
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        >
          {activeSection === 'dashboard' && <DashboardSection />}
          {activeSection === 'builder' && <BuilderSection onNavigate={setActiveSection} />}
          {activeSection === 'marketplace' && <MarketplaceSection />}
          {activeSection === 'templates' && <TemplatesSection />}
          {activeSection === 'history' && <HistorySection />}
          {activeSection === 'settings' && <SettingsSection />}
        </Box>
      )}
    </Box>
  );
}
