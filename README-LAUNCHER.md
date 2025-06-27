# Multi-Agent Orchestrator - Quick Start Guide

## 🚀 One-Click Launch

**Double-click `Launch-Orchestrator.command` on your Desktop!**

That's it! The web interface will:
1. Start automatically
2. Open in your browser
3. Be ready to use

## 📁 No Setup Required for Each Repo!

The web interface now works with ANY repository without copying files:
1. Just select your repo from the dropdown
2. The system will work in that directory
3. No need to copy files to each project

## 🛠️ Initial Setup (One Time Only)

```bash
cd /Users/copp1723/Desktop/multi-agent-orchestrator
chmod +x Launch-Orchestrator.command
chmod +x copy-orchestrator-files.sh
```

## 🎯 How It Works

### Option 1: Web Interface (Recommended)
- Double-click `Launch-Orchestrator.command`
- Select any repository from dropdown
- Follow the wizard
- Everything runs from the web UI

### Option 2: Copy Files to Specific Repo (Advanced)
If you want the orchestrator files IN a specific repo:
```bash
./copy-orchestrator-files.sh /path/to/your/repo
```

## 🔧 Troubleshooting

### "Permission denied" when double-clicking
```bash
chmod +x /Users/copp1723/Desktop/multi-agent-orchestrator/Launch-Orchestrator.command
```

### Browser doesn't open automatically
- Manually go to: http://localhost:8080

### Server already running
- Kill existing process: `lsof -ti:8080 | xargs kill -9`
- Then double-click launcher again

## 📱 Creating a Desktop Shortcut

1. Right-click `Launch-Orchestrator.command`
2. Select "Make Alias"
3. Rename to "Multi-Agent Orchestrator"
4. Move to Desktop
5. Optional: Change icon (right-click → Get Info → drag new icon to top-left)

## 🎨 Custom Icon

Want a nice icon? Create a text file with this emoji and save as icon:
🤖

Then:
1. Right-click the launcher → Get Info
2. Drag the emoji to the icon in top-left
3. Now you have a robot icon!

## 💡 Pro Tips

1. **Keep the launcher on your Desktop** for easy access
2. **Bookmark http://localhost:8080** in your browser
3. **The web interface remembers your last repository**
4. **All repos work without setup** - just select from dropdown

## 🚨 Important Notes

- The orchestrator can work with ANY repository
- No need to copy files to each project
- The web interface runs the commands in the selected repo
- Your API key is saved in the launcher

Enjoy your AI-powered development! 🎉
