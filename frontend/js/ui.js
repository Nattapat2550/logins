// Global message function (uses #message div on pages)
function showMessage(message, isSuccess = false) {
    const msgDiv = document.getElementById('message');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = isSuccess ? 'success' : 'error';
}

// Toggle theme (CSS class + localStorage)
function toggleTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
}

// Apply saved theme on load
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    toggleTheme(savedTheme);
}

// Password hide toggle (for login.html checkbox)
function passwordHide(checkboxId, inputId) {
    const checkbox = document.getElementById(checkboxId);
    const input = document.getElementById(inputId);
    if (checkbox && input) {
        checkbox.addEventListener('change', (e) => {
            input.type = e.target.checked ? 'text' : 'password';
        });
    }
}

// File upload progress (for settings.html)
function fileUpload(inputId, progressId) {
    const input = document.getElementById(inputId);
    const progress = document.getElementById(progressId);
    if (input && progress) {
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                progress.style.display = 'block';
                progress.querySelector('.progress-bar').style.width = '0%';
                // Progress simulated; real progress via XMLHttpRequest if needed
                setTimeout(() => {
                    progress.querySelector('.progress-bar').style.width = '100%';
                }, 500);
            }
        });
    }
}

// Modal open/close
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modals on outside click or X
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal.id));
        }
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
});

// Load user profile (fetch + apply pic/theme/username)
async function loadUser () {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const profile = await getProfile();  // From auth.js
        if (profile.success) {
            // Update profile pic
            const profilePic = document.getElementById('profilePic');
            if (profilePic) profilePic.src = profile.user.profile_pic || 'user.png';

            // Update username (e.g., in home.html)
            const usernameSpan = document.getElementById('username');
            if (usernameSpan) usernameSpan.textContent = profile.user.username;

            // Apply theme
            toggleTheme(profile.user.theme);

            return true;
        }
    } catch (err) {
        console.error('Load user error:', err);
        clearToken();
        window.location.href = 'login.html';
    }
    return false;
}

// Initialize navbar (for protected pages: home, admin, settings, about, contact)
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const token = localStorage.getItem('token');
    if (!token) {
        navbar.innerHTML = '<div class="nav-left"><h1>MyAuthApp</h1></div>';  // Simple if not logged in
        return;
    }

    // Load user for pic/username
    loadUser ().then((loaded) => {
        if (!loaded) return;

        navbar.innerHTML = `
            <div class="nav-left">
                <h1>MyAuthApp</h1>
                <a href="about.html">About</a>
                <a href="contact.html">Contact</a>
            </div>
            <div class="nav-right" id="profileDropdown">
                <img src="user.png" alt="Profile" id="profilePic" class="profile-pic">
                <div class="dropdown" id="dropdownMenu">
                    <a href="settings.html">Settings</a>
                    <a href="#" id="logout">Logout</a>
                </div>
            </div>
        `;

        // Dropdown toggle on click (mobile-friendly)
        const dropdown = document.getElementById('profileDropdown');
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Close on outside click
        document.addEventListener('click', () => dropdown.classList.remove('active'));

        // Logout
        document.getElementById('logout').addEventListener('click', (e) => {
            e.preventDefault();
            clearToken();
            window.location.href = 'index.html';
        });
    });

    // Apply theme
    applySavedTheme();
}

// Auto-init on pages with navbar (run on DOM load)
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.navbar')) {
        initNavbar();
    }
    applySavedTheme();  // Always apply saved theme
});