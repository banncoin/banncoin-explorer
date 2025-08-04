// Global variables
let currentPage = 1;
let blocksPerPage = 999;
let totalBlocks = 0;
let latestBlock = 0;

// Helper function to check if a block exists
async function blockExists(blockNumber) {
  try {
    const response = await fetch(`block${String(blockNumber).padStart(4, "0")}.json`);
    return response.ok;
  } catch {
    return false;
  }
}

// Find the latest block number
async function findLatestBlock() {
  for (let i = 7450; i >= 0; i--) {
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
          <div class="block-hash">${block.hash}</div>
          <div class="block-reward">${block.reward} BNC</div>
          <div class="block-hash">${block.reward_to}</div>
          <div class="block-time">${formatTime(block.timestamp)}</div>
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
  
  // Calculate total rewards (simplified - just latest block reward for now)
  document.getElementById('totalRewards').textContent = 'Calculating...';
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

// Search functionality
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
  
  // Check if it's a hash
  for (let i = Math.min(latestBlock, 1000); i >= 0; i--) {
    const block = await loadBlock(i);
    if (block && (block.hash.includes(searchInput) || block.reward_to.includes(searchInput))) {
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
  
  blocksList.innerHTML = '<div class="no-results">No blocks found matching your search.</div>';
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
    
    totalBlocks = latestBlock + 1;
    currentPage = 1;
    
    // Display blocks
    await displayBlocks();
    
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

// Initialize the explorer
loadLatestBlocks();
