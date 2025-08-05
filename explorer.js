// Addictive and informative Banncoin Explorer
let currentPage = 1;
let blocksPerPage = 33; // Show 33 blocks per page (Tesla number!)
let latestBlock = 0;
let founderWallet = "banncoin.org";
let lastBlockTime = 0;
let tickerInterval = null;
let viewCount = 0;
let blockStreak = 0;
let lastCheckedBlock = 0;

// Find the latest block efficiently
async function findLatestBlock() {
    console.log('🔍 Finding latest block...');
    
    // Start from a reasonable high number and work down
    for (let i = 8500; i >= 0; i--) {
        try {
            const response = await fetch(`block${i.toString().padStart(4, '0')}.json?v=${Date.now()}`);
            if (response.ok) {
                console.log(`✅ Found latest block: ${i}`);
                return i;
            }
        } catch (error) {
            // Continue searching
        }
        
        // Small delay every 100 blocks to avoid rate limiting
        if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    console.log('❌ No blocks found');
    return 0;
}

// Load and display the latest blocks
async function loadLatestBlocks() {
    const blocksList = document.getElementById('blocksList');
    blocksList.innerHTML = '<div class="loading">🔄 Fetching latest 33 blocks from miner...</div>';

    try {
        // Reset to page 1 when refreshing
        currentPage = 1;
        
        // Find the latest block (this will fetch fresh data)
        latestBlock = await findLatestBlock();
        
        if (latestBlock === 0) {
            blocksList.innerHTML = '<div class="error">No blocks found</div>';
            return;
        }
        
        updateStats();
        await displayBlocks();
        updatePagination();
        
        // Show success message briefly
        console.log(`✅ Fresh data loaded! Block #${latestBlock} is latest`);
        
        lastCheckedBlock = latestBlock;
        
        console.log('✅ Latest blocks loaded successfully');
    } catch (error) {
        console.error('❌ Error loading blocks:', error);
        blocksList.innerHTML = '<div class="error">Error loading blocks. Please try again.</div>';
    }
}

// Display blocks for current page
async function displayBlocks() {
    const blocksList = document.getElementById('blocksList');
    
    // Calculate which blocks to show for this page
    const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
    const endBlock = Math.max(0, startBlock - blocksPerPage + 1);

    console.log(`📄 Loading page ${currentPage}: blocks ${startBlock} to ${endBlock}`);

    let html = '';

    // Load the blocks for this page (newest first)
    for (let i = startBlock; i >= endBlock; i--) {
        const block = await loadBlock(i);
        if (block) {
            const blockNumber = i === 0 ? '#0 (Genesis)' : `#${i}`;
            const reward = block.amount || block.reward || '0';
            const rewardTo = block.reward_to || 'Unknown';
            const hash = block.hash || 'Unknown';
            const time = block.timestamp ? formatTime(block.timestamp) : 'Unknown';

            // Highlight founder wallet
            const isFounder = rewardTo === founderWallet;
            const founderClass = isFounder ? 'founder' : '';

            // Special handling for genesis block message
            let genesisMessage = '';
            if (i === 0 && block.message) {
                genesisMessage = `
                    <div style="grid-column: 1 / -1; text-align: center; margin-top: 10px; padding: 15px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1)); border: 2px solid #ffd700; border-radius: 10px; animation: genesisGlow 3s infinite;">
                        <div style="color: #ffd700; font-style: italic; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);">
                            ⚡ "${block.message}" ⚡
                        </div>
                        <div style="color: #ffed4e; font-size: 12px; margin-top: 5px; opacity: 0.8;">
                            — Nikola Tesla (Genesis Block)
                        </div>
                    </div>
                `;
            }

            // Add fun elements for special blocks
            let specialClass = '';
            let specialIcon = '';
            
            if (i === 0) {
                specialClass = 'genesis';
                specialIcon = '⚡';
            } else if (i % 1000 === 0) {
                specialClass = 'milestone';
                specialIcon = '🎯';
            } else if (i % 333 === 0) {
                specialClass = 'tesla';
                specialIcon = '⚡';
            } else if (i === latestBlock) {
                specialClass = 'latest';
                specialIcon = '🆕';
            }
            
            html += `
                <div class="block-item ${founderClass} ${specialClass}" onclick="showBlockDetails(${i}, '${hash}', '${rewardTo}', '${time}', '${reward}')" title="${specialIcon ? specialIcon + ' ' : ''}Block #${i}">
                    <div class="block-number">${specialIcon}${blockNumber}</div>
                    <div class="block-hash">${hash}</div>
                    <div class="block-reward">${reward} BNC</div>
                    <div class="block-miner">${rewardTo}</div>
                    <div class="block-time">${time}</div>
                    ${genesisMessage}
                </div>
            `;
        }
    }

    if (html === '') {
        blocksList.innerHTML = '<div class="no-results">No blocks found</div>';
    } else {
        blocksList.innerHTML = html;
    }

    console.log(`✅ Loaded page ${currentPage}: blocks ${startBlock}-${endBlock}`);
}

// Load a specific block
async function loadBlock(blockNumber) {
    try {
                        const response = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json?v=${Date.now()}&cb=${Math.random()}`);
        if (response.ok) {
            const block = await response.json();
            
            // Track latest block time for mining rate calculation
            if (blockNumber === latestBlock && block.timestamp) {
                lastBlockTime = new Date(block.timestamp).getTime();
            }
            
            return block;
        }
    } catch (error) {
        console.error(`Error loading block ${blockNumber}:`, error);
    }
    return null;
}

// Show comprehensive block details
async function showBlockDetails(blockNumber, hash, rewardTo, time, reward) {
    // Load the full block data
    const block = await loadBlock(blockNumber);
    if (block) {
        showBlockPopup(blockNumber, block);
    }
}

// Show comprehensive block popup
function showBlockPopup(blockNumber, block) {
    // Remove existing popup
    const existingPopup = document.getElementById('blockPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Format timestamp
    const timestamp = block.timestamp ? new Date(block.timestamp).toLocaleString() : 'Unknown';
    const exactTimestamp = block.timestamp || 'Unknown';
    
    // Get block data
    const height = block.height || block.index || blockNumber;
    const difficulty = block.difficulty || 'Unknown';
    const nonce = block.nonce || 'Unknown';
    const prevHash = block.prev_hash || block.previous_hash || 'Unknown';
    const network = block.network || 'bannnet';
    const message = block.message || '';
    const transactions = block.transactions || [];
    
    const popup = document.createElement('div');
    popup.id = 'blockPopup';
    popup.innerHTML = `
        <div class="block-popup-overlay" onclick="closeBlockPopup()"></div>
        <div class="block-popup-content">
            <div class="block-popup-header">
                <h3>Block #${height}</h3>
                <button onclick="closeBlockPopup()" class="close-btn">✕</button>
            </div>
            <div class="block-popup-body">
                <div class="detail-section">
                    <h4>📊 Block Info</h4>
                    <div class="detail-row">
                        <strong>Height:</strong> <span>${height}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Difficulty:</strong> <span>${difficulty}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Nonce:</strong> <span>${nonce}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Network:</strong> <span>${network}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>💰 Reward Info</h4>
                    <div class="detail-row">
                        <strong>Reward:</strong> <span>${block.reward || block.amount || 333} BNC</span>
                    </div>
                    <div class="detail-row">
                        <strong>Miner:</strong> <span class="wallet-text">${block.reward_to || block.rewardTo || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>🔗 Hash Info</h4>
                    <div class="detail-row">
                        <strong>Hash:</strong> <span class="hash-text">${block.hash}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Previous Hash:</strong> <span class="hash-text">${prevHash}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>⏰ Timestamp</h4>
                    <div class="detail-row">
                        <strong>Formatted:</strong> <span>${timestamp}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Exact:</strong> <span class="timestamp-text">${exactTimestamp}</span>
                    </div>
                </div>
                
                ${message ? `
                <div class="detail-section">
                    <h4>💬 Genesis Message</h4>
                    <div class="detail-row genesis-message">
                        <span>"${message}"</span>
                    </div>
                </div>
                ` : ''}
                
                ${transactions.length > 0 ? `
                <div class="detail-section">
                    <h4>📝 Transactions (${transactions.length})</h4>
                    <div class="detail-row">
                        <span>${JSON.stringify(transactions, null, 2)}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="block-popup-footer">
                <button onclick="searchBlock(${blockNumber})" class="view-btn">View in Explorer</button>
                <button onclick="copyBlockData(${blockNumber})" class="copy-btn">Copy JSON</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Close block popup
function closeBlockPopup() {
    const popup = document.getElementById('blockPopup');
    if (popup) {
        popup.remove();
    }
}

// Copy block JSON data
function copyBlockData(blockNumber) {
    loadBlock(blockNumber).then(block => {
        if (block) {
            navigator.clipboard.writeText(JSON.stringify(block, null, 2));
            alert('Block JSON copied to clipboard!');
        }
    });
}

// Search for a specific block
async function searchBlock() {
    const searchInput = document.getElementById('searchInput');
    const blockNumber = parseInt(searchInput.value);
    
    if (isNaN(blockNumber) || blockNumber < 0 || blockNumber > latestBlock) {
        alert(`Please enter a valid block number between 0 and ${latestBlock}`);
        return;
    }
    
    // Calculate which page this block is on
    const page = Math.ceil((latestBlock - blockNumber + 1) / blocksPerPage);
    currentPage = page;
    
    await displayBlocks();
    updatePagination();
    scrollToTop();
}

// Update statistics with addictive elements
function updateStats() {
    document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();
    
    const totalRewards = latestBlock * 333;
    document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
    
    // Mining rate calculation removed until perfect 26-second timing
    
    // Update reward subtitle with fun facts
    const rewardSubtitle = document.getElementById('rewardSubtitle');
    if (totalRewards > 3000000) {
        rewardSubtitle.textContent = `🚀 Approaching 3M BNC!`;
    } else if (totalRewards > 2500000) {
        rewardSubtitle.textContent = `🔥 2.5M+ BNC mined!`;
    } else if (totalRewards > 2000000) {
        rewardSubtitle.textContent = `⚡ 2M+ BNC milestone!`;
    } else if (totalRewards > 1000000) {
        rewardSubtitle.textContent = `🎉 Over 1M BNC!`;
    } else {
        rewardSubtitle.textContent = `BNC mined`;
    }
    
    // Add addictive mining milestones
    if (latestBlock % 1000 === 0) {
        rewardSubtitle.textContent = `🎯 ${latestBlock.toLocaleString()} blocks!`;
    } else if (latestBlock % 333 === 0) {
        rewardSubtitle.textContent = `⚡ Tesla number!`;
    }
    
    // Add view counter to console for fun
    console.log(`👁️ View #${viewCount} | Block #${latestBlock} | Total: ${totalRewards.toLocaleString()} BNC`);
    

    
    console.log(`📊 Updated stats: Latest=${latestBlock}, Rewards=${totalRewards}`);
}

// Update live ticker with addictive messages
function updateLiveTicker() {
    const ticker = document.getElementById('liveTicker');
    const totalRewards = (latestBlock * 333).toLocaleString();
    
    const messages = [
        `🔄 Block #${latestBlock} synced!`,
        `💰 Total rewards: ${totalRewards} BNC`,
        `🌐 Bannnet is live and active`,
        `🧠 You're among the first ${Math.floor(Math.random() * 50) + 10} viewers today!`,
        `⚡ Tesla would be proud of this energy!`,
        `🎯 Next halving in ${Math.max(0, 1095000 - latestBlock).toLocaleString()} blocks`,
        `🔥 Genesis block: "Think in terms of energy, frequency and vibration"`,
        `⚡ 333 BNC per block - perfect Tesla energy!`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    ticker.textContent = randomMessage;
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil((latestBlock + 1) / blocksPerPage);
    const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
    const endBlock = Math.max(0, startBlock - blocksPerPage + 1);

    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} (Blocks ${endBlock}-${startBlock})`;
    
    // Update button states
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
    
    console.log(`📄 Updated pagination: page ${currentPage} of ${totalPages}`);
}

// Navigation functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayBlocks();
        updatePagination();
        scrollToTop();
    }
}

function nextPage() {
    const totalPages = Math.ceil((latestBlock + 1) / blocksPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayBlocks();
        updatePagination();
        scrollToTop();
    }
}

// Utility functions
function formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    } catch (error) {
        return 'Unknown';
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadLatestBlocks();
    
    // Add Enter key support for search
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBlock();
        }
    });
    
    // Increment view count
    viewCount++;
    console.log(`👁️ View #${viewCount} - Welcome to the Bannchain!`);
});



