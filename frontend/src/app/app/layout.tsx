"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { WalletModal } from "@/components/WalletModal";
import { AppSidebar } from "./components/AppSidebar";
import { TopBar } from "./components/TopBar";
import { setWalletCookie, getWalletCookie } from "@/lib/cookieUtils";
import { DashboardSection } from "./sections/DashboardSection";
import { BuilderSection } from "./sections/BuilderSection";
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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if we have an active session (from localStorage via dapp-kit)
    const hasSession = typeof window !== "undefined" &&
      (localStorage.getItem("sui_wallet") || getWalletCookie());

    // Give dapp-kit time to restore the wallet from storage
    const loadingDuration = hasSession ? 2000 : 800;

    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Only show modal if still no account after loading
      setShowModal(true);
    }, loadingDuration);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Once account is connected, hide the modal
  useEffect(() => {
    if (currentAccount) {
      setShowModal(false);
    }
  }, [currentAccount]);

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
            linear-gradient(rgba(78, 222, 174, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(78, 222, 174, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-8"
        >
          {/* Animated Loading Icon */}
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-walrus-mint/40"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border-2 border-walrus-mint/30"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-4 h-4 bg-walrus-mint rounded-full"
              />
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-walrus-mint font-pixel text-sm tracking-widest">
              INITIALIZING SYSTEM
            </p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 bg-walrus-mint/60"
                />
              ))}
            </div>
          </div>
        </motion.div>
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
  const showWalletModal = !isLoading && !currentAccount && showModal;

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
            p: 3,
            pt: '80px', // TopBar height + padding
            ml: '80px', // Mini sidebar width
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        >
          {activeSection === 'dashboard' && <DashboardSection />}
          {activeSection === 'builder' && <BuilderSection />}
          {activeSection === 'marketplace' && <MarketplaceSection />}
          {activeSection === 'templates' && <TemplatesSection />}
          {activeSection === 'history' && <HistorySection />}
          {activeSection === 'settings' && <SettingsSection />}
        </Box>
      )}
    </Box>
  );
}
