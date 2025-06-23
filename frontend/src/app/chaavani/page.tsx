"use client";

import { useState } from 'react';
import Image from 'next/image';
import '../home-glass.css';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface UserYodha {
  id: number;
  tokenId: number;
  name: string;
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  traits: YodhaTraits;
  image: string;
  rank: 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';
  totalWinnings: number;
}

export default function ChaavaniPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
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
  const [selectedYodha, setSelectedYodha] = useState<UserYodha | null>(null);
  const [activeSection, setActiveSection] = useState<'create' | 'manage' | 'ai'>('create');

  // Mock data for user's Yodhas
  const userYodhas: UserYodha[] = [
    {
      id: 1,
      tokenId: 101,
      name: "Arjuna the Strategist",
      bio: "A legendary warrior with unmatched archery skills and strategic mind",
      life_history: "Born in the ancient kingdom of Hastinapura, trained by the greatest masters of warfare and divine knowledge",
      adjectives: "Visionary, Ambitious, Perfectionistic, Risk-taking, Intellectually curious",
      knowledge_areas: "Military strategy, Archery mastery, Divine weapons, Leadership, Ancient wisdom",
      traits: { strength: 85.67, wit: 92.34, charisma: 78.12, defence: 88.45, luck: 76.89 },
      image: "/lazered.png",
      rank: 'gold',
      totalWinnings: 15.7
    },
    {
      id: 2,
      tokenId: 102,
      name: "Bhima the Destroyer",
      bio: "A mighty warrior with incredible physical strength and fierce determination",
      life_history: "Second of the Pandava brothers, known for his immense strength and loyalty to his family",
      adjectives: "Powerful, Determined, Loyal, Aggressive, Protective",
      knowledge_areas: "Physical combat, Mace warfare, Endurance training, Battle tactics, Brotherhood",
      traits: { strength: 98.23, wit: 65.78, charisma: 82.45, defence: 94.12, luck: 71.56 },
      image: "/lazered.png",
      rank: 'silver',
      totalWinnings: 8.5
    },
    {
      id: 3,
      tokenId: 103,
      name: "Nakula the Swift",
      bio: "A skilled swordsman known for his speed and expertise with horses",
      life_history: "Twin brother of Sahadeva, master of sword fighting and horse management",
      adjectives: "Swift, Elegant, Skilled, Graceful, Knowledgeable",
      knowledge_areas: "Swordsmanship, Horse training, Speed combat, Veterinary science, Twin coordination",
      traits: { strength: 78.91, wit: 84.33, charisma: 89.67, defence: 81.24, luck: 87.45 },
      image: "/lazered.png",
      rank: 'bronze',
      totalWinnings: 2.1
    }
  ];

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

  const getPromotionRequirement = (rank: string): number => {
    switch (rank) {
      case 'unranked': return 1; // 1 ETH for Bronze
      case 'bronze': return 3; // 3 ETH total for Silver (1 + 2)
      case 'silver': return 6; // 6 ETH total for Gold (1 + 2 + 3)
      case 'gold': return 10; // 10 ETH total for Platinum (1 + 2 + 3 + 4)
      default: return 0;
    }
  };

  const canPromote = (yodha: UserYodha): boolean => {
    if (yodha.rank === 'platinum') return false;
    const requirement = getPromotionRequirement(yodha.rank);
    return yodha.totalWinnings >= requirement;
  };

  const getNextRank = (currentRank: string): string => {
    switch (currentRank) {
      case 'unranked': return 'bronze';
      case 'bronze': return 'silver';
      case 'silver': return 'gold';
      case 'gold': return 'platinum';
      default: return currentRank;
    }
  };

  const handlePromoteYodha = async (yodha: UserYodha) => {
    // TODO: Implement actual promotion logic with smart contract
    console.log(`Promoting ${yodha.name} from ${yodha.rank} to ${getNextRank(yodha.rank)}`);
    setSelectedYodha(null);
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'unranked': return 'text-gray-500';
      case 'bronze': return 'text-orange-600';
      case 'silver': return 'text-gray-300';
      case 'gold': return 'text-yellow-400';
      case 'platinum': return 'text-blue-300';
      default: return 'text-gray-500';
    }
  };

  const getRankBgColor = (rank: string) => {
    switch (rank) {
      case 'unranked': return 'bg-gray-700';
      case 'bronze': return 'bg-orange-900';
      case 'silver': return 'bg-gray-600';
      case 'gold': return 'bg-yellow-900';
      case 'platinum': return 'bg-blue-900';
      default: return 'bg-gray-700';
    }
  };

  const TraitBar = ({ label, value }: { label: string; value: number }) => (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span 
          className="text-xs text-orange-400"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {label}
        </span>
        <span 
          className="text-xs text-orange-300"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {value.toFixed(1)}
        </span>
      </div>
      <div className="w-full bg-gray-800 h-2 border border-orange-600">
        <div 
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );

  const YodhaCard = ({ yodha, onClick }: { yodha: UserYodha; onClick: () => void }) => (
    <div 
      className="arcade-card p-6 cursor-pointer transform hover:scale-105 transition-all duration-300"
      onClick={onClick}
      style={{
        background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
        border: '3px solid #ff8c00',
        borderRadius: '24px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
      }}
    >
      <div className="w-full h-64 mb-4 border-2 border-orange-600 rounded-2xl overflow-hidden relative">
        <Image 
          src={yodha.image} 
          alt={yodha.name}
          width={300}
          height={256}
          className="w-full h-full object-cover"
        />
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-xl text-xs ${getRankBgColor(yodha.rank)} ${getRankColor(yodha.rank)} border border-current`}>
          <span style={{fontFamily: 'Press Start 2P, monospace'}}>
            {yodha.rank.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 
          className="text-lg text-orange-400 mb-4 arcade-glow"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {yodha.name}
        </h3>
      </div>

      <div className="space-y-2 mb-4">
        <TraitBar label="STR" value={yodha.traits.strength} />
        <TraitBar label="WIT" value={yodha.traits.wit} />
        <TraitBar label="CHA" value={yodha.traits.charisma} />
        <TraitBar label="DEF" value={yodha.traits.defence} />
        <TraitBar label="LCK" value={yodha.traits.luck} />
      </div>

      <div className="border-t border-orange-600 pt-4">
        <div className="flex justify-between items-center">
          <span 
            className="text-sm text-green-400"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            {yodha.totalWinnings} RANN
          </span>
          <span 
            className="text-xs text-gray-400"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            #{yodha.tokenId}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Chaavani.png"
          alt="Chaavani Background"
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
        {/* Floating Weapon Elements */}
        <div className="absolute top-20 left-10 text-4xl floating-element pulse-element opacity-20">⚒️</div>
        <div className="absolute top-40 right-20 text-3xl floating-element pulse-element opacity-20" style={{animationDelay: '1s'}}>🔥</div>
        <div className="absolute bottom-32 left-20 text-3xl floating-element pulse-element opacity-20" style={{animationDelay: '2s'}}>🗡️</div>
        <div className="absolute bottom-20 right-32 text-4xl floating-element pulse-element opacity-20" style={{animationDelay: '0.5s'}}>⚡</div>
        
        {/* Geometric Battle Lines */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-30"></div>
        <div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-6xl text-orange-400 mb-6 tracking-widest arcade-glow"
            style={{
              fontFamily: 'Press Start 2P, monospace'
            }}
          >
            CHAAVANI
          </h1>
          <div 
            className="arcade-border p-4 mx-auto max-w-3xl"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '2px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            }}
          >
            <p 
              className="text-orange-400 text-sm md:text-base tracking-wide arcade-glow"
              style={{
                fontFamily: 'Press Start 2P, monospace'
              }}
            >
              FORGE YOUR LEGENDARY YODHA WARRIOR
            </p>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex justify-center mb-8">
          <div 
            className="p-2 flex gap-2"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '20px'
            }}
          >
            <button
              onClick={() => setActiveSection('create')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeSection === 'create' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeSection === 'create' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              CREATE YODHA
            </button>
            <button
              onClick={() => setActiveSection('manage')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeSection === 'manage' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeSection === 'manage' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              MANAGE YODHAS
            </button>
          </div>
        </div>

        {activeSection === 'create' && (
          <>
            {/* AI Toggle Switch */}
            <div className="flex justify-center mb-12">
              <div 
                className="p-4 flex items-center gap-4"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                  borderRadius: '20px'
                }}
              >
                <span 
                  className="text-orange-400 text-sm tracking-wide arcade-glow"
                  style={{
                    fontFamily: 'Press Start 2P, monospace'
                  }}
                >
                  AI ASSISTANCE
                </span>
                <button
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`relative inline-flex items-center w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                    aiEnabled 
                      ? 'bg-yellow-600' 
                      : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ${
                      aiEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span 
                  className={`text-sm tracking-wide ${aiEnabled ? 'text-orange-400 arcade-glow' : 'text-gray-400'}`}
                  style={{
                    fontFamily: 'Press Start 2P, monospace'
                  }}
                >
                  {aiEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Panel - AI Input (conditional) */}
            <div 
              className="arcade-card p-8"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              {aiEnabled ? (
                // AI Section
                <div>
                  <div className="mb-6">
                    <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h2 
                      className="text-2xl text-orange-400 text-center mb-4 tracking-wider arcade-glow"
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
                        className="w-full h-32 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      />
                    </div>

                    <button
                      onClick={generatePersonality}
                      disabled={!aiPrompt.trim() || isGenerating}
                      className={`w-full arcade-button py-4 text-xs tracking-wide ${
                        (!aiPrompt.trim() || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      {isGenerating ? 'FORGING WARRIOR...' : 'GENERATE PERSONALITY'}
                    </button>
                  </div>
                </div>
              ) : (
                // AI Disabled - Instructions
                <div className="text-center py-12">
                  <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6">
                    <span className="text-2xl">⚒️</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-6 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    MANUAL FORGE MODE
                  </h2>
                  <p 
                    className="text-gray-300 text-xs leading-relaxed mb-4"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CRAFT YOUR WARRIOR MANUALLY
                  </p>
                  <p 
                    className="text-gray-400 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    USE THE FORM TO DEFINE ALL ATTRIBUTES
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel - Form */}
            <div 
              className="arcade-card p-8"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
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
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
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
                    className="w-full h-20 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
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
                    className="w-full h-24 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
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
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
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
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
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
                  <div className="border-2 border-dashed border-gray-600 p-4 text-center hover:border-yellow-600 transition-colors relative rounded-2xl">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-20 h-20 mx-auto rounded-2xl object-cover border-2 border-yellow-600"
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
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    {!isFormComplete ? 'COMPLETE ALL FIELDS' : 'MINT YODHA NFT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeSection === 'manage' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 
                className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                YOUR YODHA WARRIORS
              </h2>
              <p 
                className="text-gray-300 text-sm"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                MANAGE AND PROMOTE YOUR LEGENDARY FIGHTERS
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userYodhas.length > 0 ? (
                userYodhas.map((yodha) => (
                  <YodhaCard 
                    key={yodha.id} 
                    yodha={yodha} 
                    onClick={() => setSelectedYodha(yodha)} 
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p 
                    className="text-gray-400 text-sm"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    NO YODHAS FOUND. CREATE YOUR FIRST WARRIOR!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Yodha Detail Modal */}
        {selectedYodha && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div 
              className="arcade-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 
                  className="text-2xl text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  {selectedYodha.name}
                </h2>
                <button 
                  onClick={() => setSelectedYodha(null)}
                  className="text-red-400 hover:text-red-300 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="w-48 h-48 mx-auto mb-6 border-2 border-orange-600 rounded-2xl overflow-hidden">
                    <Image 
                      src={selectedYodha.image} 
                      alt={selectedYodha.name}
                      width={192}
                      height={192}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        BIO
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.bio}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        LIFE HISTORY
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.life_history}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        PERSONALITY TRAITS
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.adjectives}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        KNOWLEDGE AREAS
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.knowledge_areas}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 
                    className="text-lg text-orange-400 mb-6 text-center"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    WARRIOR TRAITS
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    <TraitBar label="STRENGTH" value={selectedYodha.traits.strength} />
                    <TraitBar label="WIT" value={selectedYodha.traits.wit} />
                    <TraitBar label="CHARISMA" value={selectedYodha.traits.charisma} />
                    <TraitBar label="DEFENCE" value={selectedYodha.traits.defence} />
                    <TraitBar label="LUCK" value={selectedYodha.traits.luck} />
                  </div>

                  <div className="border-t border-orange-600 pt-6">
                    <div className="text-center mb-6">
                      <div className="flex justify-center items-center gap-4 mb-4">
                        <div className={`px-3 py-1 rounded-xl ${getRankBgColor(selectedYodha.rank)} ${getRankColor(selectedYodha.rank)} border border-current`}>
                          <span 
                            className="text-xs"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            RANK: {selectedYodha.rank.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p 
                        className="text-sm text-green-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        TOTAL WINNINGS: {selectedYodha.totalWinnings} RANN
                      </p>
                      
                      <p 
                        className="text-xs text-gray-400 mb-4"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        TOKEN ID: #{selectedYodha.tokenId}
                      </p>

                      {selectedYodha.rank !== 'platinum' && (
                        <p 
                          className="text-xs text-yellow-400 mb-4"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          NEXT RANK: {getNextRank(selectedYodha.rank).toUpperCase()} 
                          (REQUIRES {getPromotionRequirement(selectedYodha.rank)} RANN)
                        </p>
                      )}
                    </div>

                    {selectedYodha.rank !== 'platinum' ? (
                      <button
                        onClick={() => handlePromoteYodha(selectedYodha)}
                        disabled={!canPromote(selectedYodha)}
                        className={`w-full py-4 text-sm tracking-wide transition-colors ${
                          canPromote(selectedYodha)
                            ? 'arcade-button'
                            : 'bg-gray-800 border-2 border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
                        }`}
                        style={{
                          fontFamily: 'Press Start 2P, monospace',
                          borderRadius: '12px'
                        }}
                      >
                        {canPromote(selectedYodha) ? 'PROMOTE WARRIOR' : 'INSUFFICIENT WINNINGS'}
                      </button>
                    ) : (
                      <div className="text-center">
                        <p 
                          className="text-blue-300 text-sm py-4"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          MAXIMUM RANK ACHIEVED!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="max-w-4xl mx-auto">
            <div 
              className="arcade-card p-8"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              <div className="text-center mb-8">
                <h2 
                  className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  AI FORGE ASSISTANT
                </h2>
                <p 
                  className="text-purple-200 text-sm"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  GET STRATEGIC ADVICE FOR YOUR WARRIORS
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label 
                    className="block text-purple-300 text-xs mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    ASK THE AI FORGE MASTER:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="What attributes should I prioritize for my next Yodha? How can I optimize my current warriors?"
                    className="w-full p-4 bg-black/50 border-2 border-purple-600 text-purple-100 text-sm rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                    rows={4}
                  />
                </div>

                <button
                  onClick={() => console.log('AI assistance requested:', aiPrompt)}
                  className="w-full arcade-button py-4 text-sm tracking-wide"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  CONSULT FORGE MASTER
                </button>

                <div 
                  className="p-4 border-2 border-purple-600 rounded-2xl"
                  style={{
                    background: 'rgba(128, 0, 128, 0.1)'
                  }}
                >
                  <h3 
                    className="text-purple-300 text-xs mb-3"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    FORGE MASTER'S WISDOM:
                  </h3>
                  <p 
                    className="text-purple-200 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {aiPrompt ? 
                      "The AI Forge Master will provide strategic guidance on warrior creation, attribute optimization, and battle preparation strategies. Ask specific questions about your Yodha development!" :
                      "Enter your question above to receive ancient wisdom from the AI Forge Master..."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a 
            href="/"
            className="inline-block arcade-button px-6 py-3 text-xs tracking-wide"
            style={{
              fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px'
            }}
          >
            GO BACK
          </a>
        </div>
      </div>
    </div>
  );
}
