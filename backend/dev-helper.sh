#!/bin/bash

# 🔧 Development Workflow Helper
# Comprehensive development commands and status

echo "🎮 RANN BACKEND - DEVELOPMENT HELPER"
echo "===================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_menu() {
    echo ""
    echo -e "${CYAN}📋 Available Commands:${NC}"
    echo "1. 🚀 Start Production Server"
    echo "2. 💻 Start Development Server"
    echo "3. 🧪 Run API Tests"
    echo "4. 🔍 Quick Health Check"
    echo "5. 📊 Full Verification"
    echo "6. 🗄️  Database Management"
    echo "7. 📦 Package Management"
    echo "8. 🧹 Clean & Reset"
    echo "9. 📖 Show Logs"
    echo "0. ❌ Exit"
    echo ""
}

start_production() {
    echo -e "${GREEN}🚀 Starting Production Server...${NC}"
    echo "Server will be available at: http://localhost:3001"
    echo "Press Ctrl+C to stop"
    echo ""
    npm start
}

start_development() {
    echo -e "${YELLOW}💻 Starting Development Server...${NC}"
    echo "Development server with hot reload"
    echo "Server will be available at: http://localhost:3001"
    echo "Press Ctrl+C to stop"
    echo ""
    if [ -f "src/server.ts" ]; then
        npm run dev
    else
        echo "TypeScript development server not available. Using production server..."
        npm start
    fi
}

run_tests() {
    echo -e "${BLUE}🧪 Running API Tests...${NC}"
    if [ -f "test-api.sh" ]; then
        chmod +x test-api.sh
        ./test-api.sh
    else
        echo "API test script not found. Running basic test..."
        chmod +x final-test.sh
        ./final-test.sh
    fi
}

quick_check() {
    echo -e "${CYAN}🔍 Quick Health Check...${NC}"
    if [ -f "quick-check.sh" ]; then
        chmod +x quick-check.sh
        ./quick-check.sh
    else
        echo "Quick check script not found. Running basic verification..."
        node -e "console.log('Node.js is working')"
        [ -f "server-production.js" ] && echo "✅ Production server found" || echo "❌ Production server missing"
    fi
}

full_verification() {
    echo -e "${BLUE}📊 Running Full Verification...${NC}"
    if [ -f "verify-setup.sh" ]; then
        chmod +x verify-setup.sh
        ./verify-setup.sh
    else
        echo "Full verification script not found."
    fi
}

database_menu() {
    echo ""
    echo -e "${CYAN}🗄️ Database Management:${NC}"
    echo "1. Open Prisma Studio (GUI)"
    echo "2. Generate Prisma Client"
    echo "3. Run Migrations"
    echo "4. Reset Database"
    echo "5. Back to main menu"
    echo ""
    read -p "Choose option: " db_choice
    
    case $db_choice in
        1)
            echo "Opening Prisma Studio..."
            npm run db:studio
            ;;
        2)
            echo "Generating Prisma Client..."
            npm run db:generate
            ;;
        3)
            echo "Running database migrations..."
            npm run migrate
            ;;
        4)
            echo "⚠️  This will delete all data! Are you sure? (y/N)"
            read -p "" confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                rm -f prisma/dev.db
                npm run migrate
                echo "Database reset complete"
            fi
            ;;
        5)
            return
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

package_menu() {
    echo ""
    echo -e "${CYAN}📦 Package Management:${NC}"
    echo "1. Install dependencies"
    echo "2. Update dependencies"
    echo "3. Audit security"
    echo "4. Clean node_modules"
    echo "5. Show package info"
    echo "6. Back to main menu"
    echo ""
    read -p "Choose option: " pkg_choice
    
    case $pkg_choice in
        1)
            echo "Installing dependencies..."
            npm install
            ;;
        2)
            echo "Updating dependencies..."
            npm update
            ;;
        3)
            echo "Running security audit..."
            npm audit
            ;;
        4)
            echo "Cleaning node_modules..."
            rm -rf node_modules package-lock.json
            npm install
            ;;
        5)
            echo "Package information:"
            npm list --depth=0
            ;;
        6)
            return
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

clean_reset() {
    echo ""
    echo -e "${YELLOW}🧹 Clean & Reset Options:${NC}"
    echo "1. Clean logs"
    echo "2. Clean build files"
    echo "3. Reset database"
    echo "4. Full clean (everything)"
    echo "5. Back to main menu"
    echo ""
    read -p "Choose option: " clean_choice
    
    case $clean_choice in
        1)
            echo "Cleaning log files..."
            rm -f *.log
            echo "Logs cleaned"
            ;;
        2)
            echo "Cleaning build files..."
            rm -rf dist/
            mkdir -p dist
            echo "# Build output directory" > dist/.gitkeep
            echo "Build files cleaned"
            ;;
        3)
            echo "⚠️  This will delete all database data! Are you sure? (y/N)"
            read -p "" confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                rm -f prisma/dev.db prisma/dev.db-journal
                npm run migrate
                echo "Database reset"
            fi
            ;;
        4)
            echo "⚠️  This will clean everything! Are you sure? (y/N)"
            read -p "" confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                rm -f *.log
                rm -rf dist/ node_modules/
                rm -f prisma/dev.db prisma/dev.db-journal
                npm install
                npm run db:generate
                npm run migrate
                echo "Full clean complete"
            fi
            ;;
        5)
            return
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

show_logs() {
    echo ""
    echo -e "${CYAN}📖 Available Logs:${NC}"
    
    if [ -f "test_server.log" ]; then
        echo "test_server.log (last 20 lines):"
        tail -20 test_server.log
        echo ""
    fi
    
    if [ -f "api_test.log" ]; then
        echo "api_test.log (last 20 lines):"
        tail -20 api_test.log
        echo ""
    fi
    
    if [ -f "integration_test.log" ]; then
        echo "integration_test.log (last 20 lines):"
        tail -20 integration_test.log
        echo ""
    fi
    
    if [ ! -f "test_server.log" ] && [ ! -f "api_test.log" ] && [ ! -f "integration_test.log" ]; then
        echo "No log files found"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Choose an option: " choice
    
    case $choice in
        1)
            start_production
            ;;
        2)
            start_development
            ;;
        3)
            run_tests
            ;;
        4)
            quick_check
            ;;
        5)
            full_verification
            ;;
        6)
            database_menu
            ;;
        7)
            package_menu
            ;;
        8)
            clean_reset
            ;;
        9)
            show_logs
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
