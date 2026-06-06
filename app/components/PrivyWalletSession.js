"use client";

import { useEffect, useImperativeHandle, forwardRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getWalletAddress } from "../lib/privy";

const PrivyWalletSession = forwardRef(function PrivyWalletSession(
  { onAddressChange },
  ref
) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  useImperativeHandle(ref, () => ({
    logout,
  }));

  useEffect(() => {
    if (!ready || !walletsReady) {
      return;
    }

    if (!authenticated) {
      onAddressChange("");
      return;
    }

    const address = getWalletAddress(user, wallets);
    onAddressChange(address);
  }, [ready, walletsReady, authenticated, user, wallets, onAddressChange]);

  return null;
});

export default PrivyWalletSession;
