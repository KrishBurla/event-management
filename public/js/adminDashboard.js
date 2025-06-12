document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadCommitteeStats();
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
});

function loadDashboardData() {
    const tableBody = document.getElementById('formTableBody');
    tableBody.innerHTML = '<tr><td colspan="9">Loading data...</td></tr>';

    fetch('/admin/dashboard-data')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.events || !Array.isArray(data.events)) {
                throw new Error('Invalid data format received');
            }
            renderEvents(data.events);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        Failed to load data. Error: ${error.message}
                        <button onclick="loadDashboardData()" class="retry-btn">Retry</button>
                    </td>
                </tr>
            `;
        });
}

function renderEvents(events) {
    const tableBody = document.getElementById('formTableBody');
    tableBody.innerHTML = '';

    if (events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9">No events found</td></tr>';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('tr');
        
        const approvalMessage = getApprovalStatusMessage(event);
        const canApprove = canAdminApprove(event);
        const canDeny = canAdminDeny(event);
        const isRejectedBySomeone = event.mentor_status === 'rejected' || event.handler_status === 'rejected';
        
        row.innerHTML = `
            <td>${event.id}</td>
            <td>${event.event_name}</td>
            <td>${event.username}</td>
            <td class="tooltip-cell">
                ${renderStatusBadge(event.mentor_status)}
                ${event.mentor_comment ? `
                <span class="tooltip-text">Mentor Comment: ${event.mentor_comment}</span>
                ` : ''}
            </td>
            <td class="tooltip-cell">
                ${renderStatusBadge(event.handler_status)}
                ${event.handler_comment ? `
                <span class="tooltip-text">Handler Comment: ${event.handler_comment}</span>
                ` : ''}
            </td>
            <td>${formatDate(event.date_filled)}</td>
            <td class="status-${event.status_name.toLowerCase()}">${event.status_name}</td>
            <td class="actions">
                <button class="view-btn" onclick="viewDetails(${event.id}, 'admin')">View</button>
                ${canApprove && !isRejectedBySomeone ? `
                <button class="approve-btn" data-id="${event.id}">${event.status_name === 'Rejected' ? 'Re-approve' : 'Approve'}</button>
                ` : `
                <button class="approve-btn disabled" disabled title="${approvalMessage}">Approve</button>
                `}
                ${canDeny ? `
                <button class="deny-btn" data-id="${event.id}">${event.status_name === 'Approved' ? 'Re-reject' : 'Deny'}</button>
                ` : `
                <button class="deny-btn disabled" disabled title="Event is already rejected">Deny</button>
                `}
            </td>
            <td>
                <button class="delete-btn" onclick="deleteEvent(${event.id})">Delete</button>
            </td>
        `;
        
        // Add event listeners to the buttons
        if (canApprove && !isRejectedBySomeone) {
            row.querySelector('.approve-btn').addEventListener('click', () => openModal(event.id, 'approve'));
        }
        if (canDeny) {
            row.querySelector('.deny-btn').addEventListener('click', () => openModal(event.id, 'deny'));
        }
        
        tableBody.appendChild(row);
    });
}

function renderStatusBadge(status) {
    if (!status || status === 'pending') {
        return '<span class="status-badge pending">⏳ Pending</span>';
    }
    return status === 'approved' 
        ? '<span class="status-badge approved">✅ Approved</span>'
        : '<span class="status-badge rejected">❌ Rejected</span>';
}

function canAdminApprove(event) {
    // Admin can approve only if:
    // 1. Both mentor and handler have approved
    // 2. Event is either Pending or Rejected (to allow reversing rejection)
    return event.mentor_status === 'approved' && 
           event.handler_status === 'approved' &&
           (event.status_name === 'Pending' || event.status_name === 'Rejected');
}

function canAdminDeny(event) {
    // Admin can deny unless event is already rejected
    return event.status_name !== 'Rejected';
}

function getApprovalStatusMessage(event) {
    if (event.mentor_status === 'rejected' || event.handler_status === 'rejected') {
        return 'Cannot approve - form was rejected by ' + 
               (event.mentor_status === 'rejected' && event.handler_status === 'rejected' 
                ? 'both mentor and handler' 
                : event.mentor_status === 'rejected' 
                  ? 'mentor' 
                  : 'handler');
    }
    if (event.status_name === 'Approved') {
        return 'Event is already approved';
    }
    if (event.mentor_status !== 'approved') {
        return `Mentor status: ${event.mentor_status || 'pending'}`;
    }
    if (event.handler_status !== 'approved') {
        return `Handler status: ${event.handler_status || 'pending'}`;
    }
    return event.status_name === 'Pending' 
        ? 'Ready for admin approval' 
        : 'Can reverse rejection decision';
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        const response = await fetch(`/admin/delete-event?id=${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Event deleted successfully');
            loadDashboardData();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Failed to delete event', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete event. Please try again.', 'error');
    }
}

function loadCommitteeStats() {
    const statsBody = document.getElementById('statsBody');
    statsBody.innerHTML = '<tr><td colspan="5">Loading statistics...</td></tr>';

    fetch('/admin/committee-stats')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.stats) throw new Error('Invalid stats data format received');

            statsBody.innerHTML = data.stats.map(stat => {
                const avgDuration = stat.avg_duration_days;
                const formattedDuration = (avgDuration && !isNaN(avgDuration)) 
                    ? parseFloat(avgDuration).toFixed(1) : '0';

                return `
                <tr>
                    <td>${stat.committee_name}</td>
                    <td>${stat.event_count}</td>
                    <td>${stat.approved_count}</td>
                    <td>${stat.rejected_count}</td>
                    <td>${formattedDuration}</td>
                </tr>
                `;
            }).join('');
        })
        .catch(error => {
            console.error('Error loading committee stats:', error);
            statsBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        Failed to load statistics: ${error.message}
                        <button onclick="loadCommitteeStats()" class="retry-btn">Retry</button>
                    </td>
                </tr>
            `;
        });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        console.error('Date formatting error:', e);
        return 'N/A';
    }
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

// Modal functions
let currentEventId = null;
let currentAction = null;

function openModal(eventId, action) {
    currentEventId = eventId;
    currentAction = action;
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = action === 'approve' ? 'Approve Event' : 'Reject Event';
    document.getElementById('commentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('commentModal').style.display = 'none';
    document.getElementById('commentText').value = '';
}

// Event listeners for modal buttons
document.getElementById('submitComment')?.addEventListener('click', submitModalAction);
document.getElementById('cancelComment')?.addEventListener('click', closeModal);

async function submitModalAction() {
    const comment = document.getElementById('commentText').value;
    
    if (!currentEventId || !currentAction) {
        showNotification('Missing event ID or action', 'error');
        return;
    }

    try {
        const response = await fetch('/admin/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: currentEventId,
                status: currentAction === 'approve' ? 'Approved' : 'Rejected',
                comment: comment || null
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update status');
        }

        if (data.success) {
            showNotification(`Event ${currentAction === 'approve' ? 'approved' : 'rejected'} successfully`);
            closeModal();
            loadDashboardData();
        } else {
            throw new Error(data.message || 'Update was not successful');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(`Failed to update status: ${error.message}`, 'error');
    }
}

function viewDetails(eventId, role) {
  window.location.href = `view-event.html?id=${eventId}&role=${role}`;
}

document.getElementById('cancelComment').addEventListener('click', closeModal);

// Filter functionality
document.getElementById('statusFilter').addEventListener('change', function() {
    filterEvents(this.value);
});

function filterEvents(status) {
    const rows = document.querySelectorAll('#formTableBody tr');
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(7)');
        const rowStatus = statusCell ? statusCell.textContent : '';
        row.style.display = (status === 'all' || rowStatus === status) ? '' : 'none';
    });
}

// Collapsible section
document.getElementById('eventsHeader').addEventListener('click', function() {
    this.parentElement.classList.toggle('collapsed');
});