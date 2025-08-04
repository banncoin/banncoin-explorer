// Simple and reliable Banncoin Explorer
let currentPage = 1;
let blocksPerPage = 15; // Show 15 blocks per page (like other explorers)
let latestBlock = 0;
let founderWallet = "banncoin.org";

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
    blocksList.innerHTML = '<div class="loading">Loading blocks...</div>';

    try {
        latestBlock = await findLatestBlock();
        
        if (latestBlock === 0) {
            blocksList.innerHTML = '<div class="error">No blocks found</div>';
            return;
        }
        
        updateStats();
        await displayBlocks();
        updatePagination();
        
        console.log('✅ Latest blocks loaded successfully');
    } catch (error) {
        console.error('❌ Error loading blocks:', error);
        blocksList.innerHTML = '<div class="error">Error loading blocks. Please refresh.</div>';
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

            html += `
                <div class="block-item ${founderClass}" onclick="searchBlock(${i})">
                    <div class="block-number">${blockNumber}</div>
                    <div class="block-hash">${hash}</div>
                    <div class="block-reward">${reward} BNC</div>
                    <div class="block-miner">${rewardTo}</div>
                    <div class="block-time">${time}</div>
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
        const response = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json?v=${Date.now()}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error(`Error loading block ${blockNumber}:`, error);
    }
    return null;
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

// Update statistics
function updateStats() {
    document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();
    
    const totalRewards = latestBlock * 333;
    document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
    
    console.log(`📊 Updated stats: Latest=${latestBlock}, Rewards=${totalRewards}`);
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
});

