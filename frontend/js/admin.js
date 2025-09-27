document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const tableBody = document.querySelector('#usersTable tbody');
    const loadMoreBtn = document.getElementById('loadMore');
    const homepageContent = document.getElementById('homepageContent');
    const saveHomepageBtn = document.getElementById('saveHomepageBtn');

    // Load users (paginated)
    async function loadUsers(page = 1, append = false) {
        try {
            const data = await apiFetch(`/api/admin/users?page=${page}`);
            const users = data.data.users;
            const pagination = data.data.pagination;

            if (!append) {
                tableBody.innerHTML = '';
                currentPage = page;
            }

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="text" value="${user.username || ''}" class="edit-username" data-id="${user.id}" style="display: none;"> <span class="view-username">${user.username || 'N/A'}</span></td>
                    <td>
                        <select class="edit-role" data-id="${user.id}" style="display: none;">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User </option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <span class="view-role">${user.role}</span>
                    </td>
                    <td><img src="${user.profile_picture || '/images/user.png'}" alt="Profile" class="profile"></td>
                    <td>
                        <button class="edit-btn" data-id="${user.id}">Edit</button>
                        <button class="save-btn" data-id="${user.id}" style="display: none; background: green;">Save</button>
                        <button class="cancel-btn" data-id="${user.id}" style="display: none; background: gray;">Cancel</button>
                        <button class="delete-btn" data-id="${user.id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Bind events for this batch
            bindUserEvents();

            if (pagination.page >= pagination.pages) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'No more users';
            } else {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = `Load More (Page ${pagination.page + 1})`;
            }

            showMessage(`Loaded ${users.length} users.`, 'success');
        } catch (err) {
            if (err.message === 'NOT_AUTHORIZED') {
                window.location.href = '/login.html';
            } else {
                showMessage(`Load failed: ${err.message}`, 'error');
            }
        }
    }

    // Bind edit/delete events
    function bindUserEvents() {
        // Edit/Save/Cancel per row
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const row = e.target.closest('tr');
                row.querySelector('.view-username').style.display = 'none';
                row.querySelector('.edit-username').style.display = 'inline';
                row.querySelector('.view-role').style.display = 'none';
                row.querySelector('.edit-role').style.display = 'inline';
                e.target.style.display = 'none';
                row.querySelector('.save-btn').style.display = 'inline';
                row.querySelector('.cancel-btn').style.display = 'inline';
            });
        });

        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const username = e.target.closest('tr').querySelector('.edit-username').value.trim();
                const role = e.target.closest('tr').querySelector('.edit-role').value;
                if (username && (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9._-]+$/.test(username))) {
                    showMessage('Invalid username.', 'error');
                    return;
                }
                try {
                    const body = {};
                    if (username) body.username = username;
                    if (role) body.role = role;
                    const data = await apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body });
                    showMessage(data.message, 'success');
                    // Refresh row
                    e.target.closest('tr').querySelector('.view-username').textContent = data.data.username;
                    e.target.closest('tr').querySelector('.view-role').textContent = data.data.role;
                    e.target.closest('tr').querySelector('.view-username').style.display = 'inline';
                    e.target.closest('tr').querySelector('.edit-username').style.display = 'none';
                    e.target.closest('tr').querySelector('.view-role').style.display = 'inline';
                    e.target.closest('tr').querySelector('.edit-role').style.display = 'none';
                    e.target.previousElementSibling.style.display = 'inline'; // Edit btn
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'none';
                } catch (err) {
                    showMessage(`Save failed: ${err.message}`, 'error');
                }
            });
        });

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                row.querySelector('.view-username').style.display = 'inline';
                row.querySelector('.edit-username').style.display = 'none';
                row.querySelector('.view-role').style.display = 'inline';
                row.querySelector('.edit-role').style.display = 'none';
                e.target.previousElementSibling.style.display = 'none'; // Save
                e.target.style.display = 'none';
                row.querySelector('.edit-btn').style.display = 'inline';
            });
        });

        // Delete
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm(`Delete user ${e.target.dataset.id}?`)) return;
                try {
                    const data = await apiFetch(`/api/admin/users/${e.target.dataset.id}`, { method: 'DELETE' });
                    showMessage(data.message, 'success');
                    e.target.closest('tr').remove();
                } catch (err) {
                    showMessage(`Delete failed: ${err.message}`, 'error');
                }
            });
        });
    }

    // Load more
    loadMoreBtn.addEventListener('click', () => {
        loadUsers(currentPage + 1, true);
    });

    // Homepage content
    async function loadHomepage() {
        try {
            const data = await apiFetch('/api/admin/homepage');
            homepageContent.value = data.data.content;
        } catch (err) {
            showMessage(`Load content failed: ${err.message}`, 'error');
        }
    }

    saveHomepageBtn.addEventListener('click', async () => {
        const content = homepageContent.value.trim();
        if (!content || content.length > 5000) {
            showMessage('Content required (max 5000 chars).', 'error');
            return;
        }
        try {
            saveHomepageBtn.disabled = true;
            const data = await apiFetch('/api/admin/homepage', { method: 'PUT', body: { content } });
            showMessage(data.message, 'success-home');
            document.getElementById('success-home').id = 'success'; // Reuse showMessage
        } catch (err) {
            showMessage(`Save failed: ${err.message}`, 'error-home');
        } finally {
            saveHomepageBtn.disabled = false;
        }
    });

    // Init
    loadUsers(1);
    loadHomepage();
});