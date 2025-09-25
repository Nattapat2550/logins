const {
  getAllUsers,
  getUserById,
  updateUser ,
  deleteUser ,
  updateHomeContent
} = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await getUserById(id);
    res.json(user);
  } catch (err) {
    console.error('Get user by ID error:', err);
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'User  not found' });
    } else if (err.message.includes('Invalid user ID')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

exports.updateUser  = async (req, res) => {
  const { id } = req.params;
  const { email, username, role } = req.body;

  try {
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!email || !username || !role) {
      return res.status(400).json({ error: 'Email, username, and role are required' });
    }

    const updatedUser  = await updateUser (id, email, username, role);
    res.status(200).json({ message: 'User  updated successfully', user: updatedUser  });
  } catch (err) {
    console.error('Update user error:', err);
    if (err.message.includes('exists')) {
      return res.status(400).json({ error: 'Email already exists' });
    } else if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'User  not found' });
    } else if (err.message.includes('Role must be') || err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

exports.deleteUser  = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await deleteUser (id);
    res.status(200).json({ message: 'User  deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'User  not found' });
    } else if (err.message.includes('Invalid user ID')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.updateHomeContent = async (req, res) => {
  const { title, content } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const updatedContent = await updateHomeContent(title, content);
    res.status(200).json({ message: 'Home content updated successfully', content: updatedContent });
  } catch (err) {
    console.error('Update home content error:', err);
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update home content' });
  }
};