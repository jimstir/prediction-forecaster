"use client";

import { useState } from "react";

import ERC8004_ABI from '../abis/ERC8004.json';

export default function ForecastWidget({ walletAddress, onConnectClick }) {
  const [marketId, setMarketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fbValue, setFbValue] = useState("");
  const [fbTag1, setFbTag1] = useState("");
  const [fbTag2, setFbTag2] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbError, setFbError] = useState("");
  const [fbSuccess, setFbSuccess] = useState(false);

  // ── Fetch market / forecast ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setFbSuccess(false);
    if (!marketId) return setError("Enter a market ticker or Kalshi URL to fetch market details.");
    setLoading(true);

    let extractedTicker = marketId.trim();
    if (extractedTicker.includes("kalshi.com/markets/")) {
      const parts = extractedTicker.split('/').filter(Boolean);
      extractedTicker = parts[parts.length - 1];
    }

    try {
      const query = `/api/kalshi/market?ticker=${encodeURIComponent(extractedTicker)}`;
      const resp = await fetch(query);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to fetch market from Kalshi");

      // data contains the curated market object
      const market = data.market || data;

      // Call recommendations orchestration
      const recResp = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ market })
      });
      const recJson = await recResp.json();
      if (!recResp.ok) throw new Error(recJson.error || 'Recommendation orchestration failed');

      setResult(recJson);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Submit on-chain feedback ─────────────────────────────────────────
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFbError("");
    if (!fbValue) return setFbError("A numeric value is required.");

    try {
      setFbSubmitting(true);
      const { ethers } = await import("ethers");

      if (!window.ethereum) throw new Error("No wallet detected. Please install MetaMask.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS;
      if (!reputationAddress) throw new Error("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS is not set.");

      // Use the ERC-8004 ABI file included in the project
      const contract = new ethers.Contract(reputationAddress, ERC8004_ABI, signer);

      // Use the event / agent id from the forecast result
      const agentId = result?.agentId ?? 0;
      const value = parseInt(fbValue, 10);

      const tx = await contract.giveFeedback(
        agentId,
        value,
        0,            // valueDecimals
        fbTag1,       // tag1
        fbTag2,       // tag2
        "",           // endpoint (optional)
        "",           // feedbackURI (optional)
        ethers.ZeroHash // feedbackHash (optional)
      );
      await tx.wait();

      setFbSuccess(true);
      setShowFeedbackModal(false);
      // Reset fields
      setFbValue("");
      setFbTag1("");
      setFbTag2("");
    } catch (err) {
      console.error(err);
      setFbError(err?.reason || err?.message || "Transaction failed");
    } finally {
      setFbSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="forecast-widget">
      <div className="widget-header">
        <h3>Forecast</h3>
        <p className="widget-sub">Request an evidence-backed forecast for a prediction market.</p>
      </div>

      {/* ── Input form ─────────────────────────────────────────────── */}
      <form className="forecast-form" onSubmit={handleSubmit}>
        <label className="form-label">Market ID or Slug</label>
        <div className="input-row">
          <input
            className="form-input"
            placeholder="e.g. https://kalshi.com/markets/…"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Loading…" : "Get Forecast"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      {/* ── Forecast result ────────────────────────────────────────── */}
      <div className="forecast-result" style={{marginTop: 16}}>
        {result ? (
          <div>
            <h4>Recommendation</h4>
            <pre style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre>

            {fbSuccess && (
              <p className="fb-success">✅ Feedback submitted on-chain.</p>
            )}

            <button
              className="btn-feedback"
              onClick={() => { setShowFeedbackModal(true); setFbError(""); setFbSuccess(false); }}
            >
              Submit Feedback
            </button>
          </div>
        ) : (
          <p className="text-muted">No forecast requested yet.</p>
        )}
      </div>

      {/* ── Feedback modal ─────────────────────────────────────────── */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Submit Feedback</h4>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleFeedbackSubmit}>
              <label className="form-label">Rating Value</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 85"
                value={fbValue}
                onChange={(e) => setFbValue(e.target.value)}
                required
              />

              <label className="form-label">Tag 1 <span className="optional">(optional)</span></label>
              <input
                className="form-input"
                type="text"
                placeholder='e.g. "starred"'
                value={fbTag1}
                onChange={(e) => setFbTag1(e.target.value)}
              />

              <label className="form-label">Tag 2 <span className="optional">(optional)</span></label>
              <input
                className="form-input"
                type="text"
                placeholder='e.g. "accuracy"'
                value={fbTag2}
                onChange={(e) => setFbTag2(e.target.value)}
              />

              {fbError && <p className="form-error">{fbError}</p>}

              <div className="modal-actions">
                <button className="btn-primary" type="submit" disabled={fbSubmitting}>
                  {fbSubmitting ? "Submitting…" : "Submit"}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .widget-header h3 { font-size: 16px; margin: 0 0 6px 0; }
        .widget-sub { font-size: 12px; color: var(--text-secondary); margin: 0 0 12px 0; }
        .forecast-widget { border: 2px solid rgba(255,255,255,0.95); border-radius: 12px; padding: 12px; color: #ffffff; }
        .forecast-form { display: flex; flex-direction: column; gap: 8px; max-width: 640px; }
        .form-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; }
        .input-row { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .form-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.95); background: rgba(255,255,255,0.03); color: #ffffff; box-shadow: inset 0 -1px 0 rgba(255,255,255,0.01); }
        .form-input::placeholder { color: rgba(255,255,255,0.75); }
        .form-error { color: var(--color-danger); font-size: 13px; margin: 4px 0 0; }
        .text-muted { color: var(--text-muted); }
        .optional { font-weight: 400; color: var(--text-muted); }
        pre { background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; overflow: auto; }

        .fb-success { color: var(--color-success, #22c55e); font-size: 13px; margin: 8px 0; }

        .btn-feedback {
          margin-top: 12px;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15));
          color: var(--text-primary);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-feedback:hover { background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3)); }
        .btn-primary {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%);
          color: white;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(12,12,50,0.35);
          transition: transform 0.12s ease, opacity 0.12s ease;
        }
        .btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-card {
          background: var(--bg-primary, #1a1a2e);
          border: 1px solid var(--border-color, #333);
          border-radius: 16px;
          padding: 24px 28px;
          min-width: 360px;
          max-width: 440px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
        .modal-header h4 { margin: 0; font-size: 16px; }
        .modal-close {
          background: none; border: none; color: var(--text-secondary);
          font-size: 18px; cursor: pointer; padding: 4px;
        }
        .modal-form { display: flex; flex-direction: column; gap: 10px; }
        .modal-actions { display: flex; gap: 8px; margin-top: 8px; }
        .btn-secondary {
          padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border-color);
          background: transparent; color: var(--text-secondary); cursor: pointer;
        }
      `}</style>
    </div>
  );
}
