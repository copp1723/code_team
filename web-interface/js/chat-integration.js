// Integration script to add chat functionality to main index.html
document.addEventListener('DOMContentLoaded', function() {
    // Add chat section after terminal section
    const terminalSection = document.querySelector('#terminal');
    if (terminalSection && terminalSection.parentNode) {
        // Create empty chat section
        const chatSection = document.createElement('section');
        chatSection.id = 'chat';
        chatSection.className = 'section';
        
        // Insert after terminal section
        terminalSection.parentNode.insertBefore(chatSection, terminalSection.nextSibling);
        
        // Initialize chat interface (this will create the content)
        chatInterface.init();
        
        // Override showSection to handle chat
        const originalShowSection = window.showSection;
        window.showSection = function(sectionId) {
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Remove active class from all nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // Show selected section
            document.getElementById(sectionId).classList.add('active');
            
            // Add active class to clicked nav link
            if (event && event.target) {
                event.target.classList.add('active');
            }
        };
    }
});

// Add alert functionality if not already present
if (typeof showAlert === 'undefined') {
    window.showAlert = function(type, message) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        alertDiv.innerHTML = message;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
    };
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
