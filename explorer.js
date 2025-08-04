async function loadLatestBlock() {
  try {
    const response = await fetch(".");
    const text = await response.text();
    const blockFiles = [...text.matchAll(/block(\d{4})\.json/g)].map(match => parseInt(match[1]));

    if (blockFiles.length === 0) {
      document.getElementById("block").innerHTML = '<span class="error">❌ No blocks found.</span>';
      return;
    }

    const latest = Math.max(...blockFiles);
    const latestFile = `block${String(latest).padStart(4, "0")}.json`;

    const blockResponse = await fetch(latestFile + "?v=" + Date.now());
    const block = await blockResponse.json();

    document.getElementById("block").innerHTML = `
      <div class="block">
        <strong>Block #${latest}</strong><br>
        Reward: ${block.reward} BNC<br>
        Mined by: ${block.reward_to}<br>
        Hash: ${block.hash}<br>
        Prev: ${block.previous_hash}<br>
        Time: ${block.timestamp}
      </div>
    `;
  } catch (err) {
    document.getElementById("block").innerHTML = `<span class="error">❌ Failed to load block: ${err}</span>`;
  }
}

async function loadLatestTx() {
  try {
    const response = await fetch(".");
    const text = await response.text();
    const blockFiles = [...text.matchAll(/block(\d{4})\.json/g)].map(match => parseInt(match[1]));

    if (blockFiles.length === 0) {
      document.getElementById("tx").innerHTML = '<span class="error">❌ No transactions found.</span>';
      return;
    }

    const latest = Math.max(...blockFiles);
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
