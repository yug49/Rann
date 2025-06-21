import { ConnectButton } from "@rainbow-me/rainbowkit"
import { FaGithub } from "react-icons/fa"
import Image from "next/image"

const Header: React.FC = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-100">
      <div className="flex items-center gap-4">
        <a 
          href="https://github.com/yug49/ts-tsender-ui" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-600 hover:text-black hover:cursor-pointer "
        >
          <FaGithub size={24} />
        </a>
        <h1 className="text-xl font-bold text-gray-600">Rann</h1>
        <h5 className="text-sm text-gray-400 font-semibold">"The ultimate Rannbhoomi"</h5>
      </div>
      <div>
        <ConnectButton />
      </div>
    </header>
  )
}

export default Header