// Global variables
let currentPage = 1;
let blocksPerPage = 20; // Reduced to 20 blocks per page for better performance
let totalBlocks = 0;
let latestBlock = 0;
let autoRefreshInterval = null;
let lastKnownBlock = 0;

// Helper function to check if a block exists
async function blockExists(blockNumber) {
  try {
    const response = await fetch(`block${String(blockNumber).padStart(4, "0")}.json`);
    return response.ok;
  } catch {
    return false;
  }
}

// Find the latest block number - more efficient search
async function findLatestBlock() {
  // Start from a reasonable high number and work down
  for (let i = 7500; i >= 0; i--) {
    if (await blockExists(i)) {
      return i;
    }
  }
  return 0;
}

// Load a specific block
async function loadBlock(blockNumber) {
  try {
    const filename = `block${String(blockNumber).padStart(4, "0")}.json`;
    const response = await fetch(filename);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

// Format timestamp
function formatTime(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

// Display blocks for current page - only load what's needed
async function displayBlocks() {
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">Loading blocks...</div>';
  
  // Calculate which blocks to show for this page
  const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
  const endBlock = Math.max(0, startBlock - blocksPerPage + 1);
  
  let html = '';
  let loadedBlocks = 0;
  
  // Only load the blocks for this specific page
  for (let i = startBlock; i >= endBlock; i--) {
    const block = await loadBlock(i);
    if (block) {
      // Handle different block formats
      const blockNumber = i === 0 ? '#0 (Genesis)' : `#${i}`;
      const reward = block.amount || block.reward || '0';
      const rewardTo = block.reward_to || 'Unknown';
      const hash = block.hash || 'Unknown';
      const time = block.timestamp ? formatTime(block.timestamp) : 'Unknown';
      const message = block.message || '';
      
      // Add special message for genesis block
      const genesisMessage = i === 0 && message ? `<div style="color: #ffd700; font-style: italic; margin-top: 5px; grid-column: 1 / -1; text-align: center; font-size: 14px;">⚡ "${message}" — Nikola Tesla</div>` : '';
      
      // Add message for other blocks if present
      const blockMessage = i > 0 && message ? `<div style="color: #daa520; font-style: italic; margin-top: 5px; grid-column: 1 / -1; text-align: center; font-size: 12px;">💬 "${message}"</div>` : '';
      
      html += `
        <div class="block-item">
          <div class="block-number">${blockNumber}</div>
          <div class="block-hash">${hash.substring(0, 20)}...</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo.substring(0, 20)}...</div>
          <div class="block-time">${time}</div>
          ${genesisMessage}
          ${blockMessage}
        </div>
      `;
      loadedBlocks++;
    }
  }
  
  if (loadedBlocks === 0) {
    blocksList.innerHTML = '<div class="no-results">No blocks found for this page.</div>';
  } else {
    blocksList.innerHTML = html;
  }
  
  updatePagination();
  updateStats();
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// Update statistics
function updateStats() {
  document.getElementById('totalBlocks').textContent = totalBlocks.toLocaleString();
  document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();
  document.getElementById('currentPage').textContent = currentPage;
  
  // Calculate total rewards (simplified)
  const totalRewards = (latestBlock + 1) * 333; // Assuming 333 BNC per block
  document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
}

// Navigation functions - these will actually change pages
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayBlocks(); // This will load the new page
  }
}

function nextPage() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayBlocks(); // This will load the new page
  }
}

// Enhanced search functionality - only load what's searched
async function searchBlocks() {
  const searchInput = document.getElementById('searchInput').value.trim();
  const blocksList = document.getElementById('blocksList');
  
  if (!searchInput) {
    loadLatestBlocks();
    return;
  }
  
  blocksList.innerHTML = '<div class="loading">Searching...</div>';
  
  // Check if it's a block number
  const blockNum = parseInt(searchInput);
  if (!isNaN(blockNum) && blockNum >= 0 && blockNum <= latestBlock) {
    const block = await loadBlock(blockNum);
    if (block) {
      const reward = block.amount || block.reward || '0';
      const rewardTo = block.reward_to || 'Unknown';
      const hash = block.hash || 'Unknown';
      const time = block.timestamp ? formatTime(block.timestamp) : 'Unknown';
      const message = block.message || '';
      
      let specialMessage = '';
      if (blockNum === 0 && message) {
        specialMessage = `<div style="color: #ffd700; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 16px;">⚡ "${message}" — Nikola Tesla</div>`;
      } else if (blockNum > 0 && message) {
        specialMessage = `<div style="color: #daa520; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 14px;">💬 "${message}"</div>`;
      }
      
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#${blockNum}${blockNum === 0 ? ' (Genesis)' : ''}</div>
          <div class="block-hash">${hash}</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo}</div>
          <div class="block-time">${time}</div>
          ${specialMessage}
        </div>
      `;
      return;
    }
  }
  
  // Check for special keywords
  const searchLower = searchInput.toLowerCase();
  if (searchLower === 'genesis' || searchLower === 'block 0' || searchLower === '0') {
    const genesisBlock = await loadBlock(0);
    if (genesisBlock) {
      const reward = genesisBlock.amount || genesisBlock.reward || '0';
      const rewardTo = genesisBlock.reward_to || 'Unknown';
      const hash = genesisBlock.hash || 'Unknown';
      const time = genesisBlock.timestamp ? formatTime(genesisBlock.timestamp) : 'Unknown';
      const message = genesisBlock.message || '';
      
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#0 (Genesis)</div>
          <div class="block-hash">${hash}</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo}</div>
          <div class="block-time">${time}</div>
          ${message ? `<div style="color: #ffd700; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 16px;">⚡ "${message}" — Nikola Tesla</div>` : ''}
        </div>
      `;
      return;
    }
  }
  
  if (searchLower === 'latest' || searchLower === 'newest') {
    const latestBlockData = await loadBlock(latestBlock);
    if (latestBlockData) {
      const reward = latestBlockData.amount || latestBlockData.reward || '0';
      const rewardTo = latestBlockData.reward_to || 'Unknown';
      const hash = latestBlockData.hash || 'Unknown';
      const time = latestBlockData.timestamp ? formatTime(latestBlockData.timestamp) : 'Unknown';
      const message = latestBlockData.message || '';
      
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#${latestBlock} (Latest)</div>
          <div class="block-hash">${hash}</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo}</div>
          <div class="block-time">${time}</div>
          ${message ? `<div style="color: #daa520; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 14px;">💬 "${message}"</div>` : ''}
        </div>
      `;
      return;
    }
  }
  
  blocksList.innerHTML = '<div class="no-results">No blocks found matching your search. Try a block number, "genesis", or "latest".</div>';
}

// Auto-refresh functionality
async function checkForNewBlocks() {
  try {
    const newLatestBlock = await findLatestBlock();
    if (newLatestBlock > lastKnownBlock) {
      lastKnownBlock = newLatestBlock;
      latestBlock = newLatestBlock;
      totalBlocks = latestBlock + 1;
      
      // Update the status
      const status = document.getElementById('autoRefreshStatus');
      status.innerHTML = `🔄 New block found! #${newLatestBlock}`;
      status.style.background = 'linear-gradient(135deg, #32cd32 0%, #228b22 100%)';
      
      // If we're on the first page, refresh the display
      if (currentPage === 1) {
        await displayBlocks();
      }
      
      // Reset status after 3 seconds
      setTimeout(() => {
        status.innerHTML = '🔄 Auto-refresh: ON';
        status.style.background = 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)';
      }, 3000);
    }
  } catch (err) {
    console.log('Auto-refresh check failed:', err);
  }
}

// Start auto-refresh
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  autoRefreshInterval = setInterval(checkForNewBlocks, 30000); // Check every 30 seconds
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  const status = document.getElementById('autoRefreshStatus');
  status.innerHTML = '⏸️ Auto-refresh: OFF';
  status.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #dc143c 100%)';
}

// Toggle auto-refresh
function toggleAutoRefresh() {
  const status = document.getElementById('autoRefreshStatus');
  if (autoRefreshInterval) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
    status.innerHTML = '🔄 Auto-refresh: ON';
    status.style.background = 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)';
  }
}

// Load latest blocks (main function)
async function loadLatestBlocks() {
  try {
    // Find the latest block
    latestBlock = await findLatestBlock();
    if (latestBlock === 0) {
      document.getElementById('blocksList').innerHTML = '<div class="error">❌ No blocks found.</div>';
      return;
    }
    
    lastKnownBlock = latestBlock;
    totalBlocks = latestBlock + 1;
    currentPage = 1;
    
    // Display blocks
    await displayBlocks();
    
    // Start auto-refresh
    startAutoRefresh();
    
  } catch (err) {
    document.getElementById('blocksList').innerHTML = `<div class="error">❌ Failed to load blocks: ${err}</div>`;
  }
}

// Handle Enter key in search
document.getElementById('searchInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    searchBlocks();
  }
});

// Handle click on auto-refresh status
document.getElementById('autoRefreshStatus').addEventListener('click', toggleAutoRefresh);

// Initialize the explorer
loadLatestBlocks();
