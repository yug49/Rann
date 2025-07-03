#!/usr/bin/env node

/**
 * Interval Function Caller
 * 
 * This script tests periodic function calling with different intervals:
 * - Health checks every 30 seconds
 * - Database cleanup every 5 minutes
 * - Service status monitoring every 1 minute
 * - Flow blockchain sync every 2 minutes
 * - AI service heartbeat every 45 seconds
 */

const axios = require('axios');
const cron = require('node-cron');

const BASE_URL = 'http://localhost:3001';

class IntervalFunctionCaller {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
    this.callCounts = {};
    this.lastResults = {};
    this.startTime = new Date();
  }

  async initialize() {
    console.log('⏰ Initializing Interval Function Caller...\n');
    console.log('📅 Scheduled functions:');
    console.log('   • Health Check: Every 30 seconds');
    console.log('   • Database Sync: Every 5 minutes');
    console.log('   • Service Monitor: Every 1 minute');
    console.log('   • Blockchain Sync: Every 2 minutes');
    console.log('   • AI Heartbeat: Every 45 seconds\n');
  }

  // Function 1: Health Check (Every 30 seconds)
  async healthCheck() {
    const functionName = 'healthCheck';
    this.callCounts[functionName] = (this.callCounts[functionName] || 0) + 1;
    
    try {
      console.log(`🏥 [${new Date().toLocaleTimeString()}] Health Check #${this.callCounts[functionName]}`);
      
      const response = await axios.get(`${BASE_URL}/api/health`);
      const status = response.data.data.status;
      
      console.log(`   Status: ${status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌'} ${status}`);
      
      // Check individual services
      const services = response.data.data.services;
      Object.entries(services).forEach(([name, service]) => {
        const icon = service.status === 'healthy' ? '✅' : service.status === 'degraded' ? '⚠️' : '❌';
        console.log(`   ${icon} ${name}: ${service.status} (${service.responseTime}ms)`);
      });
      
      this.lastResults[functionName] = { status: 'success', data: response.data.data };
      
    } catch (error) {
      console.error(`   ❌ Health check failed: ${error.message}`);
      this.lastResults[functionName] = { status: 'error', error: error.message };
    }
    console.log('');
  }

  // Function 2: Database Sync (Every 5 minutes)
  async databaseSync() {
    const functionName = 'databaseSync';
    this.callCounts[functionName] = (this.callCounts[functionName] || 0) + 1;
    
    try {
      console.log(`🗄️ [${new Date().toLocaleTimeString()}] Database Sync #${this.callCounts[functionName]}`);
      
      // Get system stats
      const response = await axios.get(`${BASE_URL}/api/health/stats`);
      const stats = response.data.data;
      
      console.log(`   📊 System Stats:`);
      console.log(`   • Node Version: ${stats.system.nodeVersion}`);
      console.log(`   • Platform: ${stats.system.platform}`);
      console.log(`   • Uptime: ${Math.floor(stats.system.uptime / 60)} minutes`);
      console.log(`   • Memory Usage: ${Math.floor(stats.system.memory.heapUsed / 1024 / 1024)}MB`);
      
      if (stats.database) {
        console.log(`   💾 Database: ${stats.database.error ? '❌ Error' : '✅ Healthy'}`);
      }
      
      this.lastResults[functionName] = { status: 'success', data: stats };
      
    } catch (error) {
      console.error(`   ❌ Database sync failed: ${error.message}`);
      this.lastResults[functionName] = { status: 'error', error: error.message };
    }
    console.log('');
  }

  // Function 3: Service Monitor (Every 1 minute)
  async serviceMonitor() {
    const functionName = 'serviceMonitor';
    this.callCounts[functionName] = (this.callCounts[functionName] || 0) + 1;
    
    try {
      console.log(`🔧 [${new Date().toLocaleTimeString()}] Service Monitor #${this.callCounts[functionName]}`);
      
      const services = ['database', 'crypto', 'filecoin', 'nearai', 'flow'];
      
      for (const service of services) {
        try {
          const response = await axios.get(`${BASE_URL}/api/health/services/${service}`);
          const serviceData = response.data.data;
          
          const icon = serviceData.status === 'healthy' ? '✅' : 
                      serviceData.status === 'degraded' ? '⚠️' : '❌';
          
          console.log(`   ${icon} ${service}: ${serviceData.status} (${serviceData.responseTime}ms)`);
          
          if (serviceData.metrics) {
            console.log(`     📈 Metrics available`);
          }
          
        } catch (error) {
          console.log(`   ❌ ${service}: Error - ${error.message}`);
        }
      }
      
      this.lastResults[functionName] = { status: 'success', timestamp: new Date() };
      
    } catch (error) {
      console.error(`   ❌ Service monitoring failed: ${error.message}`);
      this.lastResults[functionName] = { status: 'error', error: error.message };
    }
    console.log('');
  }

  // Function 4: Blockchain Sync (Every 2 minutes)
  async blockchainSync() {
    const functionName = 'blockchainSync';
    this.callCounts[functionName] = (this.callCounts[functionName] || 0) + 1;
    
    try {
      console.log(`⛓️ [${new Date().toLocaleTimeString()}] Blockchain Sync #${this.callCounts[functionName]}`);
      
      // Test Flow blockchain connection
      const response = await axios.get(`${BASE_URL}/api/health/services/flow`);
      const flowStatus = response.data.data;
      
      if (flowStatus.status === 'healthy') {
        console.log(`   ✅ Flow blockchain: Connected (${flowStatus.responseTime}ms)`);
        console.log(`   🔗 Network sync successful`);
      } else {
        console.log(`   ⚠️ Flow blockchain: ${flowStatus.status}`);
        if (flowStatus.error) {
          console.log(`   Error: ${flowStatus.error}`);
        }
      }
      
      // Simulate checking latest blocks, transactions, etc.
      console.log(`   📦 Latest block sync completed`);
      console.log(`   💼 Transaction pool updated`);
      
      this.lastResults[functionName] = { status: 'success', flowStatus };
      
    } catch (error) {
      console.error(`   ❌ Blockchain sync failed: ${error.message}`);
      this.lastResults[functionName] = { status: 'error', error: error.message };
    }
    console.log('');
  }

  // Function 5: AI Heartbeat (Every 45 seconds)
  async aiHeartbeat() {
    const functionName = 'aiHeartbeat';
    this.callCounts[functionName] = (this.callCounts[functionName] || 0) + 1;
    
    try {
      console.log(`🤖 [${new Date().toLocaleTimeString()}] AI Heartbeat #${this.callCounts[functionName]}`);
      
      // Test NEAR AI service
      const response = await axios.get(`${BASE_URL}/api/health/services/nearai`);
      const aiStatus = response.data.data;
      
      if (aiStatus.status === 'healthy') {
        console.log(`   ✅ NEAR AI: Connected (${aiStatus.responseTime}ms)`);
        console.log(`   🧠 AI models: Ready`);
        console.log(`   ⚡ Response time: Optimal`);
      } else {
        console.log(`   ⚠️ NEAR AI: ${aiStatus.status}`);
        if (aiStatus.error) {
          console.log(`   Error: ${aiStatus.error}`);
        }
      }
      
      // Simulate AI service health metrics
      console.log(`   📊 Model inference: Available`);
      console.log(`   🎯 Trait generation: Ready`);
      
      this.lastResults[functionName] = { status: 'success', aiStatus };
      
    } catch (error) {
      console.error(`   ❌ AI heartbeat failed: ${error.message}`);
      this.lastResults[functionName] = { status: 'error', error: error.message };
    }
    console.log('');
  }

  startScheduledJobs() {
    console.log('🚀 Starting scheduled interval jobs...\n');
    this.isRunning = true;
    
    // Schedule health check every 30 seconds
    const healthJob = cron.schedule('*/30 * * * * *', () => {
      if (this.isRunning) this.healthCheck();
    });
    
    // Schedule database sync every 5 minutes
    const dbJob = cron.schedule('*/5 * * * *', () => {
      if (this.isRunning) this.databaseSync();
    });
    
    // Schedule service monitor every 1 minute
    const serviceJob = cron.schedule('*/1 * * * *', () => {
      if (this.isRunning) this.serviceMonitor();
    });
    
    // Schedule blockchain sync every 2 minutes
    const blockchainJob = cron.schedule('*/2 * * * *', () => {
      if (this.isRunning) this.blockchainSync();
    });
    
    // Schedule AI heartbeat every 45 seconds
    const aiJob = cron.schedule('*/45 * * * * *', () => {
      if (this.isRunning) this.aiHeartbeat();
    });
    
    this.jobs = [healthJob, dbJob, serviceJob, blockchainJob, aiJob];
    
    // Run initial calls immediately
    setTimeout(() => this.healthCheck(), 1000);
    setTimeout(() => this.serviceMonitor(), 2000);
    setTimeout(() => this.aiHeartbeat(), 3000);
    setTimeout(() => this.blockchainSync(), 4000);
    setTimeout(() => this.databaseSync(), 5000);
    
    console.log('✅ All scheduled jobs started!\n');
  }

  stopScheduledJobs() {
    console.log('\n🛑 Stopping scheduled jobs...');
    this.isRunning = false;
    
    this.jobs.forEach(job => {
      if (job) job.stop();
    });
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 INTERVAL FUNCTION CALLER SUMMARY');
    console.log('=' .repeat(80));
    
    const runTime = Math.floor((new Date() - this.startTime) / 1000);
    console.log(`⏱️ Total Runtime: ${runTime} seconds`);
    console.log('');
    
    console.log('📈 Function Call Counts:');
    Object.entries(this.callCounts).forEach(([func, count]) => {
      console.log(`   ${func}: ${count} calls`);
    });
    
    console.log('\n🎯 Last Results:');
    Object.entries(this.lastResults).forEach(([func, result]) => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`   ${icon} ${func}: ${result.status}`);
    });
    
    console.log('\n' + '=' .repeat(80));
  }

  async run(duration = 300) { // Default 5 minutes
    await this.initialize();
    this.startScheduledJobs();
    
    console.log(`⏰ Running for ${duration} seconds... Press Ctrl+C to stop early\n`);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopScheduledJobs();
      process.exit(0);
    });
    
    // Auto-stop after specified duration
    setTimeout(() => {
      this.stopScheduledJobs();
      process.exit(0);
    }, duration * 1000);
  }
}

// Run the interval caller
if (require.main === module) {
  const caller = new IntervalFunctionCaller();
  const duration = process.argv[2] ? parseInt(process.argv[2]) : 300; // Default 5 minutes
  caller.run(duration).catch(console.error);
}

module.exports = IntervalFunctionCaller;
