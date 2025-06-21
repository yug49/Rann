export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Welcome to Rann</h1>
          <p className="text-xl mb-8">Your Web3 Gaming Platform</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-semibold mb-3">Gurukul</h2>
              <p className="text-gray-300 mb-4">Learn and grow your skills in the academy</p>
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                Enter Gurukul
              </button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-semibold mb-3">Kurukshetra</h2>
              <p className="text-gray-300 mb-4">Battle arena for epic competitions</p>
              <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
                Enter Arena
              </button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-semibold mb-3">Bazaar</h2>
              <p className="text-gray-300 mb-4">Trade and exchange your assets</p>
              <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
                Visit Bazaar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}