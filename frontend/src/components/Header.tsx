"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { FaGithub } from "react-icons/fa"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { useState, useEffect } from "react"
import { chainsToTSender, rannTokenAbi } from "../constants"
import { formatEther } from "viem"

const Header: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get contract address for current chain
  const contractAddress = chainId ? chainsToTSender[chainId]?.rannToken : undefined;

  // Read RANN token balance
  const { data: rannBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: rannTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!(isConnected && address && contractAddress),
    }
  });

  // Format balance for display
  const formattedBalance = rannBalance ? 
    parseFloat(formatEther(rannBalance as bigint)).toFixed(2) : 
    "0.00";

  // Refetch balance periodically when connected
  useEffect(() => {
    if (isConnected && address && contractAddress) {
      const interval = setInterval(() => {
        refetchBalance();
      }, 10000); // Refetch every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, address, contractAddress, refetchBalance]);

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
                      {formattedBalance}
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