function validateForm() {
  let isValid = true;

  // Validate username
  const username = document.getElementById("username").value;
  const usernameError = document.getElementById("usernameError");
  if (username.trim() === "") {
      usernameError.textContent = "Username is required.";
      usernameError.style.display = "block";
      isValid = false;
  } else {
      usernameError.style.display = "none";
  }

  // Validate password
  const password = document.getElementById("password").value;
  const passwordError = document.getElementById("passwordError");
  if (password.trim() === "") {
      passwordError.textContent = "Password is required.";
      passwordError.style.display = "block";
      isValid = false;
  } else {
      passwordError.style.display = "none";
  }

  // Display a general error message if the form is invalid
  const formError = document.getElementById("formError");
  if (!isValid) {
      formError.textContent = "Please fill in all required fields.";
      formError.style.display = "block";
  } else {
      formError.style.display = "none";
      // Redirect to the form page if the form is valid
      window.location.href = "form.html"; // Change "form.html" to the actual form page URL
  }

  return isValid;
}

// Updated handleLogin function in script.js
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");
  const formError = document.getElementById("formError");

  // Clear previous errors
  usernameError.textContent = "";
  passwordError.textContent = "";
  formError.textContent = "";
  usernameError.style.display = "none";
  passwordError.style.display = "none";

  // Basic validation
  if (!username) {
    usernameError.textContent = "Username is required.";
    usernameError.style.display = "block";
    return;
  }

  if (!password) {
    passwordError.textContent = "Password is required.";
    passwordError.style.display = "block";
    return;
  }

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    if (response.redirected) {
      window.location.href = response.url;
    } else {
      const data = await response.json();
      if (data.error) {
        if (data.errorType === 'username') {
          usernameError.textContent = data.error;
          usernameError.style.display = "block";
        } else if (data.errorType === 'password') {
          passwordError.textContent = data.error;
          passwordError.style.display = "block";
        } else {
          formError.textContent = data.error;
        }
      }
    }
  } catch (error) {
    formError.textContent = "Login failed. Please try again.";
    console.error('Login error:', error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});