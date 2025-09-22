// Global state for the application
let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// DOM Ready function
document.addEventListener('DOMContentLoaded', function() {
    // Apply saved theme
    applyTheme();
    
    // Check authentication status
    checkAuthStatus();
    
    // Setup dropdown menus
    setupDropdowns();
    
    // Setup theme toggle if it exists on the page
    setupThemeToggle();
});

// Function to apply the current theme
function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
}

// Function to toggle theme
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    
    // Update theme button text if it exists
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.textContent = currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    }
}

// Setup theme toggle functionality
function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
        themeToggleBtn.textContent = currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    }
}

// Check if user is logged in
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        
        // Update UI based on authentication status
        updateAuthUI();
        
        // If on auth pages, redirect to home
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('check.html') || 
            window.location.pathname.includes('form.html')) {
            window.location.href = 'home.html';
        }
    } else {
        // If not logged in and trying to access protected pages
        if (window.location.pathname.includes('home.html') || 
            window.location.pathname.includes('settings.html')) {
            window.location.href = 'index.html';
        }
    }
}

// Update UI based on authentication status
function updateAuthUI() {
    // Update user avatar and name
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (currentUser) {
        if (userAvatar) {
            userAvatar.src = currentUser.profilePic || 'images/User.png';
            userAvatar.alt = currentUser.username;
        }
        
        if (userName) {
            userName.textContent = currentUser.username;
        }
        
        if (authButtons) {
            authButtons.classList.add('hidden');
        }
        
        if (userMenu) {
            userMenu.classList.remove('hidden');
        }
    } else {
        if (authButtons) {
            authButtons.classList.remove('hidden');
        }
        
        if (userMenu) {
            userMenu.classList.add('hidden');
        }
    }
}

// Setup dropdown menus
function setupDropdowns() {
    const userAvatar = document.getElementById('user-avatar');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    if (userAvatar && dropdownMenu) {
        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    window.location.href = 'index.html';
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Add to the top of the page content
    const pageContent = document.querySelector('.page') || document.querySelector('.card');
    if (pageContent) {
        pageContent.insertBefore(alertDiv, pageContent.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}