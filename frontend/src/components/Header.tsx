import { ConnectButton } from "@rainbow-me/rainbowkit"
import { FaGithub } from "react-icons/fa"

const Header: React.FC = () => {
  return (
    <header className="arcade-header">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <a 
              href="https://github.com/yug49/ts-tsender-ui" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors hover:scale-110 transform"
            >
              <FaGithub size={24} />
            </a>
            <div className="flex items-center gap-6">
              <h1 className="text-2xl text-yellow-400 tracking-widest arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                RANN
              </h1>
              <div className="hidden md:block border-l-2 border-yellow-600 pl-6">
                <h5 className="text-xs text-yellow-300 tracking-wide" style={{fontFamily: 'Press Start 2P, monospace'}}>
                  LEGENDARY ARENA AWAITS
                </h5>
              </div>
            </div>
          </div>
          <div className="connect-button-wrapper">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header