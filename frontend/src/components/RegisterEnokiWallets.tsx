"use client";

import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import { useEffect } from "react";

export function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) {
      console.log("Enoki: Current network is not supported", network);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
    if (!apiKey || apiKey.startsWith("YOUR_")) {
      console.error("Enoki: Invalid API Key configuration. Please check your .env.local file.");
    }

    console.log("Enoki: Registering wallets for network", network);

    const { unregister } = registerEnokiWallets({
      apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY || "YOUR_PUBLIC_ENOKI_API_KEY",
      providers: {
        google: {
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
        },
        facebook: {
          clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "YOUR_FACEBOOK_CLIENT_ID",
        },
        twitch: {
          clientId: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || "YOUR_TWITCH_CLIENT_ID",
        },
      },
      client,
      network,
    });

    return unregister;
  }, [client, network]);

  return null;
}
