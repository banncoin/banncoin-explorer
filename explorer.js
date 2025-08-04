// Global variables
let currentPage = 1;
let blocksPerPage = 50;
let totalBlocks = 0;
let latestBlock = 0;
let autoRefreshInterval = null;
let lastKnownBlock = 0;
let totalRewards = 0;

// Helper function to check if a block exists
async function blockExists(blockNumber) {
  try {
    const response = await fetch(`block${String(blockNumber).padStart(4, "0")}.json`);
    return response.ok;
  } catch {
    return false;
  }
}

// Find the latest block number - updated for current height
async function findLatestBlock() {
  for (let i = 7800; i >= 0; i--) {
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

// Calculate total rewards
async function calculateTotalRewards() {
  let total = 0;
  let calculatedBlocks = 0;
  
  // Calculate rewards for all blocks (in batches to avoid overwhelming)
  for (let i = 0; i <= latestBlock; i += 100) {
    const endBlock = Math.min(i + 99, latestBlock);
    for (let j = i; j <= endBlock; j++) {
      const block = await loadBlock(j);
      if (block && block.reward) {
        total += parseFloat(block.reward);
        calculatedBlocks++;
      }
    }
    
    // Update progress every 100 blocks
    if (calculatedBlocks % 100 === 0) {
      document.getElementById('totalRewards').textContent = `${total.toFixed(2)} BNC (${calculatedBlocks}/${latestBlock})`;
    }
  }
  
  return total;
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

// Display blocks for current page
async function displayBlocks() {
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">Loading blocks...</div>';
  
  const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
  const endBlock = Math.max(0, startBlock - blocksPerPage + 1);
  
  let html = '';
  let loadedBlocks = 0;
  
  for (let i = startBlock; i >= endBlock; i--) {
    const block = await loadBlock(i);
    if (block) {
      html += `
        <div class="block-item">
          <div class="block-number">#${i}</div>
          <div class="block-hash">${block.hash.substring(0, 20)}...</div>
          <div class="block-reward">${block.reward} BNC</div>
          <div class="block-hash">${block.reward_to.substring(0, 20)}...</div>
          <div class="block-time">${formatTime(block.timestamp)}</div>
        </div>
      `;
      loadedBlocks++;
      
      if (loadedBlocks % 10 === 0) {
        blocksList.innerHTML = html + '<div class="loading">Loading more blocks...</div>';
      }
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
}

// Navigation functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayBlocks();
  }
}

function nextPage() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayBlocks();
  }
}

// Enhanced search functionality
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
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#${blockNum}</div>
          <div class="block-hash">${block.hash}</div>
          <div class="block-reward">${block.reward} BNC</div>
          <div class="block-hash">${block.reward_to}</div>
          <div class="block-time">${formatTime(block.timestamp)}</div>
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
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#0 (Genesis)</div>
          <div class="block-hash">${genesisBlock.hash}</div>
          <div class="block-reward">${genesisBlock.reward} BNC</div>
          <div class="block-hash">${genesisBlock.reward_to}</div>
          <div class="block-time">${formatTime(genesisBlock.timestamp)}</div>
        </div>
      `;
      return;
    }
  }
  
  if (searchLower === 'latest' || searchLower === 'newest') {
    const latestBlockData = await loadBlock(latestBlock);
    if (latestBlockData) {
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#${latestBlock} (Latest)</div>
          <div class="block-hash">${latestBlockData.hash}</div>
          <div class="block-reward">${latestBlockData.reward} BNC</div>
          <div class="block-hash">${latestBlockData.reward_to}</div>
          <div class="block-time">${formatTime(latestBlockData.timestamp)}</div>
        </div>
      `;
      return;
    }
  }
  
  // Check if it's a hash or address (limited search for performance)
  for (let i = Math.min(latestBlock, 200); i >= 0; i--) {
    const block = await loadBlock(i);
    if (block && (block.hash.toLowerCase().includes(searchLower) || 
                  block.reward_to.toLowerCase().includes(searchLower) ||
                  block.prev_hash.toLowerCase().includes(searchLower))) {
      blocksList.innerHTML = `
        <div class="block-item">
          <div class="block-number">#${i}</div>
          <div class="block-hash">${block.hash}</div>
          <div class="block-reward">${block.reward} BNC</div>
          <div class="block-hash">${block.reward_to}</div>
          <div class="block-time">${formatTime(block.timestamp)}</div>
        </div>
      `;
      return;
    }
  }
  
  blocksList.innerHTML = '<div class="no-results">No blocks found matching your search. Try a block number, hash, or keywords like "genesis" or "latest".</div>';
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
      
      // Recalculate total rewards
      totalRewards = await calculateTotalRewards();
      document.getElementById('totalRewards').textContent = `${totalRewards.toFixed(2)} BNC`;
      
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
    
    // Calculate total rewards in background
    document.getElementById('totalRewards').textContent = 'Calculating...';
    totalRewards = await calculateTotalRewards();
    document.getElementById('totalRewards').textContent = `${totalRewards.toFixed(2)} BNC`;
    
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
