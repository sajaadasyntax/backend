#!/bin/bash

# WaterGB Backend Deployment Script
# This script handles the complete deployment process including Prisma setup

set -e  # Exit on any error

echo "🌊 WaterGB Backend Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 is installed
check_pm2() {
    print_status "Checking PM2 installation..."
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            print_success "PM2 installed successfully"
        else
            print_error "Failed to install PM2"
            exit 1
        fi
    else
        print_success "PM2 is already installed"
    fi
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    else
        print_success "Node.js is installed: $(node --version)"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup Prisma
setup_prisma() {
    print_status "Setting up Prisma..."
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    if [ $? -eq 0 ]; then
        print_success "Prisma client generated successfully"
    else
        print_error "Failed to generate Prisma client"
        exit 1
    fi
    
    # Push database schema
    print_status "Pushing database schema..."
    npx prisma db push
    if [ $? -eq 0 ]; then
        print_success "Database schema pushed successfully"
    else
        print_error "Failed to push database schema"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs pids
    print_success "Directories created successfully"
}

# Stop existing PM2 processes
stop_existing() {
    print_status "Stopping existing PM2 processes..."
    pm2 stop watergb-backend 2>/dev/null || true
    pm2 delete watergb-backend 2>/dev/null || true
    print_success "Existing processes stopped"
}

# Start the application with PM2
start_application() {
    print_status "Starting application with PM2..."
    pm2 start ecosystem.config.js
    if [ $? -eq 0 ]; then
        print_success "Application started successfully"
    else
        print_error "Failed to start application"
        exit 1
    fi
}

# Setup PM2 startup script
setup_startup() {
    print_status "Setting up PM2 startup script..."
    pm2 startup
    pm2 save
    print_success "PM2 startup script configured"
}

# Show application status
show_status() {
    print_status "Application Status:"
    pm2 status
}

# Main deployment function
deploy() {
    echo
    print_status "Starting deployment process..."
    
    check_node
    check_pm2
    install_dependencies
    create_directories
    setup_prisma
    stop_existing
    start_application
    setup_startup
    show_status
    
    echo
    print_success "🎉 Deployment completed successfully!"
    echo
    print_status "Useful commands:"
    echo "  pm2 status                    - Check application status"
    echo "  pm2 logs watergb-backend      - View application logs"
    echo "  pm2 restart watergb-backend   - Restart application"
    echo "  pm2 stop watergb-backend      - Stop application"
    echo "  pm2 monit                     - Open monitoring interface"
    echo
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        print_status "Starting application..."
        pm2 start ecosystem.config.js
        show_status
        ;;
    "stop")
        print_status "Stopping application..."
        pm2 stop watergb-backend
        ;;
    "restart")
        print_status "Restarting application..."
        pm2 restart watergb-backend
        show_status
        ;;
    "reload")
        print_status "Reloading application..."
        pm2 reload watergb-backend
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        print_status "Showing application logs..."
        pm2 logs watergb-backend
        ;;
    "monitor")
        print_status "Opening PM2 monitoring interface..."
        pm2 monit
        ;;
    "setup")
        setup_prisma
        ;;
    "help")
        echo "WaterGB Backend Deployment Script"
        echo
        echo "Usage: ./deploy.sh [command]"
        echo
        echo "Commands:"
        echo "  deploy    - Complete deployment process (default)"
        echo "  start     - Start the application"
        echo "  stop      - Stop the application"
        echo "  restart   - Restart the application"
        echo "  reload    - Reload the application (zero-downtime)"
        echo "  status    - Show application status"
        echo "  logs      - Show application logs"
        echo "  monitor   - Open PM2 monitoring interface"
        echo "  setup     - Setup Prisma only"
        echo "  help      - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use './deploy.sh help' for available commands"
        exit 1
        ;;
esac
