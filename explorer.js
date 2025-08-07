// Banncoin Explorer - Professional Version
// Data source: direct_miner_server.py running on localhost:8081

let currentPage = 1;
let totalPages = 1;
let blocksPerPage = 33; // Show 33 blocks per page
let latestBlockHeight = 0;
let allBlocks = [];

// Initialize the explorer
document.addEventListener('DOMContentLoaded', function() {
    loadLatestBlocks();
    setInterval(loadLatestBlocks, 30000); // Auto-refresh every 30 seconds
});

// Find the latest block by searching backwards from a high number
async function findLatestBlock() {
    for (let i = 20000; i >= 0; i -= 50) { // Changed from 15300
        try {
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`http://localhost:8081/block${i.toString().padStart(4, '0')}.json`)}&cb=${Math.random()}`);
            if (response.ok) {
                const block = await response.json();
                if (block && block.height) {
                    console.log(`Found latest block: ${block.height}`);
                    return block.height;
                }
            }
        } catch (error) {
            continue;
        }
    }
    return 0;
}

// Load a specific block
async function loadBlock(blockNumber) {
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`http://localhost:8081/block${blockNumber.toString().padStart(4, '0')}.json`)}&cb=${Math.random()}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error(`Error loading block ${blockNumber}:`, error);
    }
    return null;
}

// Load the latest blocks for display
async function loadLatestBlocks() {
    const blocksList = document.getElementById('blocksList');
    blocksList.innerHTML = '<div class="loading">🔄 Fetching latest 33 blocks from miner...</div>';
    
    try {
        // Find the latest block
        latestBlockHeight = await findLatestBlock();
        
        if (latestBlockHeight === 0) {
            blocksList.innerHTML = '<div class="error">❌ Unable to connect to miner server</div>';
            return;
        }
        
        // Load blocks for current page
        const startBlock = latestBlockHeight - ((currentPage - 1) * blocksPerPage);
        const endBlock = Math.max(0, startBlock - blocksPerPage + 1);
        
        allBlocks = [];
        for (let i = startBlock; i >= endBlock; i--) {
            const block = await loadBlock(i);
            if (block) {
                allBlocks.push(block);
            }
        }
        
        // Update display
        displayBlocks();
        updateStats();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading blocks:', error);
        blocksList.innerHTML = '<div class="error">❌ Error loading blocks from miner</div>';
    }
}

// Display blocks in the UI
function displayBlocks() {
    const blocksList = document.getElementById('blocksList');
    
    if (allBlocks.length === 0) {
        blocksList.innerHTML = '<div class="loading">No blocks found</div>';
        return;
    }
    
    let html = `
        <div class="blocks-header">
            <div>Block #</div>
            <div>Hash</div>
            <div>Difficulty</div>
            <div>Miner</div>
            <div>Timestamp</div>
        </div>
    `;
    
    allBlocks.forEach(block => {
        const isFounder = block.height === 0;
        const blockClass = isFounder ? 'block-item founder' : 'block-item';
        
        const timestamp = new Date(block.timestamp * 1000).toLocaleString();
        const shortHash = block.hash.substring(0, 8) + '...' + block.hash.substring(block.hash.length - 8);
        const shortMiner = block.reward_to.substring(0, 8) + '...' + block.reward_to.substring(block.reward_to.length - 8);
        
        html += `
            <div class="${blockClass}" onclick="showBlockDetails(${block.height})">
                <div>${block.height}</div>
                <div>${shortHash}</div>
                <div>${block.difficulty}</div>
                <div>${shortMiner}</div>
                <div>${timestamp}</div>
            </div>
        `;
    });
    
    blocksList.innerHTML = html;
}

// Update statistics
function updateStats() {
    const totalRewards = document.getElementById('totalRewards');
    const rewardSubtitle = document.getElementById('rewardSubtitle');
    
    if (latestBlockHeight > 0) {
        const totalBNC = (latestBlockHeight + 1) * 333; // +1 because block 0 exists
        totalRewards.textContent = totalBNC.toLocaleString();
        rewardSubtitle.textContent = `BNC mined`; // Removed all conditional messages
    } else {
        totalRewards.textContent = '-';
        rewardSubtitle.textContent = 'BNC mined';
    }
}

// Update pagination controls
function updatePagination() {
    totalPages = Math.ceil(latestBlockHeight / blocksPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Navigation functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadLatestBlocks();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadLatestBlocks();
    }
}

// Search for a specific block
async function searchBlock() {
    const searchInput = document.getElementById('searchInput');
    const searchValue = searchInput.value.trim();
    if (!searchValue) { // New check
        return;
    }
    const blockNumber = parseInt(searchValue);
    
    if (isNaN(blockNumber) || blockNumber < 0) {
        alert('Please enter a valid block number');
        return;
    }
    
    const block = await loadBlock(blockNumber);
    if (block) {
        showBlockDetails(blockNumber);
    } else {
        alert(`Block ${blockNumber} not found`);
    }
}

// Show block details in popup
function showBlockDetails(blockNumber) {
    const block = allBlocks.find(b => b.height === blockNumber);
    if (!block) {
        alert(`Block ${blockNumber} not found`);
        return;
    }
    
    showBlockPopup(block);
}

// Show block popup
function showBlockPopup(block) {
    const timestamp = new Date(block.timestamp * 1000).toLocaleString();
    const exactTimestamp = new Date(block.timestamp * 1000).toISOString();
    
    const popup = document.createElement('div');
    popup.className = 'block-popup';
    popup.innerHTML = `
        <div class="block-popup-content">
            <div class="block-popup-header">
                <h3>Block #${block.height}</h3>
            </div>
            <div class="block-popup-body">
                <div class="detail-section">
                    <div class="detail-row">
                        <strong>Difficulty:</strong> <span>${block.difficulty}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Nonce:</strong> <span>${block.nonce}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Network:</strong> <span>${block.network}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-row">
                        <strong>Reward:</strong> <span>${block.reward} BNC</span>
                    </div>
                    <div class="detail-row">
                        <strong>Miner:</strong> <span class="wallet-text">${block.reward_to}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-row">
                        <span class="hash-text">${block.hash}</span>
                    </div>
                    <div class="detail-row">
                        <span class="hash-text">${block.prev_hash}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-row">
                        <span>${timestamp}</span>
                    </div>
                </div>
                
                ${block.height === 0 ? '<div class="genesis-message">🎉 Genesis Block - The beginning of Banncoin!</div>' : ''}
            </div>
        </div>
    `;
    
    // Close popup when clicking outside
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closeBlockPopup();
        }
    });
    
    document.body.appendChild(popup);
}

// Close block popup
function closeBlockPopup() {
    const popup = document.querySelector('.block-popup');
    if (popup) {
        popup.remove();
    }
}

// Handle Enter key in search input
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBlock();
        }
    });
});
