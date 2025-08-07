# Deploy to banncoin.org/explorer

## Files to Upload to banncoin.org/explorer/

### Required Files:
1. `index.html` - Main explorer interface
2. `explorer.js` - Core functionality
3. `README.md` - Documentation (optional)

### File Structure on Server:
```
banncoin.org/explorer/
├── index.html
├── explorer.js
└── README.md
```

## Deployment Steps:

### 1. Access Your banncoin.org Server
- Connect to your web server hosting banncoin.org
- Navigate to the `/explorer/` directory

### 2. Upload Files
Upload these files to `banncoin.org/explorer/`:
- `index.html` → `index.html`
- `explorer.js` → `explorer.js`
- `README.md` → `README.md` (optional)

### 3. Verify Block Data
Ensure your block JSON files are accessible at:
- `banncoin.org/block0000.json`
- `banncoin.org/block0001.json`
- `banncoin.org/block0002.json`
- etc.

### 4. Test the Explorer
Visit: `https://banncoin.org/explorer/`

## Key Benefits:
✅ **No CORS Issues** - Same origin as block data
✅ **Faster Loading** - Direct server access
✅ **Better SEO** - Proper domain hosting
✅ **Full Functionality** - All features work

## Troubleshooting:
- If blocks don't load, check that JSON files are accessible
- If explorer doesn't load, verify file permissions
- Check server logs for any errors

---
**Deployment Package Ready!** 🚀
