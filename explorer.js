// Global variables
let currentPage = 1;
let blocksPerPage = 99; // Changed to 99 blocks per page as requested
let totalBlocks = 0;
let latestBlock = 0;
let autoRefreshInterval = null;
let lastKnownBlock = 0;
let isLoading = false;
let isSearching = false;

// Find the latest block number - more robust search
async function findLatestBlock() {
  console.log('🔍 Searching for latest block...');
  
  // Start from a much higher number since we know you have 7855+ blocks
  for (let i = 10000; i >= 0; i--) {
    try {
      const response = await fetch(`block${i.toString().padStart(4, '0')}.json`);
      if (response.ok) {
        console.log(`✅ Found latest block: ${i}`);
        return i;
      }
    } catch (error) {
      // Continue searching
    }
    
    // Show progress every 100 blocks
    if (i % 100 === 0) {
      console.log(`Searching... ${i}`);
    }
  }
  
  console.log('❌ No blocks found');
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
  if (isLoading) return;
  
  isLoading = true;
  isSearching = false;
  
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">🔍 Searching for latest blocks...</div>';

  try {
    console.log('🚀 Loading latest blocks...');
    latestBlock = await findLatestBlock();
    
    if (latestBlock === 0) {
      blocksList.innerHTML = '<div class="error">❌ No blocks found. Please check your connection.</div>';
      return;
    }
    
    totalBlocks = latestBlock + 1; // +1 because we start from block 0
    currentPage = 1; // Reset to first page when loading latest blocks

    console.log(`📊 Stats: Latest=${latestBlock}, Total=${totalBlocks}`);
    updateStats();
    await displayBlocks();
    updatePagination();
    startAutoRefresh();
    
    console.log('✅ Latest blocks loaded successfully');
  } catch (error) {
    console.error('❌ Error loading blocks:', error);
    blocksList.innerHTML = '<div class="error">❌ Error loading Bannchain data. Please refresh the page.</div>';
  } finally {
    isLoading = false;
  }
}

// Display blocks for current page - matrix-like flowing display
async function displayBlocks() {
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">📦 Loading blocks...</div>';

  // Calculate which blocks to show for this page (newest blocks first)
  const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
  const endBlock = Math.max(0, startBlock - blocksPerPage + 1);

  console.log(`📄 Loading page ${currentPage}: blocks ${startBlock} to ${endBlock}`);

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
        <div class="block-item" style="animation: blockAppear ${0.1 * loadedBlocks}s ease-out;">
          <div class="block-number">${blockNumber}</div>
          <div class="block-hash">${hash}</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo}</div>
          <div class="block-time">${time}</div>
          ${genesisMessage}
          ${blockMessage}
        </div>
      `;
      loadedBlocks++;
    }
  }

  if (loadedBlocks === 0) {
    blocksList.innerHTML = '<div class="no-results">❌ No blocks found for this page</div>';
  } else {
    blocksList.innerHTML = html;
    console.log(`✅ Loaded ${loadedBlocks} blocks for page ${currentPage}`);
  }
}

// Update statistics
function updateStats() {
  document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();
  document.getElementById('currentPage').textContent = currentPage;

  // Calculate total rewards correctly (latestBlock * 333, not +1)
  const totalRewards = latestBlock * 333; // Each block gives 333 BNC
  document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
  
  console.log(`📊 Updated stats: Latest=${latestBlock}, Rewards=${totalRewards}, Page=${currentPage}`);
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');

  // Update page info
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  // Build pagination numbers
  let paginationHtml = `
    <button onclick="previousPage()" id="prevBtn" ${currentPage <= 1 ? 'disabled' : ''}>⬅️ Previous</button>
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
    <button onclick="nextPage()" id="nextBtn" ${currentPage >= totalPages ? 'disabled' : ''}>Next ➡️</button>
  `;

  pagination.innerHTML = paginationHtml;
  console.log(`📄 Updated pagination: Page ${currentPage} of ${totalPages}`);
}

// Navigation functions
function previousPage() {
  if (currentPage > 1 && !isLoading) {
    currentPage--;
    displayBlocks();
    updatePagination();
    updateStats();
  }
}

function nextPage() {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (currentPage < totalPages && !isLoading) {
    currentPage++;
    displayBlocks();
    updatePagination();
    updateStats();
  }
}

function goToPage(page) {
  const totalPages = Math.ceil(totalBlocks / blocksPerPage);
  if (page >= 1 && page <= totalPages && !isLoading) {
    currentPage = page;
    displayBlocks();
    updatePagination();
    updateStats();
  }
}

function goToInputPage() {
  const pageInput = document.getElementById('pageInput');
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) {
    goToPage(page);
  }
}

// Enhanced search functionality
async function searchBlocks() {
  if (isSearching) return;
  
  const searchInput = document.getElementById('searchInput').value.trim();
  const blocksList = document.getElementById('blocksList');

  if (!searchInput) {
    loadLatestBlocks();
    return;
  }

  isSearching = true;
  isLoading = true;
  
  blocksList.innerHTML = '<div class="loading">🔍 Searching...</div>';

  try {
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

    blocksList.innerHTML = '<div class="no-results">❌ No blocks found matching your search. Try a block number, "genesis", or "latest".</div>';
  } finally {
    isSearching = false;
    isLoading = false;
  }
}

// Auto-refresh functionality
function checkForNewBlocks() {
  if (isLoading) return;
  
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
      
      // Show notification
      const status = document.getElementById('autoRefreshStatus');
      status.innerHTML = `🆕 New block #${newLatestBlock}!`;
      status.style.background = 'linear-gradient(135deg, #32cd32 0%, #228b22 100%)';
      
      setTimeout(() => {
        status.innerHTML = '🔄 Auto-refresh: ON';
        status.style.background = 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)';
      }, 3000);
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
  console.log('🚀 Bannchain Explorer initializing...');
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

