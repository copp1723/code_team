// Fix for the frontend to show real results instead of simulated data

// Override the wizardRunIntegration function to properly track real results
function wizardRunIntegration() {
    const btn = document.getElementById('wizard-integrate-btn');
    btn.disabled = true;
    btn.innerHTML = 'Integrating...';
    
    const integrationStatus = document.getElementById('integration-status');
    integrationStatus.innerHTML = '🔄 Running Master Integration...';
    integrationStatus.className = 'status-warning';
    
    // Start tracking workflow
    workflowResults.startTime = new Date();
    workflowResults.repository = wizardState.repository;
    
    // Clear previous mock results
    workflowResults.tickets = {};
    workflowResults.summary = {
        total: 0,
        completed: 0,
        failed: 0,
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0
    };
    
    // Send real command
    sendCommand('master-integration', { repository: wizardState.repository });
    
    // Listen for real results through WebSocket
    if (ws) {
        const integrationHandler = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'integration-update') {
                integrationStatus.innerHTML = `🔄 ${data.stage}: ${data.count} items`;
            }
            
            if (data.type === 'integration-complete') {
                ws.removeEventListener('message', integrationHandler);
                
                integrationStatus.innerHTML = '✅ Integration complete!';
                integrationStatus.className = 'status-success';
                btn.innerHTML = '✅ Complete!';
                
                // Process real results
                if (data.results && data.results.length > 0) {
                    processRealResults(data.results);
                }
                
                // Show completion message
                setTimeout(() => {
                    integrationStatus.innerHTML += `
                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px;">
                            <h5>🎉 Workflow Complete!</h5>
                            <p>Check the terminal output for detailed results.</p>
                            <button class="btn" onclick="showWorkflowSummary()">View Results</button>
                            <button class="btn" style="margin-left: 0.5rem;" onclick="resetWizard()">Start New Workflow</button>
                        </div>
                    `;
                }, 1000);
            }
            
            if (data.type === 'terminal-output') {
                // Show real terminal output
                appendTerminalOutput(data.output);
            }
        };
        
        ws.addEventListener('message', integrationHandler);
    }
}

// Process real results from the backend
function processRealResults(results) {
    workflowResults.endTime = new Date();
    
    // Parse results from master workflow
    results.forEach(result => {
        switch(result.step) {
            case 'fetch-all-branches':
                workflowResults.summary.total = result.count || 0;
                break;
                
            case 'review-changes':
                if (result.reviews) {
                    result.reviews.forEach(review => {
                        workflowResults.tickets[review.branch] = {
                            id: review.branch,
                            agent: review.branch.split('/')[1] || 'unknown',
                            status: review.passed ? 'completed' : 'failed',
                            files: review.files || [],
                            errors: review.issues || []
                        };
                    });
                    workflowResults.summary.completed = result.passed || 0;
                    workflowResults.summary.failed = result.failed || 0;
                }
                break;
                
            case 'merge-to-master':
                if (result.merged) {
                    workflowResults.summary.filesChanged = result.count || 0;
                }
                break;
        }
    });
}

// Override the auto-assign function to track real assignments
function wizardAssignAgents() {
    const mode = document.getElementById('wizard-mode').value;
    const btn = document.getElementById('wizard-assign-btn');
    btn.disabled = true;
    btn.innerHTML = 'Assigning...';
    
    const assignStatus = document.getElementById('assign-status');
    assignStatus.innerHTML = '🤖 Assigning tickets to AI agents...';
    assignStatus.className = 'status-warning';
    
    // Clear tracking
    const agentAssignments = {
        frontend: 0,
        backend: 0,
        database: 0,
        integration: 0,
        testing: 0
    };
    
    // Send real command
    sendCommand('auto-assign-all', { 
        mode: mode,
        repository: wizardState.repository 
    });
    
    // Listen for real assignments
    if (ws) {
        const assignmentHandler = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ticket-assignment') {
                // Track real assignment
                if (agentAssignments[data.agent] !== undefined) {
                    agentAssignments[data.agent]++;
                }
                
                trackTicketStart(data.ticket, data.agent);
                
                // Update UI with real counts
                const assignmentText = Object.entries(agentAssignments)
                    .filter(([_, count]) => count > 0)
                    .map(([agent, count]) => `${agent}: ${count} tickets`)
                    .join(' | ');
                
                assignStatus.innerHTML = `🤖 Assigning tickets... ${assignmentText}`;
            }
            
            if (data.type === 'assignment-complete') {
                ws.removeEventListener('message', assignmentHandler);
                
                wizardState.agentsAssigned = true;
                assignStatus.innerHTML = '✅ All tickets assigned to agents';
                assignStatus.className = 'status-success';
                btn.innerHTML = '✅ Assigned';
                
                // Show real assignments
                const totalAssigned = Object.values(agentAssignments).reduce((a, b) => a + b, 0);
                if (totalAssigned > 0) {
                    assignStatus.innerHTML += `<br><small>${Object.entries(agentAssignments)
                        .filter(([_, count]) => count > 0)
                        .map(([agent, count]) => `${agent}: ${count} tickets`)
                        .join(' | ')}</small>`;
                }
                
                // Enable final step
                document.getElementById('wizard-integrate-btn').disabled = false;
                
                // Move to step 5
                wizardState.currentStep = 5;
                updateWizardUI();
                
                showAlert('info', 'AI Agents are now working on tickets. This may take a few minutes...');
            }
            
            if (data.type === 'agent-complete') {
                // Track real completion
                trackTicketComplete(data.ticket, data.success, {
                    files: [],
                    errors: data.success ? [] : ['Agent execution failed']
                });
            }
        };
        
        ws.addEventListener('message', assignmentHandler);
    }
}

// Add this script to the page to override the mock functions
console.log('Real integration patch loaded - will show actual results instead of simulated data');
