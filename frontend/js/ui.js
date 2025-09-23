// Global UI initialization
function initUI() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    
    // Set up event listeners if needed (e.g., global)
    setupGlobalListeners();
}

// Setup global listeners (e.g., for dropdown close on outside click)
function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdown');
        const profileImg = document.getElementById('profileImg');
        if (dropdown && profileImg && !e.target.closest('.nav-right') && !e.target.closest('#profileImg')) {
            dropdown.style.display = 'none';
        }
    });
}

// Toggle dropdown
function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Close dropdown if open
    const dropdown = document.getElementById('dropdown');
    if (dropdown) dropdown.style.display = 'none';
    window.location.href = 'index.html';
}

// Protected route check (call on protected pages)
function checkAuth(redirectTo = 'login.html', requireAdmin = false) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
        window.location.href = redirectTo;
        return false;
    }
    const user = JSON.parse(userStr);
    if (requireAdmin && user.role !== 'admin') {
        window.location.href = 'home.html';
        return false;
    }
    return { user, token };
}

// Admin-specific: Load users (for admin.html) - uses getAdminUsers from auth.js
async function loadAdminUsers() {
    const auth = checkAuth('login.html', true);
    if (!auth) return;
    
    try {
        document.getElementById('usersList').innerHTML = '<div class="loading">Loading users...</div>';
        const users = await getAdminUsers();  // From auth.js (global)
        let html = '<ul>';
        users.forEach(u => {
            html += `
                <li>
                    <span>${u.username || u.email} (ID: ${u.id}, Role: ${u.role}, Verified: ${u.verified ? 'Yes' : 'No'})</span>
                    <div>
                        <button onclick="editUser (${u.id})">Edit</button>
                        <button onclick="deleteUser (${u.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px;">Delete</button>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        document.getElementById('usersList').innerHTML = html;
    } catch (err) {
        document.getElementById('usersList').innerHTML = `<div class="error">Error: ${err.message}</div>`;
        showMessage(`Failed to load users: ${err.message}`, true);
    }
}

// Admin: Edit user (prompt-based for simplicity)
window.editUser  = async (id) => {
    const username = prompt('New username (leave blank to keep):') || undefined;
    const role = prompt('New role (user/admin, leave blank to keep):') || undefined;
    const verifiedStr = prompt('Verified (true/false, leave blank to keep):');
    const verified = verifiedStr === '' ? undefined : (verifiedStr.toLowerCase() === 'true');
    
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (role !== undefined) updates.role = role;
    if (verified !== undefined) updates.verified = verified;
    
    if (Object.keys(updates).length > 0) {
        const result = await updateUser (id, updates);  // From auth.js (global)
        showMessage(result.message || result.error, !result.success);
        if (result.success) loadAdminUsers();
    } else {
        showMessage('No changes made.', false);
    }
};

// Admin: Delete user
window.deleteUser  = async (id) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const result = await deleteAdminUser (id);  // From auth.js (global)
        showMessage(result.message || result.error, !result.success);
        if (result.success) loadAdminUsers();
    }
};

// Show message (global helper for #message divs)
function showMessage(text, isError = false) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        if (isError) {
            messageEl.classList.add('error');
        } else {
            messageEl.classList.remove('error');
        }
    }
}

// Export for use in HTML scripts
window.initUI = initUI;
window.toggleDropdown = toggleDropdown;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.checkAuth = checkAuth;
window.loadAdminUsers = loadAdminUsers;
window.showMessage = showMessage;