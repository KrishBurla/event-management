document.addEventListener('DOMContentLoaded', () => {
    loadHandlerDashboard();
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Add modal event listeners
    document.getElementById('handlerSubmitBtn')?.addEventListener('click', submitHandlerDecision);
    document.getElementById('handlerCancelBtn')?.addEventListener('click', closeHandlerModal);
});

async function loadHandlerDashboard() {
    const tableBody = document.getElementById('handlerTableBody');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="6">Loading all committee forms...</td></tr>';
        
        const response = await fetch('/handler/dashboard-data');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data?.events) throw new Error('Invalid data format received');
        
        renderHandlerEvents(data.events);
    } catch (error) {
        console.error('Error loading handler data:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Failed to load data. Error: ${error.message}
                    <button onclick="loadHandlerDashboard()" class="retry-btn">Retry</button>
                </td>
            </tr>
        `;
    }
}

function renderHandlerEvents(events) {
    const tableBody = document.getElementById('handlerTableBody');
    if (!tableBody) return;
    
    if (!events?.length) {
        tableBody.innerHTML = '<tr><td colspan="6">No forms submitted yet</td></tr>';
        return;
    }

    tableBody.innerHTML = events.map(event => `
        <tr>
            <td>${event.id || 'N/A'}</td>
            <td>${event.event_name || 'N/A'}</td>
            <td>${event.committee_name || 'N/A'}</td>
            <td class="tooltip-cell">
                ${renderMentorStatus(event.mentor_status)}
                ${event.mentor_comment ? `
                <span class="tooltip-text">Mentor Comment: ${event.mentor_comment}</span>
                ` : ''}
            </td>
            <td class="status-${event.handler_status || 'pending'}">
                ${formatStatus(event.handler_status)}
            </td>
            <td class="actions">
                <button class="view-btn" onclick="viewDetails(${event.id}, 'handler')">View</button>
                ${renderActionButtons(event)}
            </td>
        </tr>
    `).join('');
}

function renderActionButtons(event) {
    if (event.mentor_status !== 'approved') {
        return '<span class="waiting-text">Waiting for mentor</span>';
    }
    
    if (event.handler_status !== 'pending') {
        return ''; // No buttons needed if already processed
    }
    
    return `
        <button class="approve-btn" onclick="openHandlerModal(${event.id}, 'approve')">Approve</button>
        <button class="deny-btn" onclick="openHandlerModal(${event.id}, 'reject')">Reject</button>
    `;
}

function renderMentorStatus(status) {
    if (!status || status === 'pending') return '⏳ Pending';
    return status === 'approved' ? '✅ Approved' : '❌ Rejected';
}

function formatStatus(status) {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

let currentHandlerEventId = null;
let currentHandlerAction = null;

async function openHandlerModal(eventId, action) {
    try {
        currentHandlerEventId = Number(eventId); // Ensure it's a number
        if (isNaN(currentHandlerEventId)) {
            throw new Error('Invalid event ID');
        }
        currentHandlerAction = action;
        
        const response = await fetch(`/handler/view-event-data?id=${currentHandlerEventId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load event details`);
        }
        
        const data = await response.json();
        const feedbackSection = document.getElementById('mentorFeedback');
        if (feedbackSection) {
            feedbackSection.innerHTML = data.mentor_comment 
                ? `<h3>Mentor Feedback</h3><p>"${data.mentor_comment}"</p>`
                : '<p>No mentor comments</p>';
        }
        
        const modal = document.getElementById('handlerModal');
        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening modal:', error);
        showNotification(error.message || 'Failed to load event details', 'error');
    }
}

function closeHandlerModal() {
    const modal = document.getElementById('handlerModal');
    if (modal) modal.style.display = 'none';
    
    const commentField = document.getElementById('handlerComment');
    if (commentField) commentField.value = '';
    
    const feedbackSection = document.getElementById('mentorFeedback');
    if (feedbackSection) feedbackSection.innerHTML = '';
}

async function submitHandlerDecision() {
    const commentField = document.getElementById('handlerComment');
    const comment = commentField?.value.trim(); // Get the trimmed value or undefined
    
    try {
        // Validate we have required values
        if (!currentHandlerEventId || isNaN(currentHandlerEventId)) {
            throw new Error('Missing or invalid event ID');
        }

        if (!currentHandlerAction) {
            throw new Error('Missing action parameter');
        }

        const response = await fetch('/handler/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: Number(currentHandlerEventId),
                action: currentHandlerAction,
                comment: comment || null // Explicitly set to null if undefined or empty
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Update failed with status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Update was not successful');
        }

        closeHandlerModal();
        showNotification(`Successfully ${currentHandlerAction === 'approve' ? 'approved' : 'rejected'} the event`);
        loadHandlerDashboard();
    } catch (error) {
        console.error('Submission error:', error);
        showNotification(`Update failed: ${error.message}`, 'error');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function viewDetails(eventId, role) {
    window.location.href = `view-event.html?id=${eventId}&role=${role}`;
}

function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    })
    .catch(error => {
        console.error('Logout failed:', error);
        showNotification('Logout failed. Please try again.', 'error');
    });
}