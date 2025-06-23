"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import '../home-glass.css';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface MCQOption {
  id: number;
  text: string;
}

interface MCQuestion {
  id: number;
  question: string;
  options: MCQOption[];
  correctAnswer: number;
}

interface YodhaNFT {
  id: number;
  name: string;
  traits: YodhaTraits;
  image: string;
}

export default function GurukulPage() {
  const [isApproved, setIsApproved] = useState(false);
  const [hasEnteredGurukul, setHasEnteredGurukul] = useState(false);
  const [selectedYodha, setSelectedYodha] = useState<YodhaNFT | null>(null);
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [updatedTraits, setUpdatedTraits] = useState<YodhaTraits | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Mock data - replace with actual contract calls
  const mockYodha: YodhaNFT = {
    id: 1,
    name: "Arjuna the Strategist",
    image: "/lazered.png",
    traits: {
      strength: 65.23,
      wit: 78.45,
      charisma: 55.67,
      defence: 72.89,
      luck: 60.12
    }
  };

  const mockQuestions: MCQuestion[] = [
    {
      id: 1,
      question: "What is the most important quality of a great warrior?",
      options: [
        { id: 1, text: "Physical strength alone" },
        { id: 2, text: "Strategic thinking and wisdom" },
        { id: 3, text: "Fear of enemies" }
      ],
      correctAnswer: 2
    },
    {
      id: 2,
      question: "In battle, when facing overwhelming odds, what should a Yodha do?",
      options: [
        { id: 1, text: "Retreat immediately" },
        { id: 2, text: "Charge blindly" },
        { id: 3, text: "Assess the situation and adapt strategy" },
        { id: 4, text: "Surrender without fighting" }
      ],
      correctAnswer: 3
    },
    {
      id: 3,
      question: "What drives a true Yodha's actions?",
      options: [
        { id: 1, text: "Personal glory and fame" },
        { id: 2, text: "Dharma and righteousness" }
      ],
      correctAnswer: 2
    },
    {
      id: 4,
      question: "How should a Yodha treat their weapons?",
      options: [
        { id: 1, text: "As mere tools" },
        { id: 2, text: "With respect and reverence" },
        { id: 3, text: "As symbols of power" },
        { id: 4, text: "With casual indifference" },
        { id: 5, text: "As extensions of oneself" }
      ],
      correctAnswer: 5
    },
    {
      id: 5,
      question: "What is the greatest victory for a Yodha?",
      options: [
        { id: 1, text: "Defeating all enemies" },
        { id: 2, text: "Conquering oneself" },
        { id: 3, text: "Accumulating wealth" }
      ],
      correctAnswer: 2
    }
  ];

  // Initialize with mock data for testing
  useEffect(() => {
    setSelectedYodha(mockYodha);
    setQuestions(mockQuestions);
  }, []);

  const handleApproveNFT = async () => {
    setIsApproving(true);
    // Simulate approval process
    setTimeout(() => {
      setIsApproved(true);
      setIsApproving(false);
    }, 2000);
  };

  const handleEnterGurukul = () => {
    setHasEnteredGurukul(true);
    setSelectedYodha(mockYodha);
    setQuestions(mockQuestions);
  };

  const handleAnswerSelect = (questionId: number, optionId: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const areAllQuestionsAnswered = () => {
    return questions.length > 0 && questions.every(q => userAnswers[q.id] !== undefined);
  };

  const handleCompleteTraining = async () => {
    setIsSubmitting(true);
    
    // Simulate training completion and trait updates (can increase or decrease)
    setTimeout(() => {
      const changes = {
        strength: (Math.random() * 20) - 10, // -10 to +10 change
        wit: (Math.random() * 20) - 10,
        charisma: (Math.random() * 20) - 10,
        defence: (Math.random() * 20) - 10,
        luck: (Math.random() * 20) - 10
      };

      const newTraits: YodhaTraits = {
        strength: Math.max(0, Math.min(100, selectedYodha!.traits.strength + changes.strength)),
        wit: Math.max(0, Math.min(100, selectedYodha!.traits.wit + changes.wit)),
        charisma: Math.max(0, Math.min(100, selectedYodha!.traits.charisma + changes.charisma)),
        defence: Math.max(0, Math.min(100, selectedYodha!.traits.defence + changes.defence)),
        luck: Math.max(0, Math.min(100, selectedYodha!.traits.luck + changes.luck))
      };

      setUpdatedTraits(newTraits);
      setTrainingCompleted(true);
      setIsSubmitting(false);
    }, 3000);
  };

  const TraitBar = ({ 
    label, 
    value, 
    originalValue, 
    isUpdated = false 
  }: { 
    label: string; 
    value: number; 
    originalValue?: number;
    isUpdated?: boolean;
  }) => {
    const hasChanged = isUpdated && originalValue !== undefined;
    const isIncreased = hasChanged && value > originalValue;
    const isDecreased = hasChanged && value < originalValue;
    
    let barColor = 'bg-yellow-500'; // Default color
    let textColor = 'text-orange-400'; // Default text color
    
    if (isIncreased) {
      barColor = 'bg-green-500';
      textColor = 'text-orange-400';
    } else if (isDecreased) {
      barColor = 'bg-red-500';
      textColor = 'text-red-400';
    } else if (isUpdated) {
      textColor = 'text-orange-400'; // No change
    }

    return (
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span 
            className={`text-xs tracking-wide ${textColor}`}
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            {label}
          </span>
          <div className="flex items-center gap-2">
            <span 
              className={`text-xs ${textColor}`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {value.toFixed(2)}
            </span>
            {hasChanged && (
              <span 
                className={`text-xs ${isIncreased ? 'text-orange-400' : 'text-red-400'}`}
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                ({isIncreased ? '+' : ''}{(value - originalValue!).toFixed(2)})
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-800 border border-gray-600 h-4">
          <div 
            className={`h-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${value}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Gurukul.png"
          alt="Gurukul Background"
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
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-6xl text-orange-400 mb-6 tracking-widest arcade-glow"
            style={{
              fontFamily: 'Press Start 2P, monospace'
            }}
          >
            GURUKUL
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
              ANCIENT ACADEMY OF WARRIOR WISDOM
            </p>
          </div>
        </div>

        {!hasEnteredGurukul ? (
          // Approval and Entry Section
          <div className="max-w-2xl mx-auto">
            <div 
              className="arcade-card p-8 text-center"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
              }}
            >
              <div className="mb-8">
                <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">🏛️</span>
                </div>
                <h2 
                  className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  PREPARE FOR TRAINING
                </h2>
              </div>

              {!isApproved ? (
                <div className="space-y-6">
                  <p 
                    className="text-gray-300 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    FIRST, APPROVE YOUR YODHA NFT FOR TRAINING
                  </p>
                  <button
                    onClick={handleApproveNFT}
                    disabled={isApproving}
                    className={`arcade-button px-8 py-4 text-xs tracking-wide ${
                      isApproving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    {isApproving ? 'APPROVING NFT...' : 'APPROVE NFT'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-orange-900/20 border border-orange-600 p-4 rounded">
                    <p 
                      className="text-orange-400 text-xs leading-relaxed mb-2"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      ⚠️ WARNING ⚠️
                    </p>
                    <p 
                      className="text-orange-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      ONCE ENTERED, YOUR YODHA CANNOT EXIT WITHOUT COMPLETING THE TRAINING
                    </p>
                  </div>
                  <button
                    onClick={handleEnterGurukul}
                    className="arcade-button px-8 py-4 text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    ENTER GURUKUL
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : !trainingCompleted ? (
          // Training Section
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Yodha Info Panel */}
              <div 
                className="arcade-card p-6"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                }}
              >
                <h3 
                  className="text-xl text-orange-400 text-center mb-6 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  YOUR YODHA
                </h3>
                
                <div className="text-center mb-6">
                  <div className="w-52 h-52 mx-auto mb-4 border-2 border-orange-600 rounded-2xl overflow-hidden">
                    <Image 
                      src={selectedYodha?.image || "/lazered.png"} 
                      alt={selectedYodha?.name || "Yodha"}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 
                    className="text-lg text-orange-300 mb-4"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {selectedYodha?.name}
                  </h4>
                </div>

                <div className="space-y-4">
                  <h5 
                    className="text-sm text-orange-400 mb-4 text-center"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CURRENT TRAITS
                  </h5>
                  {selectedYodha && (
                    <>
                      <TraitBar label="STRENGTH" value={selectedYodha.traits.strength} />
                      <TraitBar label="WIT" value={selectedYodha.traits.wit} />
                      <TraitBar label="CHARISMA" value={selectedYodha.traits.charisma} />
                      <TraitBar label="DEFENCE" value={selectedYodha.traits.defence} />
                      <TraitBar label="LUCK" value={selectedYodha.traits.luck} />
                    </>
                  )}
                </div>
              </div>

              {/* Questions Panel */}
              <div 
                className="lg:col-span-2 arcade-card p-6"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                }}
              >
                <h3 
                  className="text-xl text-orange-400 text-center mb-6 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  WISDOM TRIALS
                </h3>

                <div className="space-y-8">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border-b border-gray-600 pb-6 last:border-b-0">
                      <h4 
                        className="text-sm text-orange-400 mb-4 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {index + 1}. {question.question}
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {question.options.map((option) => (
                          <label 
                            key={option.id}
                            className={`cursor-pointer p-3 border-2 transition-all duration-300 rounded-lg ${
                              userAnswers[question.id] === option.id
                                ? 'border-orange-400 bg-orange-900/20'
                                : 'border-gray-600 hover:border-orange-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option.id}
                              checked={userAnswers[question.id] === option.id}
                              onChange={() => handleAnswerSelect(question.id, option.id)}
                              className="sr-only"
                            />
                            <span 
                              className={`text-xs leading-relaxed ${
                                userAnswers[question.id] === option.id ? 'text-orange-300' : 'text-gray-300'
                              }`}
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              {String.fromCharCode(65 + option.id - 1)}. {option.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <button
                    onClick={handleCompleteTraining}
                    disabled={!areAllQuestionsAnswered() || isSubmitting}
                    className={`arcade-button px-8 py-4 text-xs tracking-wide ${
                      (!areAllQuestionsAnswered() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{fontFamily: 'Press Start 2P, monospace', borderRadius: '12px'}}
                  >
                    {isSubmitting ? 'COMPLETING TRAINING...' : 
                     !areAllQuestionsAnswered() ? 'ANSWER ALL QUESTIONS' : 
                     'SUBMIT & COMPLETE TRAINING'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Training Completed Section
          <div className="max-w-4xl mx-auto">
            <div 
              className="arcade-card p-8 text-center"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
              }}
            >
              <div className="mb-8">
                <div className="weapon-container w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🏆</span>
                </div>
                <h2 
                  className="text-3xl text-orange-400 mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  TRAINING COMPLETE!
                </h2>
                <p 
                  className="text-orange-300 text-sm leading-relaxed mb-8"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  YOUR YODHA'S TRAITS HAVE BEEN MODIFIED BY TRAINING
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 
                    className="text-lg text-orange-400 mb-6"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    PREVIOUS TRAITS
                  </h3>
                  <div className="space-y-4">
                    <TraitBar label="STRENGTH" value={selectedYodha!.traits.strength} />
                    <TraitBar label="WIT" value={selectedYodha!.traits.wit} />
                    <TraitBar label="CHARISMA" value={selectedYodha!.traits.charisma} />
                    <TraitBar label="DEFENCE" value={selectedYodha!.traits.defence} />
                    <TraitBar label="LUCK" value={selectedYodha!.traits.luck} />
                  </div>
                </div>

                <div>
                  <h3 
                    className="text-lg text-orange-400 mb-6"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    UPDATED TRAITS
                  </h3>
                  {updatedTraits && (
                    <div className="space-y-4">
                      <TraitBar 
                        label="STRENGTH" 
                        value={updatedTraits.strength} 
                        originalValue={selectedYodha!.traits.strength}
                        isUpdated 
                      />
                      <TraitBar 
                        label="WIT" 
                        value={updatedTraits.wit} 
                        originalValue={selectedYodha!.traits.wit}
                        isUpdated 
                      />
                      <TraitBar 
                        label="CHARISMA" 
                        value={updatedTraits.charisma} 
                        originalValue={selectedYodha!.traits.charisma}
                        isUpdated 
                      />
                      <TraitBar 
                        label="DEFENCE" 
                        value={updatedTraits.defence} 
                        originalValue={selectedYodha!.traits.defence}
                        isUpdated 
                      />
                      <TraitBar 
                        label="LUCK" 
                        value={updatedTraits.luck} 
                        originalValue={selectedYodha!.traits.luck}
                        isUpdated 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <a 
                  href="/"
                  className="inline-block arcade-button px-8 py-4 text-xs tracking-wide"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px'
                  }}
                >
                  RETURN TO ARENA
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home (only if not in training) */}
        {!hasEnteredGurukul && (
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
        )}
      </div>
    </div>
  );
}
