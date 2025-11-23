import { useState, useEffect } from "react";
import { api } from "@/services/api";

export function useTokens() {
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getTokens()
      .then(data => {
        console.log("Tokens received from backend:", data);
        // S'assurer que SUI est toujours présent
        const tokens = data || {};
        if (!tokens.SUI && !tokens.sui) {
          tokens.SUI = "0x2::sui::SUI";
        }
        if (!tokens.USDC && !tokens.usdc) {
          tokens.USDC = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
        }
        setTokenMap(tokens);
      })
      .catch(err => {
        console.error("Failed to fetch tokens from backend:", err);
        // Fallback: ensure SUI and USDC are always available
        setTokenMap({ 
          SUI: "0x2::sui::SUI",
          USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
        });
      });
  }, []);

  return tokenMap;
}


