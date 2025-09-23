const nodemailer = require('nodemailer');  // Direct import: nodemailer is the function

// Lazy init: Create transporter only when needed (avoids early env errors)
let transporter = null;

function getTransporter() {
    if (!transporter) {
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,  // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };
        
        // Validate env vars before creating (prevents crashes)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP env vars missing: SMTP_USER or SMTP_PASS not set');
            throw new Error('SMTP configuration missing. Check environment variables.');
        }
        
        transporter = nodemailer.createTransporter(smtpConfig);  // Correct: nodemailer.createTransporter
        
        // Test connection on first use (optional, logs success/fail)
        transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP connection error:', error);
            } else {
                console.log('SMTP server ready for sending emails');
            }
        });
    }
    return transporter;
}

// Send verification code email
async function sendVerification(email, code) {
    try {
        console.log('Sending verification email to:', email);  // Log for Render
        
        const transporter = getTransporter();
        const mailOptions = {
            from: `"Verification" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `
                <h2>Verification Code</h2>
                <p>Your 6-digit verification code is: <strong>${code}</strong></p>
                <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email);
    } catch (err) {
        console.error('Send verification error:', err.message);
        throw new Error('Failed to send verification email. Check SMTP settings or try again.');
    }
}

// Send password reset email
async function sendReset(email, token) {
    try {
        console.log('Sending reset email to:', email);
        
        const transporter = getTransporter();
        const resetUrl = `${process.env.FRONTEND_URL}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Password Reset" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p>Click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>
                <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully to:', email);
    } catch (err) {
        console.error('Send reset error:', err.message);
        throw new Error('Failed to send reset email. Check SMTP settings or try again.');
    }
}

module.exports = { sendVerification, sendReset };