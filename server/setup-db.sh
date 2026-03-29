#!/bin/bash

# Astral Sharks Database Setup Script

echo "🦈 Setting up Astral Sharks Database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Database configuration
DB_NAME="astral_sharks"
DB_USER="parthtiwaskar"  # Use current user for macOS Homebrew PostgreSQL

echo "📊 Creating database '$DB_NAME'..."

# Create database
createdb -U $DB_USER $DB_NAME 2>/dev/null || echo "Database '$DB_NAME' already exists"

echo "🔧 Setting up database schema..."

# Run the schema setup
psql -U $DB_USER -d $DB_NAME -f database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
else
    echo "❌ Database setup failed!"
    exit 1
fi

echo "📝 Creating .env file..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created from .env.example"
    echo "🔧 Please update .env with your database configuration"
else
    echo "⚠️  .env file already exists"
fi

echo "🎉 Database setup complete!"
echo "📖 Next steps:"
echo "   1. Update .env file with your database credentials"
echo "   2. Run 'npm run dev' to start the server"
echo "   3. Test the API at http://localhost:3000/health"
