// Helper function to check if a block exists
async function blockExists(blockNumber) {
  try {
    const response = await fetch(`block${String(blockNumber).padStart(4, "0")}.json`);
    return response.ok;
  } catch {
    return false;
  }
}

// Fast search to find the latest block - start from known high number
async function findLatestBlock() {
  // Start from a reasonable high number and work down
  for (let i = 7450; i >= 0; i--) {
    if (await blockExists(i)) {
      return i;
    }
  }
  return 0;
}

async function loadLatestBlock() {
  try {
    const latest = await findLatestBlock();
    
    if (latest === 0) {
      document.getElementById("block").innerHTML = '<span class="error">❌ No blocks found.</span>';
      return;
    }

    const latestFile = `block${String(latest).padStart(4, "0")}.json`;
    const blockResponse = await fetch(latestFile + "?v=" + Date.now());
    const block = await blockResponse.json();

    document.getElementById("block").innerHTML = `
      <div class="block">
        <strong>Block #${latest}</strong><br>
        Reward: ${block.reward} BNC<br>
        Mined by: ${block.reward_to}<br>
        Hash: ${block.hash}<br>
        Prev: ${block.prev_hash}<br>
        Time: ${block.timestamp}
      </div>
    `;
  } catch (err) {
    document.getElementById("block").innerHTML = `<span class="error">❌ Failed to load block: ${err}</span>`;
  }
}

async function loadLatestTx() {
  try {
    const latest = await findLatestBlock();
    
    if (latest === 0) {
      document.getElementById("tx").innerHTML = '<span class="error">❌ No transactions found.</span>';
      return;
    }

    const latestFile = `block${String(latest).padStart(4, "0")}.json`;
    const blockResponse = await fetch(latestFile + "?v=" + Date.now());
    const block = await blockResponse.json();

    if (block.transactions && block.transactions.length > 0) {
      document.getElementById("tx").innerHTML = `
        <div class="tx">
          Latest Transaction:<br>
          ${JSON.stringify(block.transactions[0], null, 2)}
        </div>
      `;
    } else {
      document.getElementById("tx").innerHTML = '<span class="error">❌ No transaction found.</span>';
    }
  } catch (err) {
    document.getElementById("tx").innerHTML = `<span class="error">❌ Failed to load tx: ${err}</span>`;
  }
}

loadLatestBlock();
loadLatestTx();
