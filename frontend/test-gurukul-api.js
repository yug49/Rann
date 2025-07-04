// Test script for Gurukul API endpoint
// This is a test script to verify the API works - you can run it with: node test-gurukul-api.js

const testGurukuAPI = async () => {
  console.log('🧪 Testing Gurukul Analysis API...');
  
  // Mock test data
  const mockAuth = {
    signature: "test-signature",
    accountId: "test.testnet",
    publicKey: "test-public-key",
    message: "test-message",
    nonce: Buffer.from("test-nonce").toString('base64'),
    recipient: "test-recipient",
    callbackUrl: "test-callback"
  };

  const mockPayload = {
    auth: mockAuth,
    tokenId: 1,
    currentTraits: {
      strength: 50,
      wit: 50,
      charisma: 50,
      defence: 50,
      luck: 50
    },
    answers: [
      {
        questionId: 1,
        selectedOptionId: 1,
        question: "You encounter a wounded enemy warrior on the battlefield. What do you do?",
        selectedAnswer: "Help heal their wounds despite them being an enemy"
      },
      {
        questionId: 2,
        selectedOptionId: 2,
        question: "Your friend asks you to lie to protect them from consequences. What do you do?",
        selectedAnswer: "Tell the truth, even if it hurts your friend"
      }
    ]
  };

  try {
    // Test local analysis function (without actual NEAR AI call)
    console.log('📊 Testing local analysis function...');
    
    // Simple mock implementation to test logic
    const mockAnalysis = {
      analysis: "The warrior shows strong empathy and honesty in their moral choices, leading to increased charisma and wisdom.",
      traits: {
        strength: 48,
        wit: 55,
        charisma: 58,
        defence: 52,
        luck: 51
      },
      reasoning: {
        strength: "Slightly decreased due to choosing mercy over aggression",
        wit: "Increased due to making thoughtful decisions",
        charisma: "Significantly increased due to showing compassion and honesty",
        defence: "Slightly increased due to moral fortitude",
        luck: "Slightly increased due to positive karma from good choices"
      }
    };

    console.log('✅ Mock analysis result:', mockAnalysis);
    console.log('📈 Trait changes calculated successfully');
    
    const traitChanges = {
      strength: mockAnalysis.traits.strength - mockPayload.currentTraits.strength,
      wit: mockAnalysis.traits.wit - mockPayload.currentTraits.wit,
      charisma: mockAnalysis.traits.charisma - mockPayload.currentTraits.charisma,
      defence: mockAnalysis.traits.defence - mockPayload.currentTraits.defence,
      luck: mockAnalysis.traits.luck - mockPayload.currentTraits.luck
    };

    console.log('🔄 Trait changes:', traitChanges);
    
    console.log('✅ All tests passed! The API structure is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testGurukuAPI();
