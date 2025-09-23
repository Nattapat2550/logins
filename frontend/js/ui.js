// UI Helpers (No BACKEND_URL - use from auth.js)

// Show message (success/error)
function showMessage(text, isSuccess = true) {
    const messageEl = document.getElementById('message') || createMessageEl();
    messageEl.textContent = text;
    messageEl.className = `message ${isSuccess ? 'success' : 'error'}`;
    messageEl.style.display = 'block';

    // Auto-hide after 5s
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Create message element if not exists
function createMessageEl() {
    const el = document.createElement('div');
    el.id = 'message';
    document.querySelector('.container').appendChild(el);
    return el;
}

// Validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Format date
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Export for global use (window.ui)
window.ui = { showMessage, isValidEmail, formatDate };
window.showMessage = showMessage;  // Global alias for direct use