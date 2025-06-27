// User-Friendly UI Enhancement Script
// This script makes the multi-agent orchestrator UI more intuitive

(function() {
    'use strict';
    
    // Load user-friendly labels
    const labels = {
        buttons: {
            "⚡ Init All": "🚀 Start Your AI Team",
            "🔄 Run Integration": "✨ Combine & Finish",
            "📁 Load": "📥 Upload Tasks",
            "➕ Create": "➕ New Task",
            "Restart": "🔄 Fix This",
            "View": "👀 See Details"
        },
        titles: {
            "🤖 Agent Status": "👥 Your AI Team",
            "⚡ Current Workflow": "📈 What's Happening Now",
            "📋 Tickets": "📋 Your Tasks",
            "📊 System Overview": "📊 Quick Summary",
            "📈 Resource Monitoring": "💻 System Health",
            "🤖 Master Agent Chat": "💬 Talk to Your Team"
        },
        workflow: {
            "Repository Setup": "✅ System Started",
            "Tickets Loaded": "✅ Tasks Uploaded",
            "Agents Working": "⚡ Team is Working",
            "Quality Validation": "🔍 Checking Quality",
            "Master Integration": "🎯 Finalizing Everything"
        },
        descriptions: {
            "Initialized multi-agent orchestrator": "Your AI team is ready to help",
            "8 tickets imported and analyzed": "8 tasks ready to be worked on",
            "3 agents actively implementing features": "3 AI agents are working on your tasks",
            "Code review and testing pending": "Making sure everything works perfectly",
            "Merge all completed work": "Combining all the work into final results"
        }
    };

    // Function to make text more friendly
    function makeFriendly(text) {
        // Replace technical terms
        const replacements = {
            "TICKET-": "Task #",
            "API endpoint": "connection point",
            "Connection timeout": "Connection issue",
            "primary database": "data storage",
            "Webhook": "Notification",
            "SEO Components": "Search Optimization",
            "Schema": "Data Structure",
            "Migration": "Data Update",
            "Orchestration": "Coordination",
            "Integration": "Combining Work",
            "Repository": "Project",
            "Tokens/Hr": "Processing Speed",
            "CPU Usage": "Computer Power Used",
            "Success Rate": "Tasks Completed Successfully"
        };
        
        let friendlyText = text;
        for (const [tech, friendly] of Object.entries(replacements)) {
            friendlyText = friendlyText.replace(new RegExp(tech, 'gi'), friendly);
        }
        return friendlyText;
    }

    // Wait for page to load
    function enhanceUI() {
        // Update all buttons
        document.querySelectorAll('button').forEach(button => {
            const text = button.textContent.trim();
            if (labels.buttons[text]) {
                button.innerHTML = labels.buttons[text];
                button.title = "Click to " + labels.buttons[text].toLowerCase();
            }
        });

        // Update section titles
        document.querySelectorAll('.card-title').forEach(title => {
            const text = title.textContent.trim();
            if (labels.titles[text]) {
                title.textContent = labels.titles[text];
            }
        });

        // Update workflow steps
        document.querySelectorAll('.step-title').forEach(step => {
            const text = step.textContent.trim();
            if (labels.workflow[text]) {
                step.textContent = labels.workflow[text];
            }
        });

        // Update descriptions
        document.querySelectorAll('.step-description').forEach(desc => {
            const text = desc.textContent.trim();
            if (labels.descriptions[text]) {
                desc.textContent = labels.descriptions[text];
            } else {
                desc.textContent = makeFriendly(text);
            }
        });

        // Make agent descriptions friendlier
        document.querySelectorAll('.agent-status').forEach(status => {
            status.textContent = makeFriendly(status.textContent);
        });

        document.querySelectorAll('.agent-task').forEach(task => {
            task.textContent = makeFriendly(task.textContent);
        });

        // Add helpful tooltips
        document.querySelectorAll('.agent-item').forEach(item => {
            item.title = "This AI agent helps with specific tasks. Click to see what they're working on.";
        });

        // Make metrics more understandable
        document.querySelectorAll('.monitoring-label').forEach(label => {
            label.textContent = makeFriendly(label.textContent);
        });

        // Add welcome message if chat is empty
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages && chatMessages.children.length === 1) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.className = 'message agent';
            welcomeMsg.innerHTML = `
                <div class="message-avatar">💡</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">Quick Tip</span>
                        <span class="message-time">Just now</span>
                    </div>
                    <div class="message-text">
                        <strong>Getting Started:</strong><br><br>
                        1. Click "🚀 Start Your AI Team" to wake up your AI agents<br>
                        2. Click "📥 Upload Tasks" or drag & drop a file with your tasks<br>
                        3. Watch the progress as your AI team works on them<br>
                        4. Click "✨ Combine & Finish" when ready to see results<br><br>
                        💬 You can also just tell me what you want to do!
                    </div>
                </div>
            `;
            chatMessages.appendChild(welcomeMsg);
        }

        // Add upload area if missing
        if (!document.querySelector('.upload-area')) {
            const overview = document.querySelector('.overview');
            if (overview) {
                const uploadDiv = document.createElement('div');
                uploadDiv.style.marginTop = '20px';
                uploadDiv.innerHTML = `
                    <div style="border: 2px dashed #e5e7eb; border-radius: 12px; padding: 40px; text-align: center; background: #f9fafb; cursor: pointer; transition: all 0.3s;"
                         onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff';"
                         onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='#f9fafb';"
                         onclick="document.getElementById('file-input').click();">
                        <div style="font-size: 48px; margin-bottom: 16px;">📎</div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Drop your files here to create tasks</div>
                        <div style="color: #6b7280; font-size: 14px;">Or click to browse - supports PDF, Word, Text files</div>
                        <input type="file" id="file-input" style="display: none;" accept=".pdf,.doc,.docx,.txt" onchange="handleFileUpload(this)">
                    </div>
                `;
                overview.appendChild(uploadDiv);
            }
        }
    }

    // Apply enhancements when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceUI);
    } else {
        enhanceUI();
    }

    // Re-apply enhancements after dynamic updates
    const observer = new MutationObserver(() => {
        enhanceUI();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Make file upload handler global
    window.handleFileUpload = function(input) {
        const file = input.files[0];
        if (file) {
            alert(`Processing "${file.name}"...\n\nYour AI team will analyze this file and create tasks automatically!`);
            // Here you would normally call your actual file processing function
        }
    };

})();