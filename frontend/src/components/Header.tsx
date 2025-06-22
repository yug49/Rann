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
    <header className="arcade-header">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <a href="/">
                <h1 className="text-2xl text-yellow-400 tracking-widest arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                  RANN
                </h1>
              </a>
              <div className="hidden md:block border-l-2 border-yellow-600 pl-6">
                <h5 className="text-xs text-yellow-300 tracking-wide" style={{fontFamily: 'Press Start 2P, monospace'}}>
                  LEGENDARY ARENA AWAITS
                </h5>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* RANN Token Balance */}
            {isMounted && isConnected && (
              <div className="arcade-card px-4 py-2 bg-yellow-900/20 border-yellow-500">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-lg">🪙</span>
                  <div className="text-right">
                    <div className="text-xs text-yellow-300" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      RANN
                    </div>
                    <div className="text-sm text-yellow-400 font-bold" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      {rannBalance}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="connect-button-wrapper">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header