"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getWalletAddress } from "../lib/privy";

const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function ConnectWalletModalShell({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Connect Wallet</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">Connect your Privy wallet to continue.</p>
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(5, 5, 10, 0.85);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 28px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .modal-close:hover {
          color: var(--color-danger);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-error {
          font-size: 13px;
          color: var(--color-danger);
          line-height: 1.4;
        }

        .w-full {
          width: 100%;
          justify-content: center;
        }

        .connect-option {
          padding: 14px;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function PrivyConnectWalletModal({ isOpen, onClose, onConnect }) {
  const [error, setError] = useState("");
  const { ready, authenticated, user, login } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  useEffect(() => {
    if (!isOpen || !ready || !walletsReady || !authenticated) {
      return;
    }

    const address = getWalletAddress(user, wallets);
    if (address) {
      onConnect(address);
      onClose();
    }
  }, [isOpen, ready, walletsReady, authenticated, user, wallets, onConnect, onClose]);

  const handleConnectPrivy = () => {
    setError("");

    if (!ready) {
      setError("Wallet connection is still loading. Try again in a moment.");
      return;
    }

    login();
  };

  return (
    <ConnectWalletModalShell isOpen={isOpen} onClose={onClose}>
      {error ? <p className="modal-error">{error}</p> : null}

      <button className="btn-primary w-full connect-option" onClick={handleConnectPrivy}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
        </svg>
        Connect Privy Wallet
      </button>
    </ConnectWalletModalShell>
  );
}

function UnconfiguredConnectWalletModal({ isOpen, onClose }) {
  return (
    <ConnectWalletModalShell isOpen={isOpen} onClose={onClose}>
      <p className="modal-error">
        Privy is not configured. Add your App ID to <code>.env.local</code> as{" "}
        <code>NEXT_PUBLIC_PRIVY_APP_ID</code>, then restart the dev server.
      </p>
      <p className="modal-desc">
        Get your App ID from the{" "}
        <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer">
          Privy Dashboard
        </a>
        .
      </p>
    </ConnectWalletModalShell>
  );
}

export default function ConnectWalletModal(props) {
  if (!hasPrivy) {
    return <UnconfiguredConnectWalletModal {...props} />;
  }

  return <PrivyConnectWalletModal {...props} />;
}
