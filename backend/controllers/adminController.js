// controllers/adminController.js
const { getAllUsers } = require('../models/userModel');

let homePageInfo = {
  title: 'Welcome to the Home Page',
  content: 'This is the default content.',
};

const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
};

const getHomeInfo = (req, res) => {
  res.json(homePageInfo);
};

const updateHomeInfo = (req, res) => {
  const { title, content } = req.body;
  homePageInfo = { title, content };
  res.json({ message: 'Home page info updated', homePageInfo });
};

module.exports = {
  getUsers,
  getHomeInfo,
  updateHomeInfo,
};