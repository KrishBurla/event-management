document.addEventListener('DOMContentLoaded', () => {
  // Show loading state
  const statusTableBody = document.getElementById('statusTableBody');
  if (!statusTableBody) {
    console.error('Status table body element not found');
    return;
  }

  statusTableBody.innerHTML = '<tr><td colspan="7">Loading data...</td></tr>';

  // Helper function for safe date formatting
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  }

  fetch('/student/status-data')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data); // Log received data for debugging

      if (!data.events || !Array.isArray(data.events)) {
        throw new Error('Invalid data format received');
      }

      // Clear loading message
      statusTableBody.innerHTML = '';

      if (data.events.length === 0) {
        statusTableBody.innerHTML = '<tr><td colspan="7">No events found</td></tr>';
        return;
      }

      data.events.forEach(event => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${event.event_name || 'N/A'}</td>
          <td>${formatDate(event.date_filled)}</td>
          <td>${event.venue || 'N/A'}</td>
          <td>${formatDate(event.date_from)}</td>
          <td>${formatDate(event.date_to)}</td>
          <td class="status-${event.status_name ? event.status_name.toLowerCase() : 'unknown'}">
            ${event.status_name || 'N/A'}
          </td>
          <td class="admin-comment">${event.admin_comment || 'No comments'}</td>
        `;

        statusTableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Error loading status data:', error);
      statusTableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Failed to load data. Error: ${error.message}
            <button onclick="window.location.reload()" class="retry-btn">Retry</button>
          </td>
        </tr>
      `;
    });
});