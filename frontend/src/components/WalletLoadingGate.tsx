"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { getWalletCookie } from "@/lib/cookieUtils";
import { motion } from "framer-motion";

/**
 * Gate that waits for wallet to fully load before showing the app
 * Prevents showing the login modal if a wallet session exists
 */
export function WalletLoadingGate({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();
  const [isReady, setIsReady] = useState(false);
  const [waitForWallet, setWaitForWallet] = useState(false);

  // Check if we should wait for wallet restoration
  useEffect(() => {
    // If there's a saved wallet cookie, wait a bit for dapp-kit to restore it
    if (getWalletCookie() && !currentAccount) {
      setWaitForWallet(true);
      // Give dapp-kit time to restore the wallet (max 3 seconds)
      const timeout = setTimeout(() => {
        setIsReady(true);
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      // No cookie or already connected, proceed immediately
      setIsReady(true);
    }
  }, [currentAccount]);

  // If waiting for wallet and none connected yet, show loading
  if (waitForWallet && !currentAccount && !isReady) {
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

          <div className="space-y-2">
            <p className="text-walrus-mint font-pixel text-sm tracking-widest">
              RESTORING SESSION
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

  return <>{children}</>;
}
