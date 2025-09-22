const { findUserById, updateUser , deleteUser  } = require('../models/userModel');

const getUserProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User  not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const fields = {};
    if (req.body.username) fields.username = req.body.username;
    if (req.file) fields.profile_pic = req.file.filename; // multer middleware handles file upload

    const updatedUser  = await updateUser (req.user.id, fields);
    res.json({ user: updatedUser  });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    await deleteUser (req.user.id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  deleteAccount,
};