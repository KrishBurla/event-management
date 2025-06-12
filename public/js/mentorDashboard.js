document.addEventListener('DOMContentLoaded', () => {
    loadMentorDashboard();
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Add modal event listeners
    document.getElementById('mentorSubmitBtn')?.addEventListener('click', submitMentorDecision);
    document.getElementById('mentorCancelBtn')?.addEventListener('click', closeMentorModal);
});

async function loadMentorDashboard() {
    const tableBody = document.getElementById('mentorTableBody');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="6">Loading your committee forms...</td></tr>';
        
        const response = await fetch('/mentor/dashboard-data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!data?.events) throw new Error('Invalid data format received');
        
        renderMentorEvents(data.events);
    } catch (error) {
        console.error('Error loading mentor data:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Failed to load data. Error: ${error.message}
                    <button onclick="loadMentorDashboard()" class="retry-btn">Retry</button>
                </td>
            </tr>
        `;
    }
}

function renderMentorEvents(events) {
    const tableBody = document.getElementById('mentorTableBody');
    if (!tableBody) return;
    
    if (!events?.length) {
        tableBody.innerHTML = '<tr><td colspan="6">No forms submitted from your committee yet</td></tr>';
        return;
    }

    tableBody.innerHTML = events.map(event => `
        <tr>
            <td>${event.id || 'N/A'}</td>
            <td>${event.event_name || 'N/A'}</td>
            <td>${event.username || 'N/A'}</td>
            <td>${formatDate(event.date_filled)}</td>
            <td class="status-${event.mentor_status || 'pending'}">
                ${formatStatus(event.mentor_status)}
            </td>
            <td class="actions">
                <button class="view-btn" onclick="viewDetails(${event.id}, 'mentor')">View</button>
                ${event.mentor_status === 'pending' ? `
                <button class="approve-btn" onclick="openMentorModal(${event.id}, 'approve')">Approve</button>
                <button class="deny-btn" onclick="openMentorModal(${event.id}, 'reject')">Reject</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function formatStatus(status) {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

let currentMentorEventId = null;
let currentMentorAction = null;

function openMentorModal(eventId, action) {
    currentMentorEventId = eventId;
    currentMentorAction = action;
    
    const modal = document.getElementById('mentorModal');
    if (modal) {
        modal.style.display = 'flex';
        const title = document.getElementById('modalTitle');
        if (title) {
            title.textContent = `${action === 'approve' ? 'Approve' : 'Reject'} Event`;
        }
    }
}

function closeMentorModal() {
    const modal = document.getElementById('mentorModal');
    if (modal) modal.style.display = 'none';
    
    const commentField = document.getElementById('mentorComment');
    if (commentField) commentField.value = '';
}

async function submitMentorDecision() {
    const commentField = document.getElementById('mentorComment');
    const comment = commentField?.value || '';
    
    try {
        const response = await fetch('/mentor/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: currentMentorEventId,
                action: currentMentorAction, // Changed from 'status' to 'action'
                comment: comment
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data?.success) {
            throw new Error(data?.error || 'Failed to update status');
        }
        
        closeMentorModal();
        loadMentorDashboard(); // Refresh the data instead of full page reload
    } catch (error) {
        console.error('Error submitting mentor decision:', error);
        alert(error.message || 'Failed to update status. Please try again.');
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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
        alert('Logout failed. Please try again.');
    });
}