"use client";

import { useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getWalletCookie, deleteWalletCookie, setWalletCookie } from "@/lib/cookieUtils";

/**
 * Component that manages wallet session persistence with secure cookies
 * Handles:
 * - Saving wallet address to cookie on connection
 * - Cleaning up cookies on demand
 */
export function WalletPersistenceManager({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();

  // Save wallet address to cookie when user connects
  useEffect(() => {
    if (currentAccount?.address) {
      setWalletCookie(currentAccount.address);
    }
  }, [currentAccount?.address]);

  return <>{children}</>;
}
