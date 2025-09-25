const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Function to get fresh access token (async)
const getFreshAccessToken = async () => {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to authenticate with Gmail API');
  }
};

// Create transporter with OAuth2 auth
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.SENDER_EMAIL,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    // accessToken as a function that returns Promise<string> for dynamic fetching
    accessToken: getFreshAccessToken
  }
});

// Optional: Test transporter on module load (remove in production)
transporter.verify((error, success) => {
  if (error) {
    console.error('Gmail transporter verification failed:', error);
  } else {
    console.log('Gmail transporter ready for sending emails');
  }
});

module.exports = transporter;