const { google } = require('googleapis');
const { generateCode } = require('./generateCode');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const sendVerificationEmail = async (email, code) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        const message = `To: ${email}\r\nSubject: Your Verification Code\r\n\r\nYour 6-digit verification code is: ${code}. It expires in 10 minutes.`;
        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });
        console.log('Verification email sent to', email);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail };