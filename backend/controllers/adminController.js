const { getAllUsers, getUserById, updateUser , deleteUser , updateHomeContent } = require('../models/userModel');

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
    const user = await getUserById(parseInt(id));
    res.json(user);
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
};

exports.updateUser  = async (req, res) => {
  const { id } = req.params;
  const { email, username, role } = req.body;
  try {
    const updatedUser  = await updateUser (parseInt(id), email, username, role);
    res.json({ message: 'User  updated successfully', user: updatedUser  });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(err.message.includes('not found') || err.message.includes('exists') ? 400 : 500).json({ error: err.message });
  }
};

exports.deleteUser  = async (req, res) => {
  const { id } = req.params;
  try {
    await deleteUser (parseInt(id));
    res.json({ message: 'User  deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
};

exports.updateHomeContent = async (req, res) => {
  const { title, content } = req.body;
  try {
    const updated = await updateHomeContent(title, content);
    res.json({ message: 'Home content updated', content: updated });
  } catch (err) {
    console.error('Update home content error:', err);
    res.status(500).json({ error: 'Failed to update home content' });
  }
};