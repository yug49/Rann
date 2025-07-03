#!/usr/bin/env node

/**
 * JSON Object File Generator
 * 
 * This script generates comprehensive JSON object files for:
 * - NFT metadata and traits
 * - Battle configurations and results
 * - Training sessions and progress
 * - User profiles and achievements
 * - System configurations and settings
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class JSONObjectGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, 'generated-json-objects');
    this.templates = {};
    this.generatedFiles = [];
  }

  async initialize() {
    console.log('📄 Initializing JSON Object File Generator...\n');
    
    // Create output directory
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`📁 Output directory created: ${this.outputDir}\n`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // Generate unique IDs
  generateId(prefix = '') {
    return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // 1. NFT Metadata Objects
  async generateNFTMetadata() {
    console.log('🎨 Generating NFT Metadata Objects...');
    
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const elements = ['fire', 'water', 'earth', 'air', 'light', 'dark'];
    const classes = ['warrior', 'mage', 'archer', 'assassin', 'healer', 'berserker'];
    
    const nftMetadata = [];
    
    for (let i = 0; i < 10; i++) {
      const tokenId = this.generateId('nft_');
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const element = elements[Math.floor(Math.random() * elements.length)];
      const characterClass = classes[Math.floor(Math.random() * classes.length)];
      
      // Generate stats based on rarity
      const baseStats = this.generateStats(rarity);
      
      const metadata = {
        tokenId: tokenId,
        name: `${this.capitalize(element)} ${this.capitalize(characterClass)} #${i + 1}`,
        description: `A ${rarity} ${element} ${characterClass} with exceptional abilities in the Rann universe.`,
        image: `https://rann.game/nfts/${tokenId}.png`,
        animation_url: `https://rann.game/animations/${tokenId}.mp4`,
        external_url: `https://rann.game/yodha/${tokenId}`,
        
        attributes: [
          { trait_type: "Rarity", value: rarity },
          { trait_type: "Element", value: element },
          { trait_type: "Class", value: characterClass },
          { trait_type: "Level", value: 1, display_type: "number" },
          { trait_type: "Experience", value: 0, display_type: "number", max_value: 1000 },
          { trait_type: "Strength", value: baseStats.strength, display_type: "number", max_value: 100 },
          { trait_type: "Agility", value: baseStats.agility, display_type: "number", max_value: 100 },
          { trait_type: "Intelligence", value: baseStats.intelligence, display_type: "number", max_value: 100 },
          { trait_type: "Wisdom", value: baseStats.wisdom, display_type: "number", max_value: 100 },
          { trait_type: "Charisma", value: baseStats.charisma, display_type: "number", max_value: 100 },
          { trait_type: "Constitution", value: baseStats.constitution, display_type: "number", max_value: 100 }
        ],
        
        properties: {
          created_at: new Date().toISOString(),
          generation: 1,
          breeding_count: 0,
          battle_wins: 0,
          battle_losses: 0,
          training_sessions: 0,
          achievements: [],
          special_abilities: this.generateSpecialAbilities(element, characterClass, rarity),
          equipment: this.generateEquipment(rarity),
          background_story: this.generateBackgroundStory(element, characterClass)
        },
        
        compiler: "Rann AI Trait Generator v1.0",
        date: Date.now()
      };
      
      nftMetadata.push(metadata);
    }
    
    const filename = `nft-metadata-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(nftMetadata, null, 2));
    this.generatedFiles.push({ type: 'NFT Metadata', filename, count: nftMetadata.length });
    
    console.log(`   ✅ Generated ${nftMetadata.length} NFT metadata objects`);
    console.log(`   📄 Saved to: ${filename}\n`);
    
    return nftMetadata;
  }

  // 2. Battle Configuration Objects
  async generateBattleConfigurations() {
    console.log('⚔️ Generating Battle Configuration Objects...');
    
    const battleTypes = ['casual', 'ranked', 'tournament', 'training', 'boss'];
    const arenas = ['fire_temple', 'water_shrine', 'earth_cavern', 'air_peak', 'light_sanctum', 'dark_abyss'];
    const weatherConditions = ['sunny', 'rainy', 'stormy', 'foggy', 'windy', 'scorching'];
    
    const battleConfigs = [];
    
    for (let i = 0; i < 15; i++) {
      const battleId = this.generateId('battle_');
      const battleType = battleTypes[Math.floor(Math.random() * battleTypes.length)];
      const arena = arenas[Math.floor(Math.random() * arenas.length)];
      const weather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
      
      const config = {
        battleId: battleId,
        battleType: battleType,
        arena: {
          name: arena,
          element_bonus: arena.split('_')[0],
          terrain_effects: this.generateTerrainEffects(arena),
          weather: weather,
          weather_effects: this.generateWeatherEffects(weather)
        },
        
        rules: {
          max_participants: battleType === 'tournament' ? 8 : 2,
          time_limit: battleType === 'boss' ? 600 : 300, // seconds
          turns_limit: 50,
          allow_items: battleType !== 'training',
          allow_abilities: true,
          energy_regeneration: battleType === 'casual' ? 'fast' : 'normal'
        },
        
        rewards: {
          winner: {
            experience: this.generateRewardValue(battleType, 'experience'),
            tokens: this.generateRewardValue(battleType, 'tokens'),
            items: this.generateRewardItems(battleType, true),
            ranking_points: battleType === 'ranked' ? Math.floor(Math.random() * 50) + 25 : 0
          },
          participant: {
            experience: Math.floor(this.generateRewardValue(battleType, 'experience') * 0.3),
            tokens: Math.floor(this.generateRewardValue(battleType, 'tokens') * 0.2),
            items: this.generateRewardItems(battleType, false)
          }
        },
        
        mechanics: {
          damage_multipliers: {
            critical_hit: 1.5,
            element_advantage: 1.25,
            class_bonus: 1.15,
            equipment_bonus: 1.1
          },
          status_effects: {
            burn: { damage_per_turn: 5, duration: 3 },
            freeze: { skip_turns: 1, duration: 2 },
            poison: { damage_per_turn: 3, duration: 5 },
            heal: { heal_per_turn: 8, duration: 3 }
          },
          special_conditions: this.generateSpecialConditions(battleType, arena)
        },
        
        ai_difficulty: {
          level: battleType === 'training' ? 'easy' : battleType === 'boss' ? 'legendary' : 'normal',
          aggression: Math.random(),
          strategy_complexity: Math.random(),
          adaptation_rate: Math.random()
        },
        
        metadata: {
          created_at: new Date().toISOString(),
          version: "1.2.0",
          creator: "Rann Battle System",
          estimated_duration: `${Math.floor(Math.random() * 20) + 5} minutes`
        }
      };
      
      battleConfigs.push(config);
    }
    
    const filename = `battle-configurations-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(battleConfigs, null, 2));
    this.generatedFiles.push({ type: 'Battle Configurations', filename, count: battleConfigs.length });
    
    console.log(`   ✅ Generated ${battleConfigs.length} battle configuration objects`);
    console.log(`   📄 Saved to: ${filename}\n`);
    
    return battleConfigs;
  }

  // 3. Training Session Objects
  async generateTrainingSessions() {
    console.log('🎓 Generating Training Session Objects...');
    
    const trainingTypes = ['strength', 'agility', 'intelligence', 'wisdom', 'combat', 'meditation', 'elemental'];
    const instructors = ['Master Kai', 'Sensei Yuki', 'Guru Arjun', 'Professor Elena', 'Commander Rex'];
    const difficulties = ['beginner', 'intermediate', 'advanced', 'expert', 'master'];
    
    const trainingSessions = [];
    
    for (let i = 0; i < 12; i++) {
      const sessionId = this.generateId('training_');
      const trainingType = trainingTypes[Math.floor(Math.random() * trainingTypes.length)];
      const instructor = instructors[Math.floor(Math.random() * instructors.length)];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      const session = {
        sessionId: sessionId,
        trainingType: trainingType,
        title: `${this.capitalize(trainingType)} Training - ${difficulty} Level`,
        description: `Intensive ${trainingType} training session designed to enhance your Yodha's capabilities.`,
        
        instructor: {
          name: instructor,
          specialty: trainingType,
          experience_years: Math.floor(Math.random() * 20) + 5,
          success_rate: Math.random() * 0.3 + 0.7, // 70-100%
          teaching_style: this.getTeachingStyle(instructor)
        },
        
        requirements: {
          minimum_level: this.getDifficultyLevel(difficulty),
          energy_cost: Math.floor(Math.random() * 50) + 25,
          prerequisites: this.getTrainingPrerequisites(trainingType, difficulty),
          equipment_needed: this.getTrainingEquipment(trainingType)
        },
        
        curriculum: {
          duration_hours: Math.floor(Math.random() * 8) + 2,
          phases: [
            {
              name: "Warm-up",
              duration_minutes: 30,
              activities: ["Stretching", "Basic movements", "Mental preparation"],
              stat_improvements: { constitution: 1 }
            },
            {
              name: "Core Training",
              duration_minutes: Math.floor(Math.random() * 120) + 60,
              activities: this.getCoreTrainingActivities(trainingType),
              stat_improvements: this.getStatImprovements(trainingType, difficulty)
            },
            {
              name: "Advanced Techniques",
              duration_minutes: Math.floor(Math.random() * 90) + 30,
              activities: this.getAdvancedActivities(trainingType),
              stat_improvements: this.getAdvancedImprovements(trainingType, difficulty)
            },
            {
              name: "Cool-down",
              duration_minutes: 15,
              activities: ["Meditation", "Recovery exercises", "Knowledge review"],
              stat_improvements: { wisdom: 1 }
            }
          ]
        },
        
        rewards: {
          guaranteed: {
            experience: this.getTrainingExperience(difficulty),
            stat_improvements: this.getStatImprovements(trainingType, difficulty),
            new_abilities: this.getNewAbilities(trainingType, difficulty)
          },
          possible: {
            bonus_stats: this.getBonusStats(difficulty),
            rare_techniques: this.getRareTechniques(trainingType),
            special_items: this.getSpecialTrainingItems(trainingType),
            achievement_unlocks: this.getAchievementUnlocks(trainingType, difficulty)
          },
          completion_rate_bonus: {
            "100%": { bonus_xp: 50, bonus_stats: 2 },
            "90-99%": { bonus_xp: 25, bonus_stats: 1 },
            "80-89%": { bonus_xp: 10, bonus_stats: 0 }
          }
        },
        
        schedule: {
          start_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
          timezone: "UTC",
          available_slots: this.getAvailableSlots(),
          booking_deadline: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString()
        },
        
        metadata: {
          created_at: new Date().toISOString(),
          version: "2.1.0",
          creator: "Rann Training System",
          max_participants: Math.floor(Math.random() * 10) + 1,
          current_enrolled: Math.floor(Math.random() * 5),
          success_stories: Math.floor(Math.random() * 100) + 50
        }
      };
      
      trainingSessions.push(session);
    }
    
    const filename = `training-sessions-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(trainingSessions, null, 2));
    this.generatedFiles.push({ type: 'Training Sessions', filename, count: trainingSessions.length });
    
    console.log(`   ✅ Generated ${trainingSessions.length} training session objects`);
    console.log(`   📄 Saved to: ${filename}\n`);
    
    return trainingSessions;
  }

  // 4. User Profile Objects
  async generateUserProfiles() {
    console.log('👥 Generating User Profile Objects...');
    
    const userProfiles = [];
    
    for (let i = 0; i < 8; i++) {
      const userId = this.generateId('user_');
      const walletAddress = this.generateWalletAddress();
      
      const profile = {
        userId: userId,
        walletAddress: walletAddress,
        username: `Player${Math.floor(Math.random() * 10000)}`,
        displayName: this.generateDisplayName(),
        
        account: {
          created_at: new Date(Date.now() - Math.random() * 31536000000).toISOString(), // Within last year
          last_login: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Within last week
          email_verified: Math.random() > 0.2,
          kyc_status: Math.random() > 0.5 ? "verified" : "pending",
          account_type: Math.random() > 0.9 ? "premium" : "standard"
        },
        
        game_stats: {
          level: Math.floor(Math.random() * 50) + 1,
          total_experience: Math.floor(Math.random() * 100000),
          yodhas_owned: Math.floor(Math.random() * 10) + 1,
          battles_fought: Math.floor(Math.random() * 200),
          battles_won: Math.floor(Math.random() * 150),
          training_sessions_completed: Math.floor(Math.random() * 100),
          tournaments_participated: Math.floor(Math.random() * 20),
          tournaments_won: Math.floor(Math.random() * 5),
          current_rank: this.generateRank(),
          highest_rank: this.generateRank()
        },
        
        inventory: {
          rann_tokens: Math.floor(Math.random() * 10000),
          items: this.generateInventoryItems(),
          equipment: this.generateEquipmentInventory(),
          consumables: this.generateConsumables()
        },
        
        achievements: this.generateAchievements(),
        
        preferences: {
          theme: Math.random() > 0.5 ? "dark" : "light",
          language: "en",
          notifications: {
            battle_results: true,
            training_complete: true,
            marketplace_updates: Math.random() > 0.3,
            social_interactions: Math.random() > 0.4,
            system_announcements: true
          },
          privacy: {
            profile_visibility: Math.random() > 0.3 ? "public" : "private",
            battle_history_visible: Math.random() > 0.4,
            inventory_visible: Math.random() > 0.7
          }
        },
        
        social: {
          friends: this.generateFriendsList(),
          guild: Math.random() > 0.6 ? {
            guild_id: this.generateId('guild_'),
            name: this.generateGuildName(),
            role: this.getGuildRole(),
            joined_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
          } : null,
          reputation: Math.floor(Math.random() * 1000),
          karma_score: Math.floor(Math.random() * 500) - 100 // Can be negative
        },
        
        analytics: {
          total_playtime_hours: Math.floor(Math.random() * 1000),
          favorite_yodha_class: this.getRandomClass(),
          preferred_battle_type: this.getRandomBattleType(),
          most_trained_stat: this.getRandomStat(),
          peak_online_hours: `${Math.floor(Math.random() * 12) + 8}:00-${Math.floor(Math.random() * 12) + 20}:00`,
          spending_pattern: {
            total_spent_usd: Math.floor(Math.random() * 1000),
            average_session_spend: Math.floor(Math.random() * 50),
            preferred_purchase_type: this.getPreferredPurchaseType()
          }
        },
        
        metadata: {
          profile_version: "3.0.0",
          last_updated: new Date().toISOString(),
          data_migration_version: "1.2",
          feature_flags: {
            beta_features: Math.random() > 0.7,
            advanced_analytics: Math.random() > 0.8,
            early_access: Math.random() > 0.9
          }
        }
      };
      
      userProfiles.push(profile);
    }
    
    const filename = `user-profiles-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(userProfiles, null, 2));
    this.generatedFiles.push({ type: 'User Profiles', filename, count: userProfiles.length });
    
    console.log(`   ✅ Generated ${userProfiles.length} user profile objects`);
    console.log(`   📄 Saved to: ${filename}\n`);
    
    return userProfiles;
  }

  // 5. System Configuration Objects
  async generateSystemConfigurations() {
    console.log('⚙️ Generating System Configuration Objects...');
    
    const systemConfig = {
      application: {
        name: "Rann Gaming Platform",
        version: "1.0.0",
        environment: "production",
        api_version: "v1",
        last_deployment: new Date().toISOString(),
        maintenance_window: "02:00-04:00 UTC",
        feature_flags: {
          new_battle_system: true,
          advanced_ai_training: true,
          marketplace_v2: false,
          social_features: true,
          guild_system: true,
          tournament_mode: true,
          beta_testing: false
        }
      },
      
      blockchain: {
        flow: {
          network: "testnet",
          access_node: "https://rest-testnet.onflow.org",
          contracts: {
            YodhaNFT: "0x01cf0e2f2f715450",
            RannToken: "0x01cf0e2f2f715451",
            Kurukshetra: "0x01cf0e2f2f715452",
            Gurukul: "0x01cf0e2f2f715453",
            Bazaar: "0x01cf0e2f2f715454"
          },
          gas_limits: {
            mint_nft: 1000,
            battle_registration: 500,
            training_start: 300,
            token_transfer: 200
          }
        }
      },
      
      services: {
        database: {
          type: "sqlite",
          connection_pool_size: 17,
          query_timeout: 30000,
          backup_frequency: "daily",
          cleanup_frequency: "weekly"
        },
        ai_service: {
          provider: "NEAR AI",
          models: {
            trait_generation: "gpt-4-turbo",
            battle_simulation: "claude-3",
            training_analysis: "gemini-pro"
          },
          rate_limits: {
            requests_per_minute: 100,
            requests_per_hour: 1000
          }
        },
        storage: {
          ipfs: {
            enabled: false,
            gateway: "https://ipfs.io/ipfs/"
          },
          web3_storage: {
            enabled: true,
            endpoint: "https://api.web3.storage"
          },
          lighthouse: {
            enabled: true,
            endpoint: "https://node.lighthouse.storage"
          }
        }
      },
      
      game_mechanics: {
        battle_system: {
          max_battle_duration: 300,
          energy_regeneration_rate: 10,
          critical_hit_chance: 0.15,
          element_advantage_multiplier: 1.25,
          experience_gain_multiplier: 1.0
        },
        training_system: {
          max_concurrent_sessions: 3,
          stat_improvement_cap: 5,
          energy_cost_multiplier: 1.2,
          success_rate_base: 0.8
        },
        economy: {
          token_generation_rate: 100,
          marketplace_fee: 0.025,
          training_cost_multiplier: 1.5,
          battle_reward_multiplier: 1.0
        }
      },
      
      limits: {
        user: {
          max_yodhas: 50,
          max_inventory_items: 1000,
          max_friends: 100,
          max_battles_per_day: 20,
          max_training_sessions_per_day: 5
        },
        system: {
          max_concurrent_battles: 1000,
          max_concurrent_trainings: 5000,
          max_marketplace_listings: 10000,
          max_users_online: 50000
        }
      },
      
      security: {
        authentication: {
          jwt_expiry: "7d",
          session_timeout: "1h",
          max_failed_attempts: 5,
          lockout_duration: "15m"
        },
        api: {
          rate_limit: 100,
          rate_window: "1m",
          max_request_size: "10mb",
          allowed_origins: ["https://rann.game", "https://app.rann.game"]
        }
      },
      
      monitoring: {
        health_check_interval: 30,
        metric_collection_interval: 60,
        log_retention_days: 30,
        alert_thresholds: {
          response_time_ms: 1000,
          error_rate_percent: 5,
          cpu_usage_percent: 80,
          memory_usage_percent: 85
        }
      },
      
      metadata: {
        config_version: "2.3.0",
        last_updated: new Date().toISOString(),
        updated_by: "System Administrator",
        environment_tag: "production",
        region: "us-east-1"
      }
    };
    
    const filename = `system-configuration-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(systemConfig, null, 2));
    this.generatedFiles.push({ type: 'System Configuration', filename, count: 1 });
    
    console.log(`   ✅ Generated system configuration object`);
    console.log(`   📄 Saved to: ${filename}\n`);
    
    return systemConfig;
  }

  // Helper methods for data generation
  generateStats(rarity) {
    const baseStats = {
      common: { min: 20, max: 40 },
      uncommon: { min: 30, max: 50 },
      rare: { min: 40, max: 65 },
      epic: { min: 55, max: 80 },
      legendary: { min: 70, max: 95 }
    };
    
    const range = baseStats[rarity];
    
    return {
      strength: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
      agility: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
      intelligence: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
      wisdom: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
      charisma: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
      constitution: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
    };
  }

  generateSpecialAbilities(element, characterClass, rarity) {
    const abilities = [];
    const numAbilities = rarity === 'legendary' ? 4 : rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1;
    
    const abilityPool = [
      `${element}_blast`, `${characterClass}_mastery`, 'critical_strike',
      'heal', 'shield', 'speed_boost', 'strength_surge', 'mana_burn'
    ];
    
    for (let i = 0; i < numAbilities; i++) {
      if (abilityPool.length > 0) {
        const index = Math.floor(Math.random() * abilityPool.length);
        abilities.push(abilityPool.splice(index, 1)[0]);
      }
    }
    
    return abilities;
  }

  generateEquipment(rarity) {
    const equipmentTypes = ['weapon', 'armor', 'accessory'];
    const equipment = [];
    
    equipmentTypes.forEach(type => {
      if (Math.random() > 0.3) { // 70% chance to have each equipment type
        equipment.push({
          type: type,
          name: `${rarity} ${type}`,
          stats_boost: this.generateStats(rarity),
          durability: Math.floor(Math.random() * 100) + 1
        });
      }
    });
    
    return equipment;
  }

  generateBackgroundStory(element, characterClass) {
    const stories = [
      `Born in the ${element} realm, this ${characterClass} has trained for years to master their abilities.`,
      `A legendary ${characterClass} who wields the power of ${element} with unmatched skill.`,
      `Once a simple ${characterClass}, they discovered their ${element} powers during a great battle.`,
      `The last of their kind, this ${element} ${characterClass} seeks to restore balance to the world.`,
      `A mysterious ${characterClass} who emerged from the ${element} dimension with incredible powers.`
    ];
    
    return stories[Math.floor(Math.random() * stories.length)];
  }

  generateWalletAddress() {
    return '0x' + crypto.randomBytes(20).toString('hex');
  }

  generateDisplayName() {
    const prefixes = ['Dragon', 'Shadow', 'Fire', 'Ice', 'Storm', 'Light', 'Dark', 'Earth'];
    const suffixes = ['Walker', 'Slayer', 'Master', 'Guardian', 'Warrior', 'Mage', 'Hunter', 'Lord'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Additional helper methods would go here...
  getDifficultyLevel(difficulty) {
    const levels = { beginner: 1, intermediate: 10, advanced: 25, expert: 40, master: 60 };
    return levels[difficulty] || 1;
  }

  getTeachingStyle(instructor) {
    const styles = ['Strict', 'Encouraging', 'Patient', 'Demanding', 'Inspiring'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  getTrainingPrerequisites(type, difficulty) {
    if (difficulty === 'beginner') return [];
    return [`Basic ${type} knowledge`, `Level ${this.getDifficultyLevel(difficulty)} required`];
  }

  getTrainingEquipment(type) {
    const equipment = {
      strength: ['Training weights', 'Resistance bands'],
      agility: ['Agility ladder', 'Cones'],
      intelligence: ['Study materials', 'Focus crystals'],
      wisdom: ['Meditation mat', 'Incense'],
      combat: ['Training sword', 'Practice armor'],
      meditation: ['Cushion', 'Calm environment'],
      elemental: ['Element stones', 'Channeling focus']
    };
    
    return equipment[type] || ['Basic equipment'];
  }

  getCoreTrainingActivities(type) {
    const activities = {
      strength: ['Weight lifting', 'Resistance training', 'Power exercises'],
      agility: ['Speed drills', 'Coordination exercises', 'Reflexes training'],
      intelligence: ['Problem solving', 'Strategy games', 'Memory exercises'],
      wisdom: ['Meditation', 'Philosophy study', 'Insight practices'],
      combat: ['Sparring', 'Technique drills', 'Combat scenarios'],
      meditation: ['Breathing exercises', 'Mindfulness', 'Inner peace'],
      elemental: ['Element manipulation', 'Energy channeling', 'Power control']
    };
    
    return activities[type] || ['General training'];
  }

  getStatImprovements(type, difficulty) {
    const base = this.getDifficultyLevel(difficulty) / 10;
    const improvements = {};
    
    switch (type) {
      case 'strength':
        improvements.strength = Math.floor(base * 3);
        improvements.constitution = Math.floor(base);
        break;
      case 'agility':
        improvements.agility = Math.floor(base * 3);
        improvements.constitution = Math.floor(base);
        break;
      case 'intelligence':
        improvements.intelligence = Math.floor(base * 3);
        improvements.wisdom = Math.floor(base);
        break;
      case 'wisdom':
        improvements.wisdom = Math.floor(base * 3);
        improvements.intelligence = Math.floor(base);
        break;
      case 'combat':
        improvements.strength = Math.floor(base);
        improvements.agility = Math.floor(base);
        improvements.constitution = Math.floor(base * 2);
        break;
      default:
        improvements[type] = Math.floor(base * 2);
    }
    
    return improvements;
  }

  getAdvancedActivities(type) {
    return [`Advanced ${type} techniques`, `Master-level ${type} training`, `Elite ${type} challenges`];
  }

  getAdvancedImprovements(type, difficulty) {
    const base = this.getStatImprovements(type, difficulty);
    Object.keys(base).forEach(key => {
      base[key] = Math.floor(base[key] * 1.5);
    });
    return base;
  }

  getTrainingExperience(difficulty) {
    const exp = { beginner: 100, intermediate: 250, advanced: 500, expert: 1000, master: 2000 };
    return exp[difficulty] || 100;
  }

  getNewAbilities(type, difficulty) {
    if (difficulty === 'beginner') return [];
    return [`${type}_boost`, `enhanced_${type}`];
  }

  getBonusStats(difficulty) {
    const bonus = this.getDifficultyLevel(difficulty) / 20;
    return Math.floor(bonus);
  }

  getRareTechniques(type) {
    return [`rare_${type}_technique`, `secret_${type}_method`];
  }

  getSpecialTrainingItems(type) {
    return [`${type}_enhancement_potion`, `${type}_training_manual`];
  }

  getAchievementUnlocks(type, difficulty) {
    return [`${type}_${difficulty}_completion`, `dedicated_${type}_trainee`];
  }

  getAvailableSlots() {
    const slots = [];
    for (let i = 8; i <= 20; i++) {
      slots.push(`${i}:00`);
    }
    return slots;
  }

  generateTerrainEffects(arena) {
    const effects = {
      fire_temple: ['Burn damage +25%', 'Fire resistance +50%'],
      water_shrine: ['Healing effects +30%', 'Lightning damage -25%'],
      earth_cavern: ['Defense +20%', 'Speed -10%'],
      air_peak: ['Speed +30%', 'Accuracy -15%'],
      light_sanctum: ['Healing +50%', 'Dark damage -50%'],
      dark_abyss: ['Critical hit +25%', 'Light damage -50%']
    };
    
    return effects[arena] || ['No special effects'];
  }

  generateWeatherEffects(weather) {
    const effects = {
      sunny: ['Visibility +100%', 'Fire damage +10%'],
      rainy: ['Lightning damage +25%', 'Fire damage -25%'],
      stormy: ['Lightning damage +50%', 'Accuracy -20%'],
      foggy: ['Visibility -50%', 'Stealth +30%'],
      windy: ['Projectile accuracy -30%', 'Air damage +20%'],
      scorching: ['Fire damage +30%', 'Ice damage -40%']
    };
    
    return effects[weather] || ['No weather effects'];
  }

  generateRewardValue(battleType, rewardType) {
    const multipliers = {
      casual: { experience: 50, tokens: 25 },
      ranked: { experience: 100, tokens: 50 },
      tournament: { experience: 200, tokens: 100 },
      training: { experience: 30, tokens: 15 },
      boss: { experience: 300, tokens: 150 }
    };
    
    return multipliers[battleType]?.[rewardType] || 25;
  }

  generateRewardItems(battleType, isWinner) {
    const baseItems = ['health_potion', 'mana_potion'];
    const winnerItems = ['rare_gem', 'enhancement_scroll', 'battle_trophy'];
    
    if (isWinner && battleType !== 'training') {
      return [...baseItems, ...winnerItems.slice(0, Math.floor(Math.random() * 2) + 1)];
    }
    
    return baseItems;
  }

  generateSpecialConditions(battleType, arena) {
    if (battleType === 'boss') {
      return ['Boss has multiple phases', 'Environmental hazards active', 'Special mechanics enabled'];
    }
    
    if (battleType === 'tournament') {
      return ['Elimination style', 'No healing items', 'Time pressure'];
    }
    
    return ['Standard conditions'];
  }

  generateRank() {
    const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
    return ranks[Math.floor(Math.random() * ranks.length)];
  }

  generateInventoryItems() {
    const items = ['Health Potion', 'Mana Potion', 'Strength Scroll', 'Agility Scroll', 'Rare Gem'];
    return items.map(item => ({
      name: item,
      quantity: Math.floor(Math.random() * 10) + 1,
      rarity: this.getRandomRarity()
    }));
  }

  generateEquipmentInventory() {
    const equipment = ['Iron Sword', 'Steel Armor', 'Magic Ring', 'Power Gloves', 'Swift Boots'];
    return equipment.map(item => ({
      name: item,
      type: this.getEquipmentType(item),
      stats: this.generateStats('common'),
      equipped: Math.random() > 0.7
    }));
  }

  generateConsumables() {
    const consumables = ['Energy Drink', 'Focus Potion', 'Healing Salve', 'Speed Boost', 'Shield Scroll'];
    return consumables.map(item => ({
      name: item,
      quantity: Math.floor(Math.random() * 5) + 1,
      effect: this.getConsumableEffect(item)
    }));
  }

  generateAchievements() {
    const achievements = [
      { name: 'First Battle', description: 'Complete your first battle', unlocked: true },
      { name: 'Training Graduate', description: 'Complete 10 training sessions', unlocked: Math.random() > 0.3 },
      { name: 'Battle Master', description: 'Win 100 battles', unlocked: Math.random() > 0.7 },
      { name: 'Legendary Trainer', description: 'Reach max level in all stats', unlocked: Math.random() > 0.9 }
    ];
    
    return achievements.filter(a => a.unlocked);
  }

  generateFriendsList() {
    const friends = [];
    const numFriends = Math.floor(Math.random() * 20);
    
    for (let i = 0; i < numFriends; i++) {
      friends.push({
        userId: this.generateId('user_'),
        username: this.generateDisplayName(),
        status: Math.random() > 0.3 ? 'online' : 'offline',
        level: Math.floor(Math.random() * 50) + 1
      });
    }
    
    return friends;
  }

  generateGuildName() {
    const prefixes = ['Legion of', 'Order of', 'Brotherhood of', 'Alliance of', 'Guild of'];
    const suffixes = ['Fire', 'Shadow', 'Light', 'Storm', 'Steel', 'Magic', 'Honor', 'Victory'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
  }

  getGuildRole() {
    const roles = ['Member', 'Officer', 'Elder', 'Leader'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  getRandomClass() {
    const classes = ['warrior', 'mage', 'archer', 'assassin', 'healer', 'berserker'];
    return classes[Math.floor(Math.random() * classes.length)];
  }

  getRandomBattleType() {
    const types = ['casual', 'ranked', 'tournament', 'training'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomStat() {
    const stats = ['strength', 'agility', 'intelligence', 'wisdom', 'charisma', 'constitution'];
    return stats[Math.floor(Math.random() * stats.length)];
  }

  getPreferredPurchaseType() {
    const types = ['cosmetics', 'boosters', 'premium_features', 'tokens'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomRarity() {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return rarities[Math.floor(Math.random() * rarities.length)];
  }

  getEquipmentType(item) {
    if (item.includes('Sword') || item.includes('Staff')) return 'weapon';
    if (item.includes('Armor') || item.includes('Shield')) return 'armor';
    return 'accessory';
  }

  getConsumableEffect(item) {
    const effects = {
      'Energy Drink': '+50 Energy',
      'Focus Potion': '+25 Intelligence for 1 hour',
      'Healing Salve': '+100 Health',
      'Speed Boost': '+30 Agility for 30 minutes',
      'Shield Scroll': '+50 Defense for 1 battle'
    };
    
    return effects[item] || 'Unknown effect';
  }

  async runAllGenerators() {
    console.log('🚀 Starting JSON Object File Generation...\n');
    console.log('=' .repeat(60));
    
    await this.initialize();
    
    const generators = [
      () => this.generateNFTMetadata(),
      () => this.generateBattleConfigurations(),
      () => this.generateTrainingSessions(),
      () => this.generateUserProfiles(),
      () => this.generateSystemConfigurations()
    ];
    
    for (const generator of generators) {
      await generator();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 JSON OBJECT GENERATION SUMMARY:');
    console.log('=' .repeat(60));
    
    this.generatedFiles.forEach((file, index) => {
      console.log(`✅ ${index + 1}. ${file.type}:`);
      console.log(`   📄 File: ${file.filename}`);
      console.log(`   📊 Objects: ${file.count}`);
      console.log('');
    });
    
    const totalObjects = this.generatedFiles.reduce((sum, file) => sum + file.count, 0);
    
    console.log('=' .repeat(60));
    console.log(`🎯 Total Generated Objects: ${totalObjects}`);
    console.log(`📁 Output Directory: ${this.outputDir}`);
    console.log('=' .repeat(60));
  }
}

// Run the generator
if (require.main === module) {
  const generator = new JSONObjectGenerator();
  generator.runAllGenerators().catch(console.error);
}

module.exports = JSONObjectGenerator;
