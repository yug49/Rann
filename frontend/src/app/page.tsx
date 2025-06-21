import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen battlefield-bg relative overflow-hidden">
      {/* Epic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating Weapon Elements */}
        <div className="absolute top-20 left-10 text-4xl floating-element pulse-element opacity-20">⚔️</div>
        <div className="absolute top-40 right-20 text-3xl floating-element pulse-element opacity-20" style={{animationDelay: '1s'}}>🛡️</div>
        <div className="absolute bottom-32 left-20 text-3xl floating-element pulse-element opacity-20" style={{animationDelay: '2s'}}>🏺</div>
        <div className="absolute bottom-20 right-32 text-4xl floating-element pulse-element opacity-20" style={{animationDelay: '0.5s'}}>⚡</div>
        
        {/* Geometric Battle Lines */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-30"></div>
        <div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-16">
        {/* Epic Title Section */}
        <div className="text-center mb-20">
          <h1 
            className="text-6xl md:text-8xl text-yellow-400 mb-8 tracking-widest arcade-glow"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            RANN
          </h1>
          <div className="arcade-border p-6 mx-auto max-w-4xl">
            <p 
              className="text-yellow-300 text-lg md:text-xl tracking-wide metal-text"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              ENTER THE ULTIMATE BATTLEGROUND
            </p>
            <p 
              className="text-red-400 text-sm mt-4 arcade-glow"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              WHERE LEGENDS ARE FORGED IN COMBAT
            </p>
          </div>
        </div>

        {/* Epic Game Mode Arena */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
          
          {/* Chaavani - The Forge */}
          <div className="arcade-card p-8 group">
            <div className="text-center">
              <div className="mb-6">
                <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center relative">
                  <span className="text-3xl filter drop-shadow-lg">⚒️</span>
                  <div className="absolute inset-0 rounded-full border-2 border-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                </div>
              </div>
              <h2 
                className="text-2xl text-yellow-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                CHAAVANI
              </h2>
              <div className="border-t-2 border-yellow-600 pt-4 mb-6">
                <p 
                  className="text-yellow-200 text-xs leading-relaxed"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  FORGE YOUR LEGENDARY WARRIORS
                </p>
                <p 
                  className="text-yellow-500 text-xs mt-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  IN THE ANCIENT SMITHY
                </p>
              </div>
              <Link href="/chaavani">
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  ENTER FORGE
                </button>
              </Link>
            </div>
          </div>

          {/* Gurukul - The Academy */}
          <div className="arcade-card p-8 group">
            <div className="text-center">
              <div className="mb-6">
                <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center relative">
                  <span className="text-3xl filter drop-shadow-lg">🏛️</span>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                </div>
              </div>
              <h2 
                className="text-2xl text-blue-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                GURUKUL
              </h2>
              <div className="border-t-2 border-blue-400 pt-4 mb-6">
                <p 
                  className="text-blue-200 text-xs leading-relaxed"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  MASTER ANCIENT COMBAT ARTS
                </p>
                <p 
                  className="text-blue-500 text-xs mt-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  IN THE HALLS OF WISDOM
                </p>
              </div>
              <Link href="/gurukul">
                <button 
                  className="arcade-button px-8 py-4 text-xs tracking-wide"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  ENTER ACADEMY
                </button>
              </Link>
            </div>
          </div>

          {/* Bazaar - The Market */}
          <div className="arcade-card p-8 group cursor-pointer">
            <div className="text-center">
              <div className="mb-6">
                <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center relative">
                  <span className="text-3xl filter drop-shadow-lg">🏪</span>
                  <div className="absolute inset-0 rounded-full border-2 border-orange-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                </div>
              </div>
              <h2 
                className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                BAZAAR
              </h2>
              <div className="border-t-2 border-orange-400 pt-4 mb-6">
                <p 
                  className="text-orange-200 text-xs leading-relaxed"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  TRADE EPIC WARRIORS & GEAR
                </p>
                <p 
                  className="text-orange-500 text-xs mt-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  IN THE MERCHANT DISTRICT
                </p>
              </div>
              <button 
                className="arcade-button px-8 py-4 text-xs tracking-wide"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                ENTER MARKET
              </button>
            </div>
          </div>

          {/* Kurukshetra - The Arena */}
          <div className="arcade-card p-8 group cursor-pointer">
            <div className="text-center">
              <div className="mb-6">
                <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center relative">
                  <span className="text-3xl filter drop-shadow-lg">⚔️</span>
                  <div className="absolute inset-0 rounded-full border-2 border-red-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                </div>
              </div>
              <h2 
                className="text-2xl text-red-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                KURUKSHETRA
              </h2>
              <div className="border-t-2 border-red-400 pt-4 mb-6">
                <p 
                  className="text-red-200 text-xs leading-relaxed"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  PROVE YOUR WORTH IN BATTLE
                </p>
                <p 
                  className="text-red-500 text-xs mt-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  ON THE LEGENDARY BATTLEFIELD
                </p>
              </div>
              <button 
                className="arcade-button px-8 py-4 text-xs tracking-wide"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                ENTER ARENA
              </button>
            </div>
          </div>

        </div>

        {/* Epic Call to Action */}
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
        </div>
      </div>
    </div>
  );
}