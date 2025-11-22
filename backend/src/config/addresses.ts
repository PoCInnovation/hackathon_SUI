
/**
 * Navi Protocol Mainnet Addresses
 * Source: navi-sdk v1.6.23
 *
 * STORAGE: Main storage object containing all protocol data (pools, reserves, configs)
 * PRICE_ORACLE: Oracle providing real-time asset prices
 * FLASHLOAN_CONFIG: Flash loan configuration (fees, supported assets, limits)
 * INCENTIVE_V2: Legacy rewards system
 * INCENTIVE_V3: Current rewards system (recommended)
 */
export const MAINNET_ADDRESSES = {
  NAVI: {
    PACKAGE: "0xee0041239b89564ce870a7dec5ddc5d114367ab94a1137e90aa0633cb76518e0",
    STORAGE: "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe",
    PRICE_ORACLE: "0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef",
    FLASHLOAN_CONFIG: "0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc",
    INCENTIVE_V2: "0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c",
    INCENTIVE_V3: "0x62982dad27fb10bb314b3384d5de8d2ac2d72ab2dbeae5d801dbdb9efa816c80",
    POOLS: {
      "0x2::sui::SUI": {
        poolId: "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
        assetId: 0,
        name: "SUI"
      },
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN": { // USDT
        poolId: "0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103",
        assetId: 2,
        name: "USDT"
      },
      "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN": { // WETH
        poolId: "0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56",
        assetId: 3,
        name: "WETH"
      },
      "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS": {
        poolId: "0x3c376f857ec4247b8ee456c1db19e9c74e0154d4876915e54221b5052d5b1e2e",
        assetId: 4,
        name: "CETUS"
      },
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN": { // wUSDC
        poolId: "0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8",
        assetId: 1,
        name: "wUSDC"
      },
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC": { // nUSDC
        poolId: "0xa3582097b4c57630046c0c49a88bfc6b202a3ec0a9db5597c31765f7563755a8",
        assetId: 10,
        name: "nUSDC"
      },
      "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT": { // vSui
        poolId: "0x9790c2c272e15b6bf9b341eb531ef16bcc8ed2b20dfda25d060bf47f5dd88d01",
        assetId: 5,
        name: "vSui"
      }
    }
  },
  CETUS: {
    PACKAGE: "0xb2db7142fa83210a7d78d9c12ac49c043b3cbbd482224fea6e3da00aa5a5ae2d", // Router Package from Navi Config
    CONFIG: {
      pools_id: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",
      global_config_id: "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f", // CLMM Global Config
      global_vault_id: "0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b"
    }
  }
};
