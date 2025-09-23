// Global UI initialization
function initUI() {
    // Load and apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    
    // Set up global event listeners
    setupGlobalListeners();
}

// Setup global listeners (e.g., close dropdown on outside click)
function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdown');
        const profileImg = document.getElementById('profileImg');
        if (dropdown && profileImg && !e.target.closest('.nav-right') && !e.target.closest('#profileImg')) {
            dropdown.style.display = 'none';
        }
    });
}

// Toggle dropdown visibility
function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
    }
}

// Toggle theme (light/dark mode)
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // Update any dynamic elements if needed (e.g., re-apply to dropdown)
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';  // Close dropdown on theme change
    }
}

// Logout: Clear localStorage and redirect
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tempEmail');  // Clear any temp data
    // Close dropdown if open
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
    window.location.href = 'index.html';
}

// Protected route check: Returns {user, token} if valid, else redirects
function checkAuth(redirectTo = 'login.html', requireAdmin = false) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
        window.location.href = redirectTo;
        return false;
    }
    try {
        const user = JSON.parse(userStr);
        if (requireAdmin && user.role !== 'admin') {
            window.location.href = 'home.html';
            return false;
        }
        return { user, token };
    } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = redirectTo;
        return false;
    }
}

// Admin-specific: Load users list (for admin.html) - uses getAdminUsers from auth.js
async function loadAdminUsers() {
    const auth = checkAuth('login.html', true);
    if (!auth) return;
    
    try {
        const usersListEl = document.getElementById('usersList');
        if (!usersListEl) return;
        
        usersListEl.innerHTML = '<div class="loading">Loading users...</div>';
        const users = await getAdminUsers();  // Global from auth.js
        
        let html = '<ul>';
        users.forEach(u => {
            html += `
                <li>
                    <span>${u.username || u.email} (ID: ${u.id}, Role: ${u.role}, Verified: ${u.verified ? 'Yes' : 'No'})</span>
                    <div>
                        <button onclick="editUser (${u.id})" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-right: 5px;">Edit</button>
                        <button onclick="deleteUser (${u.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px;">Delete</button>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        usersListEl.innerHTML = html;
    } catch (err) {
        const usersListEl = document.getElementById('usersList');
        if (usersListEl) {
            usersListEl.innerHTML = `<div class="error">Error loading users: ${err.message}</div>`;
        }
        showMessage(`Failed to load users: ${err.message}`, true);
    }
}

// Admin: Edit user (prompt-based for simplicity; calls updateUser  from auth.js)
window.editUser  = async (id) => {
    const username = prompt('New username (leave blank to keep current):') || undefined;
    const role = prompt('New role (user/admin, leave blank to keep current):') || undefined;
    const verifiedStr = prompt('Set verified? (true/false, leave blank to keep current):');
    const verified = verifiedStr === '' ? undefined : (verifiedStr.toLowerCase() === 'true');
    
    const updates = {};
    if (username !== undefined && username.trim() !== '') updates.username = username.trim();
    if (role !== undefined && role.trim() !== '') updates.role = role.trim();
    if (verified !== undefined) updates.verified = verified;
    
    if (Object.keys(updates).length === 0) {
        showMessage('No changes specified.', false);
        return;
    }
    
    try {
        const result = await updateUser (id, updates);  // Global from auth.js
        showMessage(result.message || result.error, !result.success);
        if (result.success) {
            loadAdminUsers();  // Reload list
        }
    } catch (err) {
        showMessage(`Error updating user: ${err.message}`, true);
    }
};

// Admin: Delete user (confirm + call deleteAdminUser  from auth.js)
window.deleteUser  = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await deleteAdminUser (id);  // Global from auth.js
        showMessage(result.message || result.error, !result.success);
        if (result.success) {
            loadAdminUsers();  // Reload list
        }
    } catch (err) {
        showMessage(`Error deleting user: ${err.message}`, true);
    }
};

// Show message: Updates #message div with text and optional error styling
function showMessage(text, isError = false) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    
    messageEl.textContent = text;
    messageEl.style.display = 'block';  // Show it
    
    if (isError) {
        messageEl.classList.add('error');
    } else {
        messageEl.classList.remove('error');
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Expose functions globally for HTML <script> tags and onclick handlers
window.initUI = initUI;
window.toggleDropdown = toggleDropdown;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.checkAuth = checkAuth;
window.loadAdminUsers = loadAdminUsers;
window.showMessage = showMessage;
window.editUser  = editUser ;  // Already on window from above
window.deleteUser  = deleteUser ;  // Already on window from above