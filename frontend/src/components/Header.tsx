"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { FaGithub } from "react-icons/fa"
import { useAccount, useBalance } from "wagmi"
import { useState, useEffect } from "react"

const Header: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [rannBalance, setRannBalance] = useState<string>("0");
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mock RANN token balance - in production, this would use useBalance with token address
  useEffect(() => {
    if (isConnected && address) {
      // For now, using mock data - replace with actual contract call
      setRannBalance("1,250");
    } else {
      setRannBalance("0");
    }
  }, [isConnected, address]);

  return (
    <header className="arcade-header-grey">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <a href="/">
                <h1 className="text-2xl text-red-400 tracking-widest arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                  RANN
                </h1>
              </a>
              <div className="hidden md:block border-l-2 border-red-500 pl-6">
                <h5 className="text-xs text-red-300 tracking-wide" style={{fontFamily: 'Press Start 2P, monospace'}}>
                  LEGENDARY ARENA AWAITS
                </h5>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* RANN Token Balance */}
            {isMounted && isConnected && (
              <div className="arcade-card-slate px-4 py-2 bg-slate-900/20 border-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-lg">🪙</span>
                  <div className="text-right">
                    <div className="text-xs text-red-300" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      RANN
                    </div>
                    <div className="text-sm text-red-400 font-bold" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      {rannBalance}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="connect-button-wrapper-slate">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button 
                              onClick={openConnectModal} 
                              type="button" 
                              className="arcade-button-slate"
                              style={{
                                borderRadius: '12px !important'
                              }}
                            >
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button 
                              onClick={openChainModal} 
                              type="button" 
                              className="arcade-button-slate-error"
                              style={{
                                borderRadius: '12px !important'
                              }}
                            >
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={openChainModal}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                borderRadius: '12px !important'
                              }}
                              type="button"
                              className="arcade-button-slate-medium"
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 14,
                                    height: 14,
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                    marginRight: 6,
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 14, height: 14 }}
                                    />
                                  )}
                                </div>
                              )}
                              {chain.name}
                            </button>

                            <button 
                              onClick={openAccountModal} 
                              type="button" 
                              className="arcade-button-slate-medium"
                              style={{
                                borderRadius: '12px !important'
                              }}
                            >
                              {account.displayName}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header