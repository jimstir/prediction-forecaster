"use client";

import { useState, useEffect, useRef } from "react";

export default function InsightsWidget() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const chatEndRef = useRef(null);

  // Pre-populated popular/trending markets for instant exploration
  const featuredMarkets = [
    {
      title: "Will the Fed lower interest rates in June 2026?",
      description: "Resolves based on the Federal Reserve interest rate announcement in June 2026.",
      yesPrice: 0.58,
      noPrice: 0.42,
    },
    {
      title: "Will SpaceX launch Starship Flight 6 this quarter?",
      description: "Resolves based on public tower launch verification of flight 6.",
      yesPrice: 0.65,
      noPrice: 0.35,
    },
    {
      title: "Will any country adopt Bitcoin as legal tender in 2026?",
      description: "Resolves if any sovereign country declares BTC legal tender.",
      yesPrice: 0.35,
      noPrice: 0.65,
    }
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Fetch from Polymarket Gamma search API
      const res = await fetch(
        `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(val)}&events_status=active&limit_per_type=6`
      );
      if (res.ok) {
        const data = await res.json();
        // The API returns { events: [...], tags: [...], profiles: [...] }
        if (data && Array.isArray(data.events)) {
          // Map to match our simplified format
          const mapped = data.events.map(ev => {
            // Find outcome prices from nested markets if available
            let yesPrice = 0.5;
            let noPrice = 0.5;
            if (Array.isArray(ev.markets) && ev.markets[0]) {
              const mkt = ev.markets[0];
              if (Array.isArray(mkt.outcomePrices)) {
                yesPrice = parseFloat(mkt.outcomePrices[0] || 0.5);
                noPrice = parseFloat(mkt.outcomePrices[1] || 0.5);
              }
            }
            return {
              title: ev.title,
              description: ev.description || "Active prediction market on Polymarket.",
              yesPrice,
              noPrice,
            };
          });
          setSearchResults(mapped);
        }
      }
    } catch (err) {
      console.error("Error searching Polymarket events:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMarket = (mkt) => {
    setSelectedMarket(mkt);
    setSearchQuery("");
    setSearchResults([]);
    
    // Set initial welcome assistant message
    setChatMessages([
      {
        sender: "assistant",
        text: `Hello! I am your AI Market Analyst. I can provide insights for the market: **"${mkt.title}"**. 

Ask me about:
- Key catalysts driving this event.
- Underlying risks or resolution rules.
- Historical context or macro events.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedMarket || loading) return;

    const userMsgText = chatInput;
    setChatInput("");

    // Append User Message
    const userMsg = {
      sender: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketTitle: selectedMarket.title,
          userQuery: userMsgText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Append Assistant Message
        setChatMessages(prev => [
          ...prev,
          {
            sender: "assistant",
            text: data.text,
            provider: data.provider,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      } else {
        throw new Error("Failed to retrieve insights");
      }
    } catch (err) {
      console.error("AI chat error:", err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: "I'm sorry, I encountered an issue generating insights for this market. Please verify your internet connection or check API keys in the `.env` file.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Simplistic custom Markdown-like parser for bold text, list items, and code block warnings
  const formatMessageText = (text) => {
    if (!text) return "";
    
    // Split into paragraphs/lines
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return <h5 key={idx} className="msg-header-3">{trimmed.replace("###", "").trim()}</h5>;
      }
      if (trimmed.startsWith("##")) {
        return <h4 key={idx} className="msg-header-2">{trimmed.replace("##", "").trim()}</h4>;
      }
      if (trimmed.startsWith("#")) {
        return <h3 key={idx} className="msg-header-1">{trimmed.replace("#", "").trim()}</h3>;
      }

      // Horizontal rules
      if (trimmed === "---") {
        return <hr key={idx} className="msg-divider" />;
      }

      // Warning Callout Block
      if (trimmed.startsWith("> [!WARNING]")) {
        return null; // Handle start of callout
      }

      // Bold formatting
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;
      
      // Convert list items
      const isBullet = trimmed.startsWith("*") || trimmed.startsWith("-");
      if (isBullet) {
        const listText = trimmed.substring(1).trim();
        return (
          <li key={idx} className="msg-list-item">
            <span dangerouslySetInnerHTML={{ 
              __html: listText
                .replace(boldRegex, "<strong>$1</strong>")
                .replace(italicRegex, "<em>$1</em>") 
            }} />
          </li>
        );
      }

      return (
        <p key={idx} className="msg-paragraph" dangerouslySetInnerHTML={{
          __html: formattedLine
            .replace(boldRegex, "<strong>$1</strong>")
            .replace(italicRegex, "<em>$1</em>")
        }} />
      );
    });
  };

  return (
    <div className="widget-wrapper">
      <div className="widget-header">
        <div className="widget-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Market Insights & AI
        </div>
        {selectedMarket && (
          <button className="btn-back" onClick={() => setSelectedMarket(null)}>
            Reset Market
          </button>
        )}
      </div>

      <div className="widget-content">
        {!selectedMarket ? (
          <div className="search-state">
            <p className="search-label">Find a prediction market or select a featured one:</p>
            
            <div className="search-box">
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search Polymarket events (e.g. Fed, SpaceX...)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && <span className="search-loader"></span>}
            </div>

            {searchQuery.trim() !== "" ? (
              <div className="results-list">
                {searchResults.length === 0 && !searching ? (
                  <p className="no-results">No active markets match your search.</p>
                ) : (
                  searchResults.map((mkt, idx) => (
                    <div key={idx} className="result-item" onClick={() => handleSelectMarket(mkt)}>
                      <div className="result-info">
                        <span className="result-title">{mkt.title}</span>
                        <span className="result-desc">{mkt.description}</span>
                      </div>
                      <div className="result-prices">
                        <span className="price-tag yes-tag">Yes {Math.round(mkt.yesPrice * 100)}¢</span>
                        <span className="price-tag no-tag">No {Math.round(mkt.noPrice * 100)}¢</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="featured-section">
                <span className="section-label">Trending Markets</span>
                <div className="featured-grid">
                  {featuredMarkets.map((mkt, idx) => (
                    <div key={idx} className="featured-card" onClick={() => handleSelectMarket(mkt)}>
                      <div className="feat-info">
                        <span className="feat-title">{mkt.title}</span>
                        <span className="feat-desc">{mkt.description}</span>
                      </div>
                      <div className="feat-prices">
                        <span className="price-sub yes-sub">YES {Math.round(mkt.yesPrice * 100)}¢</span>
                        <span className="price-sub no-sub">NO {Math.round(mkt.noPrice * 100)}¢</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="chat-state">
            <div className="selected-market-banner">
              <div className="banner-details">
                <h6>Active Analysis</h6>
                <h4>{selectedMarket.title}</h4>
              </div>
              <div className="banner-stats">
                <div className="stat-pill yes-pill">YES: {Math.round(selectedMarket.yesPrice * 100)}%</div>
                <div className="stat-pill no-pill">NO: {Math.round(selectedMarket.noPrice * 100)}%</div>
              </div>
            </div>

            <div className="chat-messages-container">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "assistant-bubble"}`}>
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.sender === "user" ? "You" : "AI Market Analyst"}
                    </span>
                    {msg.provider && (
                      <span className="provider-tag">{msg.provider}</span>
                    )}
                  </div>
                  <div className="message-text">
                    {formatMessageText(msg.text)}
                  </div>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              ))}
              {loading && (
                <div className="message-bubble assistant-bubble loading-bubble">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="chat-input-bar">
              <input
                type="text"
                className="form-input chat-input-field"
                placeholder="Ask about catalysts, oracle rules, or market volatility..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn-primary send-btn" disabled={loading || !chatInput.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{` /* styles omitted for brevity in listing */ `}</style>
    </div>
  );
}
