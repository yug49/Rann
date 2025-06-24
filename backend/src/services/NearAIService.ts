/**
 * NEAR AI Service
 * 
 * Orchestrates AI operations with NEAR Protocol agents for trait generation,
 * battle simulation, and training recommendations
 * 
 * @author Rann Team
 */

import { connect, keyStores, Near } from 'near-api-js';
import axios from 'axios'; 
import type { 
  NearAIService as INearAIService,
  YodhaTraits,
  AITraitGenerationRequest,
  AITraitGenerationResponse,
  AIBattleSimulationRequest,
  AIBattleSimulationResponse,
  AITrainingRecommendation,
  AIAnalysisResult,
  AIServiceConfig
} from '../types/index.js';

export class NearAIService implements INearAIService {
  private near?: Near;
  private config: AIServiceConfig;
  private isInitialized = false;

  constructor() {
    this.config = this.getServiceConfig();
  }

  /**
   * Initialize NEAR AI service
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize NEAR connection
      if (this.config.nearConfig) {
        const keyStore = new keyStores.InMemoryKeyStore();
        
        this.near = await connect({
          ...this.config.nearConfig,
          keyStore
        });
        
        console.log(`✅ Connected to NEAR network: ${this.config.nearConfig.networkId}`);
      }

      // Test AI service endpoints
      await this.testAIEndpoints();

      this.isInitialized = true;
      console.log('✅ NEAR AI service initialized');
    } catch (error) {
      console.error('❌ NEAR AI service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test AI service endpoints
   */
  private async testAIEndpoints(): Promise<void> {
    try {
      // Test traits generator
      if (this.config.traitsGeneratorUrl) {
        await axios.get(`${this.config.traitsGeneratorUrl}/health`, {
          timeout: 5000
        });
        console.log('✅ Traits generator service available');
      }

      // Test attributes generator
      if (this.config.attributesGeneratorUrl) {
        await axios.get(`${this.config.attributesGeneratorUrl}/health`, {
          timeout: 5000
        });
        console.log('✅ Attributes generator service available');
      }
    } catch (error) {
      console.warn('⚠️ Some AI services may not be available:', error);
    }
  }

  /**
   * Check service health
   */
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.isInitialized) return false;

      // Check NEAR connection
      if (this.near) {
        await this.near.connection.provider.status();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate Yodha traits using AI
   */
  public async generateTraits(request: AITraitGenerationRequest): Promise<AITraitGenerationResponse> {
    try {
      if (!this.config.traitsGeneratorUrl) {
        return this.generateMockTraits(request);
      }

      const response = await axios.post(
        `${this.config.traitsGeneratorUrl}/generate`,
        {
          seed: request.seed,
          rarity: request.rarity,
          preferences: request.preferences,
          constraints: request.constraints
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined
          }
        }
      );

      return {
        traits: response.data.traits,
        metadata: {
          generationTime: Date.now(),
          model: response.data.model || 'traits-generator',
          confidence: response.data.confidence || 0.85,
          seed: request.seed,
          ...response.data.metadata
        },
        success: true
      };
    } catch (error) {
      console.error('❌ AI trait generation failed:', error);
      
      // Fallback to mock generation
      return this.generateMockTraits(request);
    }
  }

  /**
   * Generate mock traits for development/fallback
   */
  private generateMockTraits(request: AITraitGenerationRequest): AITraitGenerationResponse {
    const rarityMultiplier = {
      common: 1,
      uncommon: 1.2,
      rare: 1.5,
      epic: 2,
      legendary: 3
    }[request.rarity] || 1;

    const baseStats = {
      strength: Math.floor(Math.random() * 50 + 25),
      defense: Math.floor(Math.random() * 50 + 25),
      agility: Math.floor(Math.random() * 50 + 25),
      intelligence: Math.floor(Math.random() * 50 + 25),
      wisdom: Math.floor(Math.random() * 50 + 25),
      luck: Math.floor(Math.random() * 50 + 25)
    };

    // Apply rarity multiplier
    Object.keys(baseStats).forEach(key => {
      baseStats[key as keyof typeof baseStats] = Math.floor(
        baseStats[key as keyof typeof baseStats] * rarityMultiplier
      );
    });

    const traits: YodhaTraits = {
      tokenId: request.seed,
      name: this.generateRandomName(),
      description: `A ${request.rarity} Yodha warrior with unique abilities`,
      rarity: request.rarity,
      level: 1,
      experience: 0,
      baseStats,
      currentStats: { ...baseStats },
      skills: this.generateRandomSkills(request.rarity),
      equipment: [],
      achievements: [],
      battleHistory: [],
      metadataUri: '',
      imageUri: ''
    };

    return {
      traits,
      metadata: {
        generationTime: Date.now(),
        model: 'mock-generator',
        confidence: 0.8,
        seed: request.seed
      },
      success: true
    };
  }

  /**
   * Simulate battle using AI
   */
  public async simulateBattle(request: AIBattleSimulationRequest): Promise<AIBattleSimulationResponse> {
    try {
      if (!this.config.battleSimulatorUrl) {
        return this.simulateMockBattle(request);
      }

      const response = await axios.post(
        `${this.config.battleSimulatorUrl}/simulate`,
        {
          attacker: request.attacker,
          defender: request.defender,
          battleType: request.battleType,
          environment: request.environment
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined
          }
        }
      );

      return {
        result: response.data.result,
        rounds: response.data.rounds || [],
        metadata: {
          simulationTime: Date.now(),
          model: response.data.model || 'battle-simulator',
          accuracy: response.data.accuracy || 0.9,
          ...response.data.metadata
        },
        success: true
      };
    } catch (error) {
      console.error('❌ AI battle simulation failed:', error);
      
      // Fallback to mock simulation
      return this.simulateMockBattle(request);
    }
  }

  /**
   * Generate mock battle simulation
   */
  private simulateMockBattle(request: AIBattleSimulationRequest): AIBattleSimulationResponse {
    const { attacker, defender } = request;
    
    // Simple battle calculation
    const attackerPower = this.calculateBattlePower(attacker);
    const defenderPower = this.calculateBattlePower(defender);
    
    const totalPower = attackerPower + defenderPower;
    const attackerWinChance = attackerPower / totalPower;
    
    const winner = Math.random() < attackerWinChance ? attacker.tokenId : defender.tokenId;
    const rounds = Math.floor(Math.random() * 5) + 3; // 3-7 rounds
    
    return {
      result: {
        battleId: `battle_${Date.now()}`,
        attacker,
        defender,
        winner,
        damageDealt: {
          [attacker.tokenId]: Math.floor(Math.random() * 30 + 20),
          [defender.tokenId]: Math.floor(Math.random() * 30 + 20)
        },
        experienceGained: {
          [attacker.tokenId]: Math.floor(Math.random() * 20 + 10),
          [defender.tokenId]: Math.floor(Math.random() * 15 + 5)
        },
        battleType: request.battleType,
        duration: rounds * 1000,
        timestamp: new Date()
      },
      rounds: Array.from({ length: rounds }, (_, i) => ({
        round: i + 1,
        description: `Round ${i + 1}: Battle continues...`,
        damage: Math.floor(Math.random() * 10 + 5)
      })),
      metadata: {
        simulationTime: Date.now(),
        model: 'mock-simulator',
        accuracy: 0.75
      },
      success: true
    };
  }

  /**
   * Get training recommendations
   */
  public async getTrainingRecommendations(
    yodha: YodhaTraits,
    goals?: string[]
  ): Promise<AITrainingRecommendation[]> {
    try {
      if (!this.config.trainingAdvisorUrl) {
        return this.generateMockTrainingRecommendations(yodha, goals);
      }

      const response = await axios.post(
        `${this.config.trainingAdvisorUrl}/recommend`,
        {
          yodha,
          goals: goals || []
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined
          }
        }
      );

      return response.data.recommendations || [];
    } catch (error) {
      console.error('❌ AI training recommendations failed:', error);
      
      // Fallback to mock recommendations
      return this.generateMockTrainingRecommendations(yodha, goals);
    }
  }

  /**
   * Generate mock training recommendations
   */
  private generateMockTrainingRecommendations(
    yodha: YodhaTraits,
    goals?: string[]
  ): AITrainingRecommendation[] {
    const recommendations: AITrainingRecommendation[] = [];
    
    // Find weakest stat
    const stats = yodha.currentStats;
    const weakestStat = Object.entries(stats).reduce((a, b) => 
      stats[a[0] as keyof typeof stats] < stats[b[0] as keyof typeof stats] ? a : b
    )[0];
    
    recommendations.push({
      type: 'stat_training',
      priority: 'high',
      description: `Focus on improving ${weakestStat} through specialized training`,
      estimatedDuration: 3600000, // 1 hour
      expectedOutcome: {
        statImprovements: {
          [weakestStat]: 5
        }
      },
      requirements: [],
      confidence: 0.9
    });

    // Level-based recommendation
    if (yodha.level < 10) {
      recommendations.push({
        type: 'experience_training',
        priority: 'medium',
        description: 'General experience training to increase level',
        estimatedDuration: 2400000, // 40 minutes
        expectedOutcome: {
          experienceGain: 250
        },
        requirements: [],
        confidence: 0.85
      });
    }

    // Skill-based recommendation
    if (yodha.skills.length < 3) {
      recommendations.push({
        type: 'skill_training',
        priority: 'medium',
        description: 'Learn new combat skills',
        estimatedDuration: 4800000, // 80 minutes
        expectedOutcome: {
          newSkills: ['Combat Reflexes']
        },
        requirements: ['minimum level 3'],
        confidence: 0.8
      });
    }

    return recommendations;
  }

  /**
   * Analyze Yodha performance
   */
  public async analyzePerformance(
    yodha: YodhaTraits,
    battleHistory?: any[]
  ): Promise<AIAnalysisResult> {
    try {
      const winRate = this.calculateWinRate(battleHistory || yodha.battleHistory);
      const strengths = this.identifyStrengths(yodha);
      const weaknesses = this.identifyWeaknesses(yodha);
      const improvement = this.suggestImprovements(yodha, winRate);

      return {
        overall_score: this.calculateOverallScore(yodha, winRate),
        strengths,
        weaknesses,
        recommendations: improvement,
        performance_metrics: {
          win_rate: winRate,
          average_damage: this.calculateAverageDamage(battleHistory || []),
          survival_rate: this.calculateSurvivalRate(battleHistory || [])
        },
        confidence: 0.85,
        analysis_timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate battle power for simulation
   */
  private calculateBattlePower(yodha: YodhaTraits): number {
    const stats = yodha.currentStats;
    return (
      stats.strength * 1.2 +
      stats.defense * 1.0 +
      stats.agility * 1.1 +
      stats.intelligence * 0.8 +
      stats.wisdom * 0.7 +
      stats.luck * 0.5
    ) * (yodha.level * 0.1 + 1);
  }

  /**
   * Calculate win rate from battle history
   */
  private calculateWinRate(battleHistory: any[]): number {
    if (battleHistory.length === 0) return 0;
    
    const wins = battleHistory.filter(battle => battle.winner === battle.tokenId).length;
    return (wins / battleHistory.length) * 100;
  }

  /**
   * Identify Yodha strengths
   */
  private identifyStrengths(yodha: YodhaTraits): string[] {
    const stats = yodha.currentStats;
    const strengths: string[] = [];
    
    if (stats.strength > 70) strengths.push('High physical damage');
    if (stats.defense > 70) strengths.push('Excellent defense');
    if (stats.agility > 70) strengths.push('Superior speed and evasion');
    if (stats.intelligence > 70) strengths.push('Strategic thinking');
    if (stats.wisdom > 70) strengths.push('Magical resistance');
    if (stats.luck > 70) strengths.push('Favorable odds');
    
    if (yodha.skills.length > 5) strengths.push('Diverse skill set');
    if (yodha.level > 20) strengths.push('Experienced warrior');
    
    return strengths;
  }

  /**
   * Identify Yodha weaknesses
   */
  private identifyWeaknesses(yodha: YodhaTraits): string[] {
    const stats = yodha.currentStats;
    const weaknesses: string[] = [];
    
    if (stats.strength < 30) weaknesses.push('Low physical damage');
    if (stats.defense < 30) weaknesses.push('Vulnerable to attacks');
    if (stats.agility < 30) weaknesses.push('Slow movement');
    if (stats.intelligence < 30) weaknesses.push('Poor tactical awareness');
    if (stats.wisdom < 30) weaknesses.push('Weak against magic');
    if (stats.luck < 30) weaknesses.push('Unfavorable outcomes');
    
    if (yodha.skills.length < 2) weaknesses.push('Limited abilities');
    if (yodha.level < 5) weaknesses.push('Inexperienced');
    
    return weaknesses;
  }

  /**
   * Suggest improvements
   */
  private suggestImprovements(yodha: YodhaTraits, winRate: number): string[] {
    const suggestions: string[] = [];
    
    if (winRate < 50) {
      suggestions.push('Focus on balanced stat training');
      suggestions.push('Learn defensive skills');
    }
    
    if (yodha.level < 10) {
      suggestions.push('Gain more battle experience');
    }
    
    const stats = yodha.currentStats;
    const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / Object.keys(stats).length;
    
    Object.entries(stats).forEach(([stat, value]) => {
      if (value < avgStat * 0.7) {
        suggestions.push(`Improve ${stat} through specific training`);
      }
    });
    
    return suggestions;
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(yodha: YodhaTraits, winRate: number): number {
    const stats = yodha.currentStats;
    const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / Object.keys(stats).length;
    const levelBonus = yodha.level * 2;
    const skillBonus = yodha.skills.length * 5;
    const winRateBonus = winRate;
    
    return Math.min(100, avgStat + levelBonus + skillBonus + winRateBonus);
  }

  /**
   * Calculate average damage from battle history
   */
  private calculateAverageDamage(battleHistory: any[]): number {
    if (battleHistory.length === 0) return 0;
    
    const totalDamage = battleHistory.reduce((sum, battle) => {
      return sum + (battle.damageDealt || 0);
    }, 0);
    
    return totalDamage / battleHistory.length;
  }

  /**
   * Calculate survival rate
   */
  private calculateSurvivalRate(battleHistory: any[]): number {
    if (battleHistory.length === 0) return 100;
    
    // Assuming survival if not marked as defeated
    const survived = battleHistory.filter(battle => !battle.defeated).length;
    return (survived / battleHistory.length) * 100;
  }

  /**
   * Generate random name for Yodha
   */
  private generateRandomName(): string {
    const prefixes = ['Arya', 'Bhima', 'Deva', 'Karna', 'Maya', 'Naga', 'Rudra', 'Surya', 'Vayu', 'Yama'];
    const suffixes = ['warrior', 'blade', 'storm', 'fire', 'shadow', 'light', 'thunder', 'wind', 'earth', 'void'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} the ${suffix}`;
  }

  /**
   * Generate random skills based on rarity
   */
  private generateRandomSkills(rarity: string): string[] {
    const commonSkills = ['Basic Attack', 'Defend', 'Focus'];
    const uncommonSkills = ['Power Strike', 'Quick Step', 'Meditation'];
    const rareSkills = ['Whirlwind', 'Iron Skin', 'Mind Shield'];
    const epicSkills = ['Lightning Strike', 'Berserker Rage', 'Time Dilation'];
    const legendarySkills = ['Divine Intervention', 'Reality Warp', 'Soul Burn'];
    
    let availableSkills = [...commonSkills];
    
    if (rarity !== 'common') availableSkills.push(...uncommonSkills);
    if (['rare', 'epic', 'legendary'].includes(rarity)) availableSkills.push(...rareSkills);
    if (['epic', 'legendary'].includes(rarity)) availableSkills.push(...epicSkills);
    if (rarity === 'legendary') availableSkills.push(...legendarySkills);
    
    const numSkills = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }[rarity] || 1;
    
    const skills: string[] = [];
    for (let i = 0; i < numSkills && skills.length < availableSkills.length; i++) {
      const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      if (!skills.includes(randomSkill)) {
        skills.push(randomSkill);
      }
    }
    
    return skills;
  }

  /**
   * Get service configuration
   * TODO: Here we have to assign different URL for agents or just random URL
   */
  private getServiceConfig(): AIServiceConfig {
    return {
      traitsGeneratorUrl: process.env.TRAITS_GENERATOR_URL,
      attributesGeneratorUrl: process.env.ATTRIBUTES_GENERATOR_URL,
      battleSimulatorUrl: process.env.BATTLE_SIMULATOR_URL,
      trainingAdvisorUrl: process.env.TRAINING_ADVISOR_URL,
      apiKey: process.env.NEAR_AI_API_KEY,
      nearConfig: process.env.NEAR_NETWORK_ID ? {
        networkId: process.env.NEAR_NETWORK_ID,
        nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
        walletUrl: process.env.NEAR_WALLET_URL || 'https://wallet.testnet.near.org',
        helperUrl: process.env.NEAR_HELPER_URL || 'https://helper.testnet.near.org'
      } : undefined
    };
  }

  /**
   * Cleanup resources
   */
  public async disconnect(): Promise<void> {
    try {
      this.near = undefined;
      this.isInitialized = false;
      console.log('✅ NEAR AI service disconnected');
    } catch (error) {
      console.error('❌ NEAR AI service disconnect error:', error);
    }
  }
}
