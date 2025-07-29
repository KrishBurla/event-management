document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Apply the saved theme on page load
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        if(themeToggle) themeToggle.checked = true;
    }

    // Listener for the theme toggle switch
    if(themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }
});
