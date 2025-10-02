# Blockchain Bot for Telegram

Advanced cryptocurrency bot with real blockchain simulation, referral system, and complete admin panel.

## Features

- 💰 Real blockchain transaction simulation
- 👥 Advanced referral system with bonuses
- 🎯 Customizable referral codes
- 🔧 Complete admin panel
- 📊 User management & analytics
- 📢 Broadcast messaging
- ⚠️ Fraud detection system

## Quick Start

1. Import this bot in [bots.business](https://bots.business/)
2. Update `admin_ids` in configuration with your Telegram ID
3. Set your bot username
4. Start using with `/start`

## Admin Commands

- `/admin` - Access admin panel
- User management (view, ban, message users)
- Balance control (add/remove funds)
- Broadcast messages to all users
- View transaction logs and analytics

## User Commands

- `/start` - Register and get wallet
- `/balance` - Check balance
- `/referral` - Get referral code
- `/send <address> <amount>` - Send coins
- `/transactions` - View history

## Configuration

Update these in `bot.json`:
- `admin_ids`: Your Telegram ID
- `currency_name`: Your coin name
- `payment_channel`: Your channel

## Support

For issues and questions, please open an issue on GitHub.
