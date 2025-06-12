document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const role = urlParams.get('role') || 'admin'; // Default to admin if not specified
    const container = document.getElementById('eventDetails');
    
    if (!container) return;

    if (!eventId) {
        showError('Invalid event ID', true, role);
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading event details...</p>
        </div>
    `;

    // Use the role-specific endpoint
    fetch(`/${role}/view-event-data?id=${eventId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(event => {
            if (!event || !event.event_name) {
                throw new Error('Invalid event data received');
            }

            container.innerHTML = `
                <div class="detail-section">
                    <h2>Basic Information</h2>
                    <div class="detail-row">
                        <div class="detail-label">Event ID:</div>
                        <div class="detail-value">${event.id || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Event Name:</div>
                        <div class="detail-value">${event.event_name}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Submitted By:</div>
                        <div class="detail-value">${event.username || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Committee:</div>
                        <div class="detail-value">${event.committee_name || 'N/A'}</div>
                    </div>
                    ${event.status_name ? `
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value status-${event.status_name.toLowerCase()}">
                            ${event.status_name}
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h2>Event Schedule</h2>
                    <div class="detail-row">
                        <div class="detail-label">Date Filled:</div>
                        <div class="detail-value">${formatDate(event.date_filled)}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Venue:</div>
                        <div class="detail-value">${event.venue || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date From:</div>
                        <div class="detail-value">${formatDate(event.date_from)}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date To:</div>
                        <div class="detail-value">${formatDate(event.date_to)}</div>
                    </div>
                    ${event.time_slot ? `
                    <div class="detail-row">
                        <div class="detail-label">Time Slot:</div>
                        <div class="detail-value">${event.time_slot}</div>
                    </div>
                    ` : ''}
                    ${event.duration ? `
                    <div class="detail-row">
                        <div class="detail-label">Duration:</div>
                        <div class="detail-value">${event.duration}</div>
                    </div>
                    ` : ''}
                </div>

                ${(event.extra_requirements || event.catering_requirements) ? `
                <div class="detail-section">
                    <h2>Requirements</h2>
                    ${event.extra_requirements ? `
                    <div class="requirements-section">
                        <h3>Extra Requirements</h3>
                        <p>${event.extra_requirements}</p>
                    </div>
                    ` : ''}
                    ${event.catering_requirements ? `
                    <div class="requirements-section">
                        <h3>Catering Requirements</h3>
                        <p>${event.catering_requirements}</p>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${event.admin_comment ? `
                <div class="detail-section">
                    <h2>Admin Feedback</h2>
                    <div class="admin-feedback">
                        <p>${event.admin_comment}</p>
                    </div>
                </div>
                ` : ''}

                ${event.mentor_comment ? `
                <div class="detail-section">
                    <h2>Mentor Feedback</h2>
                    <div class="mentor-feedback">
                        <p>${event.mentor_comment}</p>
                    </div>
                </div>
                ` : ''}

                ${event.handler_comment ? `
                <div class="detail-section">
                    <h2>Handler Feedback</h2>
                    <div class="handler-feedback">
                        <p>${event.handler_comment}</p>
                    </div>
                </div>
                ` : ''}
            `;

            // Updated back button logic
            const backButton = document.createElement('a');
            backButton.href = `/${role}Dashboard.html`;
            backButton.className = 'back-btn';
            backButton.textContent = 'Back to Dashboard';
            container.appendChild(backButton);
        })
        .catch(error => {
            console.error('Error loading event details:', error);
            showError(`Failed to load event details: ${error.message}`, false, role);
        });

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    }

    function showError(message, redirect = false, role = 'admin') {
        container.innerHTML = `
            <div class="error-state">
                <p>${message}</p>
                <a href="/${role}Dashboard.html" class="back-btn">
                    Back to Dashboard
                </a>
            </div>
        `;
        if (redirect) {
            setTimeout(() => {
                window.location.href = `/${role}Dashboard.html`;
            }, 3000);
        }
    }
});