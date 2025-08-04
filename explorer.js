// Global variables
let currentPage = 1;
let blocksPerPage = 99; // Changed to 99 blocks per page as requested
let totalBlocks = 0;
let latestBlock = 0;
let autoRefreshInterval = null;
let lastKnownBlock = 0;

// Find the latest block number - more efficient search
async function findLatestBlock() {
  // Start from a reasonable high number and work down
  for (let i = 7500; i >= 0; i--) { // Adjusted search range
    if (await blockExists(i)) {
      return i;
    }
  }
  return 0;
}

// Check if a block file exists
async function blockExists(blockNumber) {
  try {
    const response = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Load a specific block
async function loadBlock(blockNumber) {
  try {
    const response = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Error loading block ${blockNumber}:`, error);
  }
  return null;
}

// Format timestamp
function formatTime(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return 'Unknown';
  }
}

// Load and display the latest blocks
async function loadLatestBlocks() {
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">Loading Bannchain...</div>';

  try {
    latestBlock = await findLatestBlock();
    totalBlocks = latestBlock + 1; // +1 because we start from block 0
    currentPage = 1; // Reset to first page when loading latest blocks

    updateStats();
    await displayBlocks();
    updatePagination();
    startAutoRefresh();
  } catch (error) {
    console.error('Error loading blocks:', error);
    blocksList.innerHTML = '<div class="error">Error loading Bannchain data</div>';
  }
}

// Display blocks for current page - only load what's needed
async function displayBlocks() {
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">Loading blocks...</div>';

  // Calculate which blocks to show for this page (fix pagination)
  const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
  const endBlock = Math.max(0, startBlock - blocksPerPage + 1);

  let html = '';
  let loadedBlocks = 0;

  // Only load the blocks for this specific page
  for (let i = startBlock; i >= endBlock; i--) {
    const block = await loadBlock(i);
    if (block) {
      // Use exact data from JSON files
      const blockNumber = i === 0 ? '#0 (Genesis)' : `#${i}`;
      const reward = block.amount || block.reward || '0'; // Use 'amount' field
      const rewardTo = block.reward_to || 'Unknown';
      const hash = block.hash || 'Unknown';
      const time = block.timestamp ? formatTime(block.timestamp) : 'Unknown';
      const message = block.message || '';

      // Special handling for genesis block - fix double Tesla name
      const genesisMessage = i === 0 && message ? `<div style="color: #ffd700; font-style: italic; margin-top: 5px; grid-column: 1 / -1; text-align: center; font-size: 14px;">⚡ "${message}"</div>` : '';

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
    blocksList.innerHTML = '<div class="no-results">No blocks found</div>';
  } else {
    blocksList.innerHTML = html;
  }
}

// Update statistics
function updateStats() {
  document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();

  // Calculate total rewards correctly (latestBlock * 333, not +1)
  const totalRewards = latestBlock * 333; // Each block gives 333 BNC
  document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // Update page info
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  // Enable/disable buttons
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  // Build pagination numbers
  let paginationHtml = `
    <button onclick="previousPage()" id="prevBtn" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
  `;

  // Show page numbers with smart truncation
  const maxVisiblePages = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add first page if not visible
  if (startPage > 1) {
    paginationHtml += `<button onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHtml += `<span>...</span>`;
    }
  }

  // Add visible page numbers
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      paginationHtml += `<button class="current-page" disabled>${i}</button>`;
    } else {
      paginationHtml += `<button onclick="goToPage(${i})">${i}</button>`;
    }
  }

  // Add last page if not visible
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHtml += `<span>...</span>`;
    }
    paginationHtml += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // Add page input
  paginationHtml += `
    <span>Go to: <input type="number" id="pageInput" min="1" max="${totalPages}" style="width: 60px; margin: 0 5px;">
    <button onclick="goToInputPage()">Go</button></span>
  `;

  paginationHtml += `
    <button onclick="nextPage()" id="nextBtn" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
  `;

  pagination.innerHTML = paginationHtml;
}

// Navigation functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayBlocks();
    updatePagination();
  }
}

function nextPage() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayBlocks();
    updatePagination();
  }
}

function goToPage(page) {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    displayBlocks();
    updatePagination();
  }
}



function goToInputPage() {
  const pageInput = document.getElementById('pageInput');
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) {
    goToPage(page);
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
        specialMessage = `<div style="color: #ffd700; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 16px;">⚡ "${message}"</div>`;
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
          ${message ? `<div style="color: #ffd700; font-style: italic; margin-top: 10px; grid-column: 1 / -1; text-align: center; font-size: 16px;">⚡ "${message}"</div>` : ''}
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
function checkForNewBlocks() {
  findLatestBlock().then(newLatestBlock => {
    if (newLatestBlock > lastKnownBlock) {
      lastKnownBlock = newLatestBlock;
      latestBlock = newLatestBlock;
      totalBlocks = latestBlock + 1;
      updateStats();
      if (currentPage === 1) { // Only auto-refresh if on first page
        displayBlocks();
      }
      updatePagination();
    }
  });
}

function startAutoRefresh() {
  if (!autoRefreshInterval) {
    autoRefreshInterval = setInterval(checkForNewBlocks, 10000); // Check every 10 seconds
    document.getElementById('autoRefreshStatus').textContent = '🔄 Auto-refresh: ON';
  }
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    document.getElementById('autoRefreshStatus').textContent = '⏸️ Auto-refresh: OFF';
  }
}

function toggleAutoRefresh() {
  if (autoRefreshInterval) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadLatestBlocks();
  
  // Add enter key support for search
  document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchBlocks();
    }
  });

  // Add enter key support for page input
  document.addEventListener('keypress', function(e) {
    if (e.target.id === 'pageInput' && e.key === 'Enter') {
      goToInputPage();
    }
  });
});

