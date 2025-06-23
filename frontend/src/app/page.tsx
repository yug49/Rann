"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import './home-glass.css';

// Token Exchange Card Component
const TokenExchangeCard = ({ 
  title, 
  description, 
  icon, 
  fromToken, 
  toToken, 
  rate, 
  type 
}: {
  title: string;
  description: string;
  icon: string;
  fromToken: string;
  toToken: string;
  rate: string;
  type: 'mint' | 'burn';
}) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExchange = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsLoading(true);
    // Mock transaction - in production, this would interact with the smart contract
    console.log(`${type === 'mint' ? 'Minting' : 'Burning'} ${amount} tokens`);
    
    // Simulate transaction delay
    setTimeout(() => {
      setIsLoading(false);
      setAmount('');
      alert(`${type === 'mint' ? 'Minted' : 'Burned'} ${amount} ${toToken} tokens!`);
    }, 2000);
  };

  const cardColor = type === 'mint' ? 'border-green-500' : 'border-red-500';
  const buttonColor = type === 'mint' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div 
      className={`arcade-card p-6 ${cardColor} group home-token-card`}
      style={{
        background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%) !important',
        border: type === 'mint' ? '3px solid #38a169 !important' : '3px solid #e53e3e !important',
        backdropFilter: 'blur(20px) !important',
        WebkitBackdropFilter: 'blur(20px) !important',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2) !important',
        borderRadius: '16px !important',
        borderImage: 'none !important'
      }}
    >
      <div className="text-center mb-6">
        <div className="mb-4">
          <span className="text-4xl filter drop-shadow-lg">{icon}</span>
        </div>
        <h3 
          className="text-xl text-yellow-400 mb-2 tracking-wider arcade-glow"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {title}
        </h3>
        <p 
          className="text-gray-300 text-xs"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {/* Exchange Rate */}
        <div className="bg-stone-800 p-3 rounded border border-yellow-600">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">EXCHANGE RATE</span>
            <span className="text-yellow-400 text-sm font-bold">{rate}</span>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-3">
          <div>
            <label className="block text-yellow-300 text-xs mb-2">
              AMOUNT TO {type === 'mint' ? 'CONVERT' : 'BURN'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-stone-800 border border-yellow-600 rounded text-white text-center text-lg"
                placeholder="0.0"
                step="0.01"
                min="0"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-400 text-sm">
                {fromToken}
              </span>
            </div>
          </div>

          {/* Conversion Display */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-stone-700 p-3 rounded border border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">YOU WILL RECEIVE</span>
                <span className="text-green-400 text-sm font-bold">
                  {amount} {toToken}
                </span>
              </div>
            </div>
          )}

          {/* Exchange Button */}
          <button
            onClick={handleExchange}
            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            className={`w-full py-3 px-4 rounded text-white font-bold text-sm transition-all duration-200 ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px !important'
            }}
          >
            {isLoading ? 'PROCESSING...' : `${type === 'mint' ? 'MINT' : 'BURN'} ${toToken}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="home-page min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Home.png"
          alt="Home Background"
          fill
          className="object-cover"
          priority
        />
        {/* Very subtle black overlay to darken background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.175)',
            zIndex: 1
          }}
        ></div>
      </div>
      
      {/* Epic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Geometric Battle Lines */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-30"></div>
        <div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-16">
        {/* Epic Title Section */}
        <div className="text-center mb-20">
          <h1 
            className="text-6xl md:text-8xl text-red-400 mb-8 tracking-widest arcade-glow"
            style={{
              fontFamily: 'Press Start 2P, monospace'
            }}
          >
            RANN
          </h1>
          <div 
            className="arcade-border p-6 mx-auto max-w-4xl"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '2px solid #2d5a27',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2)',
              borderRadius: '12px'
            }}
          >
            <p 
              className="text-yellow-400 text-lg md:text-xl tracking-wide metal-text"
              style={{
                fontFamily: 'Press Start 2P, monospace',
                color: '#2d5a27',
                background: 'none',
                WebkitTextFillColor: '#2d5a27',
                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8), 0 0 3px rgba(255, 255, 255, 0.6)'
              }}
            >
              ENTER THE ULTIMATE BATTLEGROUND
            </p>
            <p 
              className="text-red-400 text-sm mt-4 arcade-glow"
              style={{
                fontFamily: 'Press Start 2P, monospace',
                color: '#c53030',
                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8), 0 0 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              WHERE LEGENDS ARE FORGED IN COMBAT
            </p>
          </div>
        </div>

        {/* Wallet Connection Warning */}
        {isMounted && !isConnected && (
          <div className="max-w-4xl mx-auto mb-12">
            <div 
              className="arcade-card p-8 border-red-600 bg-red-900/20"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255, 182, 193, 0.2), rgba(255, 160, 160, 0.15) 50%), linear-gradient(135deg, rgba(255, 182, 193, 0.25) 0%, rgba(255, 160, 160, 0.2) 30%, rgba(255, 182, 193, 0.25) 100%)',
                border: '3px solid #e53e3e',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(229, 62, 62, 0.2)',
                borderRadius: '16px'
              }}
            >
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-4xl">🔒</span>
                </div>
                <h2 
                  className="text-2xl text-red-400 mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  WALLET CONNECTION REQUIRED
                </h2>
                <p 
                  className="text-red-200 text-sm leading-relaxed mb-4"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  TO ENTER THE BATTLEFIELD AND ACCESS ALL FEATURES
                </p>
                <p 
                  className="text-red-300 text-xs"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  CONNECT YOUR WALLET TO PROCEED
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Epic Game Mode Arena */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
          
          {/* Chaavani - The Forge */}
          <div 
            className="arcade-card p-8 group cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[400px]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #2d5a27 !important',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2)',
              borderRadius: '16px !important',
              borderImage: 'none !important',
              padding: '2rem',
            }}
          >
            <Image 
              src="/Chaavani_landing.png" 
              alt="Chaavani Background" 
              fill 
              className="object-cover object-center absolute inset-0 -z-10 opacity-70" 
              style={{borderRadius: '16px', objectFit: 'cover', objectPosition: 'center'}}
              priority
            />
            <div className="text-center relative z-10">
              <div className="mb-6">
              </div>
              <h2 
                className="text-2xl text-yellow-200 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                CHAAVANI
              </h2>
              {isMounted && isConnected ? (
                <Link href="/chaavani">
                  <button 
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px !important'
                    }}
                  >
                    ENTER FORGE
                  </button>
                </Link>
              ) : (
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide opacity-50 cursor-not-allowed"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px !important'
                  }}
                  disabled
                >
                  WALLET REQUIRED
                </button>
              )}
            </div>
          </div>

          {/* Gurukul - The Academy */}
          <div 
            className="arcade-card p-8 group cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[400px]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #2d5a27 !important',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2)',
              borderRadius: '16px !important',
              borderImage: 'none !important',
              padding: '2rem',
            }}
          >
            <Image 
              src="/Gurukul_landing.png" 
              alt="Gurukul Background" 
              fill 
              className="object-cover object-center absolute inset-0 -z-10 opacity-70" 
              style={{borderRadius: '16px', objectFit: 'cover', objectPosition: 'center'}}
              priority
            />
            <div className="text-center relative z-10">
              <div className="mb-6">
              </div>
              <h2 
                className="text-2xl text-black-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                GURUKUL
              </h2>
              {isMounted && isConnected ? (
                <Link href="/gurukul">
                  <button 
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px !important'
                    }}
                  >
                    ENTER ACADEMY
                  </button>
                </Link>
              ) : (
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide opacity-50 cursor-not-allowed"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px !important'
                  }}
                  disabled
                >
                  WALLET REQUIRED
                </button>
              )}
            </div>
          </div>

          {/* Bazaar - The Market */}
          <div 
            className="arcade-card p-8 group cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[400px]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #2d5a27 !important',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2)',
              borderRadius: '16px !important',
              borderImage: 'none !important',
              padding: '2rem',
            }}
          >
            <Image 
              src="/Bazaar_landing2.png" 
              alt="Bazaar Background" 
              fill 
              className="object-cover object-center absolute inset-0 -z-10 opacity-70" 
              style={{borderRadius: '16px', objectFit: 'cover', objectPosition: 'center'}}
              priority
            />
            <div className="text-center relative z-10">
              <div className="mb-6">
              </div>
              <h2 
                className="text-2xl text-white mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                BAZAAR
              </h2>
              {isMounted && isConnected ? (
                <Link href="/bazaar">
                  <button 
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px !important'
                    }}
                  >
                    ENTER MARKET
                  </button>
                </Link>
              ) : (
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide opacity-50 cursor-not-allowed"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px !important'
                  }}
                  disabled
                >
                  WALLET REQUIRED
                </button>
              )}
            </div>
          </div>

          {/* Kurukshetra - The Arena */}
          <div 
            className="arcade-card p-8 group cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[400px]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #2d5a27 !important',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2)',
              borderRadius: '16px !important',
              borderImage: 'none !important',
              padding: '2rem',
            }}
          >
            <Image 
              src="/Kurukshetra_landing.png" 
              alt="Kurukshetra Background" 
              fill 
              className="object-cover object-center absolute inset-0 -z-10 opacity-70" 
              style={{borderRadius: '16px', objectFit: 'cover', objectPosition: 'center'}}
              priority
            />
            <div className="text-center relative z-10">
              <h2 
                className="text-2xl text-white mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                KURUKSHETRA
              </h2>
              {isMounted && isConnected ? (
                <a href="/kurukshetra">
                  <button 
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px !important'
                    }}
                  >
                    ENTER ARENA
                  </button>
                </a>
              ) : (
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide opacity-50 cursor-not-allowed"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px !important'
                  }}
                  disabled
                >
                  WALLET REQUIRED
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Token Exchange Section */}
        {isMounted && isConnected && (
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 
                className="text-3xl text-red-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                TOKEN EXCHANGE
              </h2>
              <p 
                className="text-yellow-300 text-sm"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                CONVERT ETH TO RANN TOKENS FOR BATTLE
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mint RANN Tokens */}
              <TokenExchangeCard 
                title="MINT RANN"
                description="CONVERT ETH TO RANN"
                icon="⚡"
                fromToken="ETH"
                toToken="RANN"
                rate="1:1"
                type="mint"
              />

              {/* Burn RANN Tokens */}
              <TokenExchangeCard 
                title="BURN RANN"
                description="CONVERT RANN TO ETH"
                icon="🔥"
                fromToken="RANN"
                toToken="ETH"
                rate="1:1"
                type="burn"
              />
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        {isMounted && isConnected && (
          <div className="mt-20 max-w-4xl mx-auto">
            <div 
              className="arcade-card p-8 group cursor-pointer home-leaderboard-card"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%) !important',
                border: '3px solid #2d5a27 !important',
                backdropFilter: 'blur(20px) !important',
                WebkitBackdropFilter: 'blur(20px) !important',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(45, 90, 39, 0.2) !important',
                borderRadius: '16px !important',
                borderImage: 'none !important'
              }}
            >
              <Link href="/leaderboard">
                <div className="text-center">
                  <div className="mb-6">
                    <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center relative">
                      <span className="text-3xl filter drop-shadow-lg">🏆</span>
                      <div className="absolute inset-0 rounded-full border-2 border-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                    </div>
                  </div>
                  <h2 
                    className="text-2xl text-yellow-400 mb-4 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    LEADERBOARD
                  </h2>
                  <div className="border-t-2 border-yellow-400 pt-4 mb-6">
                    <p 
                      className="text-yellow-200 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      WITNESS THE GREATEST WARRIORS
                    </p>
                    <p 
                      className="text-yellow-500 text-xs mt-2"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      IN THE HALL OF LEGENDS
                    </p>
                  </div>
                  <button 
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px !important'
                    }}
                  >
                    VIEW LEADERBOARD
                  </button>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Epic Call to Action
        <div className="text-center mt-20">
          <div className="battle-frame p-8 mx-auto max-w-3xl">
            <p 
              className="text-yellow-400 text-lg mb-4 arcade-glow"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              CHOOSE YOUR DESTINY
            </p>
            <p 
              className="text-gray-300 text-sm"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              THE BATTLEFIELD AWAITS YOUR COURAGE
            </p>
          </div>
        </div> */}
      </div>
    </div>
  );
}