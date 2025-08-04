// Global variables
let currentPage = 1;
let blocksPerPage = 66; // Load 66 blocks at a time
let totalBlocks = 0;
let latestBlock = 0;
let autoRefreshInterval = null;
let lastKnownBlock = 0;
let isLoading = false;
let isSearching = false;
let retryCount = 0;
const maxRetries = 3;
let isAutoRefreshActive = true;
let loadedBlocks = []; // Track which blocks we've loaded
let isLoadingMore = false; // Prevent multiple simultaneous loads

// Simple function to find the latest block (search up to 1000)
async function findLatestBlock() {
  console.log('🔍 Searching for latest block...');
  
  // Search from 0 to 1000 to find the latest block
  for (let i = 1000; i >= 0; i--) {
    try {
      const response = await fetch(`block${i.toString().padStart(4, '0')}.json?v=${Date.now()}`);
      if (response.ok) {
        console.log(`✅ Found latest block: ${i}`);
        return i;
      }
    } catch (error) {
      // Continue searching
    }
  }
  
  console.log('❌ No blocks found');
  return 0;
}

// Load and display the latest blocks
async function loadLatestBlocks() {
  if (isLoading) return;
  
  isLoading = true;
  isSearching = false;
  retryCount = 0;
  
  const blocksList = document.getElementById('blocksList');
  blocksList.innerHTML = '<div class="loading">🚀 Loading latest blocks...</div>';

  try {
    console.log('🚀 Loading latest blocks...');
    latestBlock = await findLatestBlock();
    
    if (latestBlock === 0) {
      blocksList.innerHTML = '<div class="error">❌ No blocks found. Please check if block files exist.</div>';
      return;
    }
    
    totalBlocks = latestBlock + 1; // +1 because we start from block 0
    currentPage = 1;
    loadedBlocks = []; // Reset loaded blocks

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

// Display blocks for current page with infinite scroll
async function displayBlocks() {
  const blocksList = document.getElementById('blocksList');
  
  if (currentPage === 1) {
    blocksList.innerHTML = '<div class="loading">📦 Loading blocks...</div>';
  }

  // Calculate which blocks to show for this page (newest blocks first)
  const startBlock = latestBlock - ((currentPage - 1) * blocksPerPage);
  const endBlock = Math.max(0, startBlock - blocksPerPage + 1);

  console.log(`📄 Loading page ${currentPage}: blocks ${startBlock} to ${endBlock}`);

  let html = '';
  let loadedCount = 0;

  // Load the blocks for this specific page
  for (let i = startBlock; i >= endBlock; i--) {
    // Skip if we already loaded this block
    if (loadedBlocks.includes(i)) {
      continue;
    }
    
    const block = await loadBlock(i);
    if (block) {
      // Use exact data from JSON files
      const blockNumber = i === 0 ? '#0 (Genesis)' : `#${i}`;
      const reward = block.amount || block.reward || '0';
      const rewardTo = block.reward_to || 'Unknown';
      const hash = block.hash || 'Unknown';
      const time = block.timestamp ? formatTime(block.timestamp) : 'Unknown';
      const message = block.message || '';

      // Special handling for genesis block
      const genesisMessage = i === 0 && message ? `<div style="color: #ffd700; font-style: italic; margin-top: 5px; grid-column: 1 / -1; text-align: center; font-size: 14px;">⚡ "${message}"</div>` : '';

      // Add message for other blocks if present
      const blockMessage = i > 0 && message ? `<div style="color: #daa520; font-style: italic; margin-top: 5px; grid-column: 1 / -1; text-align: center; font-size: 12px;">💬 "${message}"</div>` : '';

      html += `
        <div class="block-item" style="animation: blockAppear ${0.1 * loadedCount}s ease-out;">
          <div class="block-number">${blockNumber}</div>
          <div class="block-hash">${hash}</div>
          <div class="block-reward">${reward} BNC</div>
          <div class="block-hash">${rewardTo}</div>
          <div class="block-time">${time}</div>
          ${genesisMessage}
          ${blockMessage}
        </div>
      `;
      loadedBlocks.push(i); // Mark as loaded
      loadedCount++;
    }
  }

  if (currentPage === 1) {
    if (loadedCount === 0) {
      blocksList.innerHTML = '<div class="no-results">❌ No blocks found. Please check if block files exist.</div>';
    } else {
      blocksList.innerHTML = html;
    }
  } else {
    // Append to existing blocks for infinite scroll
    if (loadedCount > 0) {
      blocksList.innerHTML += html;
    }
  }

  console.log(`✅ Loaded ${loadedCount} new blocks for page ${currentPage}`);
  
  // Add loading indicator for infinite scroll
  if (endBlock > 0) {
    blocksList.innerHTML += '<div class="loading-more" id="loadingMore">📦 Loading more blocks...</div>';
  }
}

// Load more blocks when scrolling (infinite scroll)
async function loadMoreBlocks() {
  if (isLoadingMore || isLoading) return;
  
  const endBlock = Math.max(0, latestBlock - (currentPage * blocksPerPage) + 1);
  if (endBlock <= 0) return; // No more blocks to load
  
  isLoadingMore = true;
  currentPage++;
  
  console.log(`🔄 Loading more blocks (page ${currentPage})...`);
  await displayBlocks();
  
  isLoadingMore = false;
}

// Update statistics
function updateStats() {
  document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();
  document.getElementById('currentPage').textContent = currentPage;

  // Calculate total rewards correctly (latestBlock * 333)
  const totalRewards = latestBlock * 333; // Each block gives 333 BNC
  document.getElementById('totalRewards').textContent = `${totalRewards.toLocaleString()} BNC`;
  
  console.log(`📊 Updated stats: Latest=${latestBlock}, Rewards=${totalRewards}, Page=${currentPage}`);
}

// Update pagination controls - simplified for infinite scroll
function updatePagination() {
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');

  // Update page info
  pageInfo.textContent = `Loaded ${loadedBlocks.length} of ${totalBlocks} blocks`;

  // Simple pagination for infinite scroll
  let paginationHtml = `
    <button onclick="loadLatestBlocks()" class="nav-btn">🔄 Refresh</button>
    <span>${loadedBlocks.length} of ${totalBlocks} blocks loaded</span>
    <button onclick="scrollToTop()" class="nav-btn">⬆️ Top</button>
  `;

  pagination.innerHTML = paginationHtml;
  console.log(`📄 Updated pagination: ${loadedBlocks.length} blocks loaded`);
}

// Navigation functions - simplified for infinite scroll
function previousPage() {
  // Scroll to top instead
  scrollToTop();
}

function nextPage() {
  // Load more blocks instead
  loadMoreBlocks();
}

function goToPage(page) {
  // Reset to first page and reload
  currentPage = 1;
  loadedBlocks = [];
  displayBlocks();
  updatePagination();
  updateStats();
}

function goToInputPage() {
  // Reset to first page and reload
  goToPage(1);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      console.log(`🔍 Searching for block ${blockNum}...`);
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
        console.log(`✅ Found block ${blockNum}`);
        return;
      } else {
        console.log(`❌ Block ${blockNum} not found`);
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

// Load a specific block with rate limit handling
async function loadBlock(blockNumber) {
  try {
    console.log(`📦 Loading block ${blockNumber}...`);
    const response = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json?v=${Date.now()}`);
    
    if (response.ok) {
      const blockData = await response.json();
      console.log(`✅ Successfully loaded block ${blockNumber}`);
      return blockData;
    } else if (response.status === 404) {
      console.log(`❌ Block ${blockNumber} not found (404)`);
      return null;
    } else if (response.status === 429) {
      // Rate limit - wait and retry once
      console.log(`⚠️ Rate limit for block ${blockNumber}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResponse = await fetch(`block${blockNumber.toString().padStart(4, '0')}.json?v=${Date.now()}`);
      if (retryResponse.ok) {
        const blockData = await retryResponse.json();
        console.log(`✅ Successfully loaded block ${blockNumber} after retry`);
        return blockData;
      } else {
        console.log(`❌ Block ${blockNumber} failed after retry`);
        return null;
      }
    } else {
      console.log(`❌ Block ${blockNumber} failed with status ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error loading block ${blockNumber}:`, error);
    return null;
  }
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

// Auto-refresh functionality
function checkForNewBlocks() {
  if (isLoading) return;
  
  console.log('🔄 Checking for new blocks...');
  findLatestBlock().then(newLatestBlock => {
    if (newLatestBlock > lastKnownBlock) {
      console.log(`🎉 New blocks found! Latest: ${newLatestBlock} (was: ${lastKnownBlock})`);
      lastKnownBlock = newLatestBlock;
      latestBlock = newLatestBlock;
      totalBlocks = latestBlock + 1;
      
      // Update stats immediately
      updateStats();
      updatePagination();
    } else {
      console.log('📊 No new blocks found');
    }
  }).catch(error => {
    console.log('Auto-refresh check failed:', error);
  });
}

function startAutoRefresh() {
  if (!autoRefreshInterval) {
    // Check every 60 seconds
    autoRefreshInterval = setInterval(checkForNewBlocks, 60000);
    isAutoRefreshActive = true;
    console.log('🔄 Auto-refresh started (60 second interval)');
  }
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    isAutoRefreshActive = false;
    console.log('⏸️ Auto-refresh stopped');
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
  console.log('🚀 Bannchain Explorer initializing (infinite scroll mode)...');
  loadLatestBlocks();
  
  // Add enter key support for search
  document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchBlocks();
    }
  });

  // Add scroll listener for infinite scroll
  window.addEventListener('scroll', function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
      // User is near bottom, load more blocks
      loadMoreBlocks();
    }
  });
});

