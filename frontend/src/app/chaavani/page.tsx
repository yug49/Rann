"use client";

import { useState } from 'react';

export default function ChaavaniPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    life_history: '',
    adjectives: '',
    knowledge_areas: '',
    image: null as File | null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generatePersonality = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setFormData({
        name: 'Arjuna the Strategist',
        bio: 'A legendary warrior with unmatched archery skills and strategic mind',
        life_history: 'Born in the ancient kingdom of Hastinapura, trained by the greatest masters of warfare',
        adjectives: 'Visionary, Ambitious, Perfectionistic, Risk-taking, Intellectually curious',
        knowledge_areas: 'Military strategy, Archery mastery, Divine weapons, Leadership, Ancient wisdom',
        image: formData.image
      });
      setIsGenerating(false);
    }, 2000);
  };

  const isFormComplete = formData.name && formData.bio && formData.life_history && 
                        formData.adjectives && formData.knowledge_areas && formData.image;

  return (
    <div className="min-h-screen battlefield-bg">
      <div className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-6xl text-yellow-400 mb-6 tracking-widest arcade-glow"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            CHAAVANI
          </h1>
          <div className="arcade-border p-4 mx-auto max-w-3xl">
            <p 
              className="text-yellow-300 text-sm md:text-base tracking-wide"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              FORGE YOUR LEGENDARY YODHA WARRIOR
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="battle-frame p-2 flex gap-2">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeTab === 'ai' 
                  ? 'arcade-button' 
                  : 'bg-gray-800 border-2 border-gray-600 text-gray-400 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              BUILD WITH AI
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeTab === 'manual' 
                  ? 'arcade-button' 
                  : 'bg-gray-800 border-2 border-gray-600 text-gray-400 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              BUILD MANUALLY
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Panel - AI/Manual Input */}
            <div className="arcade-card p-8">
              {activeTab === 'ai' ? (
                // AI Section
                <div>
                  <div className="mb-6">
                    <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h2 
                      className="text-2xl text-yellow-400 text-center mb-4 tracking-wider arcade-glow"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      AI FORGE
                    </h2>
                    <p 
                      className="text-gray-300 text-xs text-center leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      DESCRIBE YOUR IDEAL WARRIOR
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label 
                        className="block text-yellow-400 text-xs mb-2 tracking-wide"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        CHARACTER PROMPT
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the type of warrior you want to create..."
                        className="w-full h-32 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      />
                    </div>

                    <button
                      onClick={generatePersonality}
                      disabled={!aiPrompt.trim() || isGenerating}
                      className={`w-full arcade-button py-4 text-xs tracking-wide ${
                        (!aiPrompt.trim() || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      {isGenerating ? 'FORGING WARRIOR...' : 'GENERATE PERSONALITY'}
                    </button>
                  </div>
                </div>
              ) : (
                // Manual Section
                <div>
                  <div className="mb-6">
                    <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">⚒️</span>
                    </div>
                    <h2 
                      className="text-2xl text-blue-400 text-center mb-4 tracking-wider arcade-glow"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      MANUAL FORGE
                    </h2>
                    <p 
                      className="text-gray-300 text-xs text-center leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      CRAFT EVERY DETAIL BY HAND
                    </p>
                  </div>

                  <div className="text-center">
                    <p 
                      className="text-gray-400 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      USE THE FORM ON THE RIGHT TO MANUALLY DEFINE YOUR WARRIOR'S ATTRIBUTES
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Form */}
            <div className="arcade-card p-8">
              <div className="mb-6">
                <h3 
                  className="text-xl text-orange-400 text-center mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  WARRIOR ATTRIBUTES
                </h3>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    NAME
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter warrior name..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    BIO
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Brief description of the warrior..."
                    className="w-full h-20 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Life History */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    LIFE HISTORY
                  </label>
                  <textarea
                    value={formData.life_history}
                    onChange={(e) => handleInputChange('life_history', e.target.value)}
                    placeholder="Warrior's background and history..."
                    className="w-full h-24 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Adjectives */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    PERSONALITY TRAITS
                  </label>
                  <input
                    type="text"
                    value={formData.adjectives}
                    onChange={(e) => handleInputChange('adjectives', e.target.value)}
                    placeholder="Visionary, Ambitious, Perfectionistic..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Knowledge Areas */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    KNOWLEDGE AREAS
                  </label>
                  <input
                    type="text"
                    value={formData.knowledge_areas}
                    onChange={(e) => handleInputChange('knowledge_areas', e.target.value)}
                    placeholder="Military strategy, Divine weapons..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    WARRIOR IMAGE
                  </label>
                  <div className="border-2 border-dashed border-gray-600 p-4 text-center hover:border-yellow-600 transition-colors relative">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-20 h-20 mx-auto rounded-lg object-cover border-2 border-yellow-600"
                        />
                        <p 
                          className="text-green-400 text-xs"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          IMAGE UPLOADED
                        </p>
                        <button
                          onClick={() => {setImagePreview(null); setFormData(prev => ({...prev, image: null}))}}
                          className="text-red-400 text-xs hover:text-red-300 transition-colors"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          REMOVE IMAGE
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 cursor-pointer">
                        <div className="text-2xl">📷</div>
                        <p 
                          className="text-gray-400 text-xs"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          CLICK TO UPLOAD IMAGE
                        </p>
                      </div>
                    )}
                    {!imagePreview && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                {/* Mint Button */}
                <div className="pt-4">
                  <button
                    disabled={!isFormComplete}
                    className={`w-full arcade-button py-4 text-xs tracking-wide ${
                      !isFormComplete ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {!isFormComplete ? 'COMPLETE ALL FIELDS' : 'MINT YODHA NFT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a 
            href="/"
            className="inline-block bg-gray-800 border-2 border-gray-600 text-gray-400 px-6 py-3 text-xs tracking-wide hover:border-yellow-600 hover:text-yellow-400 transition-all duration-300"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            BACK TO ARENA
          </a>
        </div>
      </div>
    </div>
  );
}
