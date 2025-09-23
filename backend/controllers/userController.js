module.exports = {
    async getHome(db, req, res) {
        try {
            const result = await db.query('SELECT content FROM home_content WHERE id = 1');
            const content = result.rows[0]?.content || 'Welcome to our website!';
            res.json({ content });
        } catch (err) {
            console.error('Get home error:', err);
            res.status(500).json({ error: 'Failed to fetch home content' });
        }
    },

    async updateHome(db, req, res) {
        const { content } = req.body;
        const userRole = req.user.role;  // From authMiddleware

        if (!content) {
            return res.status(400).json({ error: 'Content required' });
        }

        try {
            // Users can update if admin or user (basic edit)
            if (userRole !== 'admin' && userRole !== 'user') {
                return res.status(403).json({ error: 'Unauthorized to update content' });
            }

            await db.query('UPDATE home_content SET content = $1 WHERE id = 1', [content]);
            res.json({ message: 'Home content updated successfully' });
        } catch (err) {
            console.error('Update home error:', err);
            res.status(500).json({ error: 'Failed to update content' });
        }
    },

    async getSettings(db, req, res) {
        const userId = req.user.id;  // From authMiddleware
        try {
            const result = await db.query('SELECT id, email, username, role, profile_pic, created_at FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User  not found' });
            }
            res.json({ user: result.rows[0] });
        } catch (err) {
            console.error('Get settings error:', err);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    },

    async updateSettings(db, req, res) {
        const userId = req.user.id;
        const { username, profilePic } = req.body;  // profilePic: URL from upload or external

        try {
            const updates = [];
            const values = [userId];
            let paramIndex = 2;

            if (username) {
                updates.push(`username = $${paramIndex}`);
                values.push(username);
                paramIndex++;
            }

            if (profilePic) {
                updates.push(`profile_pic = $${paramIndex}`);
                values.push(profilePic);
                paramIndex++;
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No updates provided' });
            }

            const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, username, role, profile_pic`;
            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User  not found' });
            }

            res.json({ message: 'Settings updated', user: result.rows[0] });
        } catch (err) {
            console.error('Update settings error:', err);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    },

    async getAdminDashboard(db, req, res) {
        try {
            const homeResult = await db.query('SELECT content FROM home_content WHERE id = 1');
            const usersResult = await db.query('SELECT id, email, username, role, verified, created_at FROM users ORDER BY created_at DESC LIMIT 10');
            res.json({ 
                message: 'Admin dashboard data', 
                homeContent: homeResult.rows[0]?.content || 'No content',
                recentUsers: usersResult.rows 
            });
        } catch (err) {
            console.error('Admin dashboard error:', err);
            res.status(500).json({ error: 'Failed to fetch dashboard' });
        }
    },

    async getAllUsers(db, req, res) {
        try {
            const result = await db.query('SELECT id, email, username, role, verified, created_at FROM users ORDER BY created_at DESC');
            res.json({ users: result.rows });
        } catch (err) {
            console.error('Get all users error:', err);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }
};