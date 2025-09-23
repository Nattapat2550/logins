const nodemailer = require('nodemailer');

let transporter = null;

function createTransporter() {
    if (!transporter) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('SMTP_USER and SMTP_PASS env vars required');
        }

        const config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,  // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        transporter = nodemailer.createTransporter(config);

        // Verify on creation
        transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP verification failed:', error.message);
            } else {
                console.log('SMTP server is ready - emails can be sent');
            }
        });
    }
    return transporter;
}

async function sendVerification(email, code) {
    try {
        const transporter = createTransporter();
        console.log('Attempting to send verification email to:', email, 'with code:', code);

        const mailOptions = {
            from: `"Verification Code" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Account Verification Code',
            html: `
                <h2>Verify Your Email</h2>
                <p>Your verification code is: <strong style="color: blue; font-size: 24px;">${code}</strong></p>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email, '- Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Send verification error:', error.message);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
}

async function sendReset(email, token) {
    try {
        const transporter = createTransporter();
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset.html?token=${token}`;  // Assume reset.html exists or use login with token
        console.log('Attempting to send reset email to:', email);

        const mailOptions = {
            from: `"Password Reset" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the link to reset your password: <a href="${resetUrl}">Reset Password</a></p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully to:', email, '- Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Send reset error:', error.message);
        throw new Error(`Failed to send reset email: ${error.message}`);
    }
}

module.exports = { sendVerification, sendReset };