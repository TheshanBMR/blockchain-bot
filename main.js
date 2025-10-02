// === ENHANCED CONFIGURATION ===
var config = {
    currency_name: "BlockCoin",
    currency_ticker: "BLC", 
    referral_bonus: 10.0,
    network_fee: 0.1,
    payment_channel: "@TBlockchainSystem",
    admin_ids: [6467811571], // Replace with your Telegram ID
    min_withdrawal: 1.0,
    max_withdrawal: 1000.0
};

// === ENHANCED DATABASE ===
function initDatabase() {
    if (!Bot.getProperty("db_initialized")) {
        var defaultData = {
            users: {},
            transactions: [],
            referral_bonuses: [],
            fraud_logs: [],
            config: config,
            last_block: 1000, // Start from block 1000 for realism
            pending_transactions: [],
            system_balance: 10000.0, // System reserve
            admin_logs: []
        };
        Bot.setProperty("bot_data", defaultData);
        Bot.setProperty("db_initialized", true);
    }
}

// === REAL BLOCKCHAIN SIMULATION ===
function generateBlockHash(blockNumber, previousHash, transactions) {
    var data = blockNumber + previousHash + JSON.stringify(transactions) + Date.now();
    return "0x" + Api.sha256(data).substring(0, 64);
}

function mineBlock() {
    var data = Bot.getProperty("bot_data");
    var pendingTxs = data.pending_transactions;
    
    if (pendingTxs.length === 0) return null;
    
    data.last_block += 1;
    var previousHash = data.last_block === 1001 ? "0x0000000000000000000000000000000000000000000000000000000000000000" : 
                      data.transactions[data.transactions.length - 1].block_hash;
    
    var blockHash = generateBlockHash(data.last_block, previousHash, pendingTxs);
    
    // Add block reward (mining simulation)
    var blockRewardTx = {
        tx_hash: "0x" + Api.sha256(blockHash + "reward").substring(0, 64),
        block_number: data.last_block,
        block_hash: blockHash,
        sender_address: "NETWORK_REWARD",
        receiver_address: "SYSTEM_RESERVE",
        amount: 5.0, // Block reward
        fee: 0.0,
        timestamp: new Date().toISOString(),
        status: "confirmed",
        type: "block_reward",
        confirmations: 6
    };
    
    // Process all pending transactions
    for (var i = 0; i < pendingTxs.length; i++) {
        pendingTxs[i].block_number = data.last_block;
        pendingTxs[i].block_hash = blockHash;
        pendingTxs[i].status = "confirmed";
        pendingTxs[i].confirmations = 1;
        pendingTxs[i].timestamp = new Date().toISOString();
        
        data.transactions.push(pendingTxs[i]);
    }
    
    data.transactions.push(blockRewardTx);
    data.system_balance += 5.0; // Add block reward to system
    data.pending_transactions = [];
    
    Bot.setProperty("bot_data", data);
    
    return {
        block_number: data.last_block,
        block_hash: blockHash,
        transaction_count: pendingTxs.length,
        timestamp: new Date().toISOString()
    };
}

function createRealTransaction(senderAddress, receiverAddress, amount) {
    var data = Bot.getProperty("bot_data");
    var sender = null;
    var receiver = null;
    
    // Find users
    for (var userId in data.users) {
        var user = data.users[userId];
        if (user.receive_address === senderAddress) sender = user;
        if (user.receive_address === receiverAddress) receiver = user;
    }
    
    if (!sender || !receiver) {
        return {success: false, error: "Invalid addresses"};
    }
    
    var totalDeduction = amount + config.network_fee;
    
    if (sender.balance < totalDeduction) {
        return {success: false, error: "Insufficient balance"};
    }
    
    // Create pending transaction
    var txHash = "0x" + Api.sha256(senderAddress + receiverAddress + amount + Date.now()).substring(0, 64);
    
    var transaction = {
        tx_hash: txHash,
        block_number: null, // Will be set when mined
        block_hash: null,
        sender_address: senderAddress,
        receiver_address: receiverAddress,
        amount: amount,
        fee: config.network_fee,
        timestamp: new Date().toISOString(),
        status: "pending",
        type: "transfer",
        confirmations: 0
    };
    
    // Update balances immediately (simplified)
    sender.balance -= totalDeduction;
    receiver.balance += amount;
    data.system_balance += config.network_fee; // Collect fee
    
    data.pending_transactions.push(transaction);
    
    // Mine block if we have enough transactions (simulate mining)
    if (data.pending_transactions.length >= 1) {
        var minedBlock = mineBlock();
        if (minedBlock) {
            transaction.block_number = minedBlock.block_number;
            transaction.block_hash = minedBlock.block_hash;
            transaction.status = "confirmed";
            transaction.confirmations = 1;
        }
    }
    
    Bot.setProperty("bot_data", data);
    
    return {
        success: true,
        transaction: transaction,
        block: transaction.block_number,
        hash: txHash
    };
}

// === COMPLETE ADMIN PANEL ===
function handleAdminCommand(message) {
    var user = message.chat;
    
    if (config.admin_ids.indexOf(user.id) === -1) {
        Bot.sendMessage("❌ Access denied");
        return;
    }
    
    var keyboard = [
        [
            {text: "📊 System Stats", callback_data: "admin_stats"},
            {text: "👥 User Management", callback_data: "admin_users"}
        ],
        [
            {text: "📢 Broadcast Message", callback_data: "admin_broadcast"},
            {text: "💰 Manage Balance", callback_data: "admin_balance"}
        ],
        [
            {text: "⚠️ Fraud Logs", callback_data: "admin_fraud"},
            {text: "📈 Transaction Logs", callback_data: "admin_transactions"}
        ],
        [
            {text: "⚙️ System Config", callback_data: "admin_config"},
            {text: "🔄 Mining", callback_data: "admin_mining"}
        ]
    ];
    
    Bot.sendMessage(
        "🔧 **Advanced Admin Panel**\n\nSelect an option:",
        {keyboard: keyboard}
    );
    
    // Log admin access
    logAdminAction(user.id, "accessed_admin_panel", "");
}

function showAdminStats(user) {
    var data = Bot.getProperty("bot_data");
    var totalUsers = Object.keys(data.users).length;
    var totalTxs = data.transactions.length;
    var pendingTxs = data.pending_transactions.length;
    
    var totalVolume = 0;
    var todayVolume = 0;
    var today = new Date().toDateString();
    
    for (var i = 0; i < data.transactions.length; i++) {
        var tx = data.transactions[i];
        totalVolume += tx.amount;
        if (new Date(tx.timestamp).toDateString() === today) {
            todayVolume += tx.amount;
        }
    }
    
    var activeUsers = 0;
    var bannedUsers = 0;
    var newToday = 0;
    
    for (var userId in data.users) {
        var userData = data.users[userId];
        if (userData.banned) {
            bannedUsers++;
        }
        if (new Date(userData.join_date).toDateString() === today) {
            newToday++;
        }
        if (userData.balance > 0) {
            activeUsers++;
        }
    }
    
    var statsText = `
📊 **System Statistics**

👥 **Users**
• Total Users: ${totalUsers}
• Active Users: ${activeUsers}
• Banned Users: ${bannedUsers}
• New Today: ${newToday}

💸 **Transactions** 
• Total TXs: ${totalTxs}
• Pending TXs: ${pendingTxs}
• Total Volume: ${totalVolume.toFixed(2)} ${config.currency_ticker}
• Today's Volume: ${todayVolume.toFixed(2)} ${config.currency_ticker}

⛓️ **Blockchain**
• Current Block: #${data.last_block}
• System Reserve: ${data.system_balance.toFixed(2)} ${config.currency_ticker}
• Network Fees: ${(data.system_balance - 10000).toFixed(2)} ${config.currency_ticker}

⚠️ **Security**
• Fraud Logs: ${data.fraud_logs.length}
• Admin Actions: ${data.admin_logs.length}
    `;
    
    var keyboard = [
        [{text: "🔄 Refresh", callback_data: "admin_stats"}],
        [{text: "📤 Export Data", callback_data: "admin_export"}],
        [{text: "← Back to Main", callback_data: "admin_main"}]
    ];
    
    Bot.sendMessage(statsText, {keyboard: keyboard});
}

function showUserManagement(user) {
    var data = Bot.getProperty("bot_data");
    var users = data.users;
    var userList = "👥 **User Management**\n\n";
    var count = 0;
    
    for (var userId in users) {
        if (count < 20) { // Show first 20 users
            var u = users[userId];
            userList += `👤 ${u.first_name} (ID: ${u.user_id})\n`;
            userList += `💰 Balance: ${u.balance.toFixed(2)} ${config.currency_ticker}\n`;
            userList += `🔄 Ref Code: ${u.referral_code}\n`;
            userList += `🚫 ${u.banned ? "BANNED" : "Active"}\n`;
            userList += `────────────────────\n`;
            count++;
        }
    }
    
    userList += `\nTotal Users: ${Object.keys(users).length}`;
    
    var keyboard = [
        [
            {text: "👁️ View User", callback_data: "admin_viewuser"},
            {text: "💰 Add Balance", callback_data: "admin_addbalance"}
        ],
        [
            {text: "🚫 Ban User", callback_data: "admin_banuser"},
            {text: "✅ Unban User", callback_data: "admin_unbanuser"}
        ],
        [
            {text: "📧 Message User", callback_data: "admin_messageuser"},
            {text: "📋 User List", callback_data: "admin_userlist"}
        ],
        [{text: "← Back to Main", callback_data: "admin_main"}]
    ];
    
    Bot.sendMessage(userList, {keyboard: keyboard});
}

function startBroadcast(message) {
    var user = message.chat;
    Bot.sendMessage("📢 **Broadcast Message**\n\nPlease send the message you want to broadcast to all users:");
    Bot.setProperty("admin_broadcast_mode_" + user.id, true);
    logAdminAction(user.id, "started_broadcast", "");
}

function sendBroadcastToAllUsers(messageText, adminId) {
    var data = Bot.getProperty("bot_data");
    var users = data.users;
    var successCount = 0;
    var failCount = 0;
    
    for (var userId in users) {
        try {
            Bot.sendMessageToChatWithId(
                parseInt(userId),
                "📢 **Broadcast from Admin:**\n\n" + messageText + 
                "\n\n───\n*This is an official broadcast*"
            );
            successCount++;
        } catch (e) {
            failCount++;
        }
    }
    
    Bot.sendMessage(
        `📢 **Broadcast Completed**\n\n` +
        `✅ Success: ${successCount} users\n` +
        `❌ Failed: ${failCount} users\n` +
        `📊 Total: ${successCount + failCount} users`
    );
    
    logAdminAction(adminId, "sent_broadcast", "Success: " + successCount + ", Failed: " + failCount);
    Bot.setProperty("admin_broadcast_mode_" + adminId, false);
}

function startAddBalance(message) {
    var user = message.chat;
    Bot.sendMessage(
        "💰 **Add Balance to User**\n\n" +
        "Please send user ID and amount in format:\n" +
        "`user_id amount`\n\n" +
        "Example: `123456789 100.5`"
    );
    Bot.setProperty("admin_addbalance_mode_" + user.id, true);
    logAdminAction(user.id, "started_add_balance", "");
}

function addUserBalance(adminId, targetUserId, amount) {
    var data = Bot.getProperty("bot_data");
    
    if (!data.users[targetUserId]) {
        Bot.sendMessage("❌ User not found");
        return;
    }
    
    data.users[targetUserId].balance += parseFloat(amount);
    Bot.setProperty("bot_data", data);
    
    // Notify user
    try {
        Bot.sendMessageToChatWithId(
            parseInt(targetUserId),
            `💰 **Admin Credit**\n\n` +
            `You received ${amount} ${config.currency_ticker} from administrator.\n` +
            `New balance: ${data.users[targetUserId].balance.toFixed(2)} ${config.currency_ticker}`
        );
    } catch (e) {
        // User might have blocked bot
    }
    
    Bot.sendMessage(`✅ Added ${amount} ${config.currency_ticker} to user ${targetUserId}`);
    logAdminAction(adminId, "added_balance", "User: " + targetUserId + ", Amount: " + amount);
    Bot.setProperty("admin_addbalance_mode_" + adminId, false);
}

function banUser(adminId, targetUserId) {
    var data = Bot.getProperty("bot_data");
    
    if (!data.users[targetUserId]) {
        Bot.sendMessage("❌ User not found");
        return;
    }
    
    data.users[targetUserId].banned = true;
    Bot.setProperty("bot_data", data);
    
    // Notify user
    try {
        Bot.sendMessageToChatWithId(
            parseInt(targetUserId),
            "🚫 **Account Banned**\n\nYour account has been banned by administrator."
        );
    } catch (e) {
        // User might have blocked bot
    }
    
    Bot.sendMessage(`✅ User ${targetUserId} has been banned`);
    logAdminAction(adminId, "banned_user", "User: " + targetUserId);
}

function showFraudLogs(user) {
    var data = Bot.getProperty("bot_data");
    var logs = data.fraud_logs;
    var logText = "⚠️ **Fraud Detection Logs**\n\n";
    
    if (logs.length === 0) {
        logText += "No fraud attempts detected.";
    } else {
        for (var i = Math.max(0, logs.length - 10); i < logs.length; i++) {
            var log = logs[i];
            logText += `🕒 ${new Date(log.timestamp).toLocaleString()}\n`;
            logText += `👤 User: ${log.user_id}\n`;
            logText += `🔍 Type: ${log.activity_type}\n`;
            logText += `📝 Details: ${log.details}\n`;
            logText += `────────────────────\n`;
        }
    }
    
    var keyboard = [
        [{text: "🔄 Refresh", callback_data: "admin_fraud"}],
        [{text: "🧹 Clear Logs", callback_data: "admin_clearfraud"}],
        [{text: "← Back to Main", callback_data: "admin_main"}]
    ];
    
    Bot.sendMessage(logText, {keyboard: keyboard});
}

function showTransactionLogs(user) {
    var data = Bot.getProperty("bot_data");
    var txs = data.transactions;
    var txText = "📈 **Recent Transactions**\n\n";
    
    for (var i = Math.max(0, txs.length - 5); i < txs.length; i++) {
        var tx = txs[i];
        txText += `⛓️ Block: #${tx.block_number}\n`;
        txText += `🆔 Hash: ${tx.tx_hash.substring(0, 16)}...\n`;
        txText += `📤 From: ${tx.sender_address.substring(0, 8)}...\n`;
        txText += `📥 To: ${tx.receiver_address.substring(0, 8)}...\n`;
        txText += `💎 Amount: ${tx.amount} ${config.currency_ticker}\n`;
        txText += `🕒 ${new Date(tx.timestamp).toLocaleString()}\n`;
        txText += `────────────────────\n`;
    }
    
    var keyboard = [
        [{text: "🔄 Refresh", callback_data: "admin_transactions"}],
        [{text: "📤 Export TXs", callback_data: "admin_exporttxs"}],
        [{text: "← Back to Main", callback_data: "admin_main"}]
    ];
    
    Bot.sendMessage(txText, {keyboard: keyboard});
}

function logAdminAction(adminId, action, details) {
    var data = Bot.getProperty("bot_data");
    data.admin_logs.push({
        admin_id: adminId,
        action: action,
        details: details,
        timestamp: new Date().toISOString(),
        ip: "admin_panel"
    });
    Bot.setProperty("bot_data", data);
}

// === ENHANCED MESSAGE HANDLER WITH ADMIN MODES ===
function onMessage(message) {
    var text = message.text;
    var user = message.chat;
    
    if (!text) return;
    
    // Check for admin modes first
    if (Bot.getProperty("admin_broadcast_mode_" + user.id)) {
        sendBroadcastToAllUsers(text, user.id);
        return;
    }
    
    if (Bot.getProperty("admin_addbalance_mode_" + user.id)) {
        var parts = text.split(" ");
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            addUserBalance(user.id, parts[0], parseFloat(parts[1]));
        } else {
            Bot.sendMessage("❌ Invalid format. Use: `user_id amount`");
        }
        return;
    }
    
    // Normal command handling (same as before, but use createRealTransaction)
    if (text.startsWith("/send")) {
        handleSendCommand(message);
    }
    // ... other command handlers remain the same but use createRealTransaction
}

// === ENHANCED CALLBACK HANDLER ===
function onCallbackQuery(callbackQuery) {
    var data = callbackQuery.data;
    var user = callbackQuery.message.chat;
    
    Bot.answerCallbackQuery({callback_query_id: callbackQuery.id});
    
    switch(data) {
        case "admin_main":
            handleAdminCommand({chat: user, text: "/admin"});
            break;
        case "admin_stats":
            showAdminStats(user);
            break;
        case "admin_users":
            showUserManagement(user);
            break;
        case "admin_broadcast":
            startBroadcast({chat: user, text: ""});
            break;
        case "admin_balance":
            startAddBalance({chat: user, text: ""});
            break;
        case "admin_fraud":
            showFraudLogs(user);
            break;
        case "admin_transactions":
            showTransactionLogs(user);
            break;
        case "admin_banuser":
            Bot.sendMessage("Send user ID to ban:");
            Bot.setProperty("admin_ban_mode_" + user.id, true);
            break;
        case "admin_export":
            exportData(user);
            break;
        // ... other admin callbacks
    }
}

function exportData(user) {
    var data = Bot.getProperty("bot_data");
    var exportText = "📊 **Data Export**\n\n";
    exportText += "Users: " + Object.keys(data.users).length + "\n";
    exportText += "Transactions: " + data.transactions.length + "\n";
    exportText += "Blocks: " + data.last_block + "\n";
    exportText += "System Balance: " + data.system_balance.toFixed(2) + "\n";
    
    Bot.sendMessage(exportText);
    logAdminAction(user.id, "exported_data", "");
}

// === INITIALIZATION ===
function main() {
    initDatabase();
    // Auto-mine blocks every 10 minutes
    Bot.setInterval(function() {
        var data = Bot.getProperty("bot_data");
        if (data.pending_transactions.length > 0) {
            mineBlock();
        }
    }, 10 * 60 * 1000); // 10 minutes
}

main();