document.addEventListener("DOMContentLoaded", () => {
  const title = document.querySelector("h1");
  if (!title || title.style.display === "none" || title.style.visibility === "hidden") {
      console.error("The title 'Event Form' is not visible.");
  }

  // event listener for form submission
  const form = document.getElementById("mainForm");
  if (form) {
      form.addEventListener("submit", handleFormSubmit);
      
      // real-time availability checkers only for specific venues
      document.getElementById('venue')?.addEventListener('change', checkAvailability);
      ['dateFrom', 'dateTo'].forEach(id => {
          document.getElementById(id)?.addEventListener('change', () => {
              const venue = document.getElementById("venue").value;
              if (shouldCheckAvailability(venue)) {
                  checkAvailability();
              }
          });
      });
  }
});

async function handleFormSubmit(event) {
  event.preventDefault();
  
  const venue = document.getElementById("venue").value;

  // check availability for specific venues
  if (shouldCheckAvailability(venue)) {
      const { dateFrom, dateTo } = getFormValues();
      const availabilityResponse = await fetch('/check-venue-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venue, dateFrom, dateTo })
      });
      
      const { available, conflicts } = await availabilityResponse.json();
      
      if (!available) {
          let errorMsg = 'Venue is already booked for these dates. Conflicts with:\n';
          conflicts.forEach(event => {
              errorMsg += `- "${event.event_name}" (${formatDate(event.date_from)}`;
              if (event.date_to !== event.date_from) errorMsg += ` to ${formatDate(event.date_to)}`;
              if (event.time_slot) errorMsg += ` at ${event.time_slot}`;
              errorMsg += ')\n';
          });
          showFormError(errorMsg);
          return false;
      }
  }

  // validate form
  if (!validateMainForm()) {
      return false;
  }

  // Prepare form data
  const formData = {
      eventName: document.getElementById("eventName").value.trim(),
      dateFilled: document.getElementById("dateFilled").value.trim(),
      committeeName: document.getElementById("committeeName").value.trim(),
      venue: document.getElementById("venue").value.trim(),
      dateFrom: document.getElementById("dateFrom").value.trim(),
      dateTo: document.getElementById("dateTo").value.trim(),
      timeSlot: document.getElementById("timeSlot").value.trim(),
      duration: document.getElementById("duration").value.trim(),
      extraRequirements: document.getElementById("extraRequirements").value.trim(),
      cateringRequirements: document.getElementById("cateringRequirements").value.trim()
  };

  try {
      // Show loading state
      const submitButton = document.querySelector("#mainForm button[type='submit']");
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      const response = await fetch('/submit-event', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include'
      });

      if (response.ok) {
          // redirect to status page after successful submission
          window.location.href = '/status.html';
      } else {
          const data = await response.json();
          if (data.error) {
              showFormError(data.error);
          }
      }
  } catch (error) {
      console.error('Submission error:', error);
      showFormError('Failed to submit form. Please try again.');
  } finally {
      // Reset button state
      const submitButton = document.querySelector("#mainForm button[type='submit']");
      if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
      }
  }
}

// function to check venue availability in real-time
// List of venues that need availability checking
const VENUES_TO_CHECK = [
  "Library",
  "Big Seminar Hall",
  "Small Seminar Hall",
  "Canopy",
  "Canteen"
];

function shouldCheckAvailability(venue) {
  return VENUES_TO_CHECK.includes(venue);
}

// checkAvailability function
async function checkAvailability() {
const venue = document.getElementById("venue").value;

// check for specific venues
if (!shouldCheckAvailability(venue)) {
    const messageEl = document.getElementById('availabilityMessage');
    if (messageEl) messageEl.remove();
    return;
}

const { dateFrom, dateTo } = getFormValues();

// check if we have minimum required fields
if (!venue || !dateFrom || !dateTo) return;

try {
    const response = await fetch('/check-venue-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue, dateFrom, dateTo })
    });
    
    const data = await response.json();
    const messageEl = document.getElementById('availabilityMessage') || createMessageElement();
    
    if (data.available) {
        messageEl.textContent = '✅ Venue is available!';
        messageEl.style.color = 'green';
    } else {
        let msg = '❌ Venue already booked for these date(s)/time';
        messageEl.textContent = msg;
        messageEl.style.color = 'red';
        messageEl.style.whiteSpace = 'pre-wrap';
    }
} catch (error) {
    console.error('Availability check failed:', error);
}
}

// function to create availability message element
function createMessageElement() {
  const el = document.createElement('div');
  el.id = 'availabilityMessage';
  el.style.margin = '10px 0';
  el.style.padding = '10px';
  el.style.borderRadius = '4px';
  document.querySelector('form').prepend(el);
  return el;
}

// function to get form values
function getFormValues() {
  return {
      venue: document.getElementById("venue").value,
      dateFrom: document.getElementById("dateFrom").value,
      dateTo: document.getElementById("dateTo").value
  };
}

// function to format dates
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function validateMainForm() {
  let isValid = true;

  // Validate date filled
  const dateFilled = document.getElementById("dateFilled").value;
  const dateFilledError = document.getElementById("dateFilledError");
  const datePattern = /^\d{2}-\d{2}-\d{4}$/; // DD-MM-YYYY format
  if (dateFilled.trim() === "") {
      dateFilledError.textContent = "Date filled is required.";
      dateFilledError.style.display = "block";
      isValid = false;
  } else if (!datePattern.test(dateFilled)) {
      dateFilledError.textContent = "Date must be in DD-MM-YYYY format.";
      dateFilledError.style.display = "block";
      isValid = false;
  } else {
      dateFilledError.style.display = "none";
  }

  // Validate event name
  const eventName = document.getElementById("eventName").value;
  const eventNameError = document.getElementById("eventNameError");
  if (eventName.trim() === "") {
      eventNameError.textContent = "Event meeting name is required.";
      eventNameError.style.display = "block";
      isValid = false;
  } else {
      eventNameError.style.display = "none";
  }

  // Validate committee name
  const committeeName = document.getElementById("committeeName").value;
  const committeeNameError = document.getElementById("committeeNameError");
  if (committeeName.trim() === "") {
      committeeNameError.textContent = "Committee/school & section name is required.";
      committeeNameError.style.display = "block";
      isValid = false;
  } else {
      committeeNameError.style.display = "none";
  }

  // Validate venue
  const venue = document.getElementById("venue").value;
  const venueError = document.getElementById("venueError");
  if (venue.trim() === "") {
      venueError.textContent = "Please select a venue.";
      venueError.style.display = "block";
      isValid = false;
  } else {
      venueError.style.display = "none";
  }

  // Validate date from
  const dateFrom = document.getElementById("dateFrom").value;
  const dateFromError = document.getElementById("dateFromError");
  if (dateFrom.trim() === "") {
      dateFromError.textContent = "Start date is required.";
      dateFromError.style.display = "block";
      isValid = false;
  } else if (!datePattern.test(dateFrom)) {
      dateFromError.textContent = "Date must be in DD-MM-YYYY format.";
      dateFromError.style.display = "block";
      isValid = false;
  } else {
      dateFromError.style.display = "none";
  }

  // Validate date to
  const dateTo = document.getElementById("dateTo").value;
  const dateToError = document.getElementById("dateToError");
  if (dateTo.trim() === "") {
      dateToError.textContent = "End date is required.";
      dateToError.style.display = "block";
      isValid = false;
  } else if (!datePattern.test(dateTo)) {
      dateToError.textContent = "Date must be in DD-MM-YYYY format.";
      dateToError.style.display = "block";
      isValid = false;
  } else {
      dateToError.style.display = "none";
  }

  // Scroll to the top of the page if the form is invalid
  if (!isValid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return isValid;
}

function showFormError(message) {
  const errorElement = document.getElementById("formError") || document.createElement("div");
  errorElement.textContent = message;
  errorElement.style.color = "red";
  errorElement.style.marginTop = "10px";
  
  if (!document.getElementById("formError")) {
      errorElement.id = "formError";
      const form = document.getElementById("mainForm");
      form.appendChild(errorElement);
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function calculateDuration(timeFrom, timeTo) {
  const parseTime = (time) => {
      const [hours, minutes] = time.split(/[: ]/);
      const period = time.includes("PM") ? "PM" : "AM";
      let hour = parseInt(hours, 10);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return hour * 60 + parseInt(minutes, 10);
  };

  const fromMinutes = parseTime(timeFrom);
  const toMinutes = parseTime(timeTo);
  const durationMinutes = toMinutes - fromMinutes;

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours} hours and ${minutes} minutes`;
}