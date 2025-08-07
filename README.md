# Banncoin Explorer

Live blockchain explorer for the Banncoin network, deployed at [https://banncoin.org/explorer](https://banncoin.org/explorer).

## Features

- **Real-time Block Data**: Displays the latest blocks from the Banncoin blockchain
- **Professional UI**: Modern glassmorphism design with smooth animations
- **Block Search**: Search for specific blocks by number
- **Block Details**: Click any block to view detailed information
- **Auto-refresh**: Updates every 30 seconds automatically
- **Responsive Design**: Works on desktop and mobile devices

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Data Source**: JSON block files served from banncoin.org
- **Deployment**: GitHub Pages with custom domain forwarding
- **Block Reward**: 333 BNC per block
- **Network**: Bannnet (Banncoin mainnet)

## File Structure

```
banncoin-explorer/
├── index.html          # Main explorer interface
├── explorer.js         # Core functionality and data handling
└── README.md          # This file
```

## Local Development

To run the explorer locally:

1. Start your block data server (serving JSON files)
2. Update the data source URLs in `explorer.js` to point to your local server
3. Open `index.html` in a web browser

## Deployment

The explorer is automatically deployed via GitHub Pages and forwarded to `banncoin.org/explorer`.

---

**Banncoin Explorer** - Live blockchain data for the Banncoin network 🚀
