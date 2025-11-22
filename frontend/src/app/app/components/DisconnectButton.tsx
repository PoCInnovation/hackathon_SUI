"use client";

import { useDisconnectWallet, useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteWalletCookie } from "@/lib/cookieUtils";
import { LogOut } from "lucide-react";

export function DisconnectButton() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      // Delete the cookie first
      deleteWalletCookie();
      // Then disconnect
      disconnect();
      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show if connected
  if (!currentAccount) {
    return null;
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 text-xs font-pixel text-walrus-mint/80 hover:text-walrus-mint border border-walrus-mint/40 hover:border-walrus-mint/80 rounded transition-colors disabled:opacity-50"
      title="Disconnect wallet"
    >
      <LogOut size={12} />
      {isLoading ? "..." : "DISCONNECT"}
    </button>
  );
}
