const nodemailer = require('nodemailer');  // Direct import: nodemailer IS the createTransporter function

// Lazy init: Create transporter only when needed (avoids early crashes)
let transporter = null;

function getTransporter() {
    if (!transporter) {
        // Validate env vars first (prevents crashes if missing)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP env vars missing: SMTP_USER or SMTP_PASS not set in environment');
            throw new Error('SMTP configuration missing. Check Render Environment variables.');
        }

        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,  // Use true for port 465 (SSL)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        console.log('Creating SMTP transporter with host:', smtpConfig.host);  // Debug log
        
        transporter = nodemailer.createTransporter(smtpConfig);  // Correct: Direct call on nodemailer function
        
        // Verify connection on first use (logs success/fail in Render)
        transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP connection verification failed:', error.message);
            } else {
                console.log('SMTP server is ready - emails can be sent');
            }
        });
    }
    return transporter;
}

// Send verification code email
async function sendVerification(email, code) {
    try {
        console.log('Attempting to send verification email to:', email, 'with code:', code);  // Debug
        
        const transporter = getTransporter();
        const mailOptions = {
            from: `"Verification Code" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Account Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Verify Your Email</h2>
                    <p>Hello!</p>
                    <p>Your 6-digit verification code is: <strong style="font-size: 24px; color: #4285f4;">${code}</strong></p>
                    <p>This code is valid for 10 minutes. Enter it on the website to complete registration.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr>
                    <p>Best regards,<br>Website Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email, '- Message ID:', info.messageId);
        return true;  // Success indicator
    } catch (err) {
        console.error('Send verification error details:', err.message, '- Full error:', err);
        throw new Error(`Failed to send verification email: ${err.message}. Check SMTP settings (app password, 2FA).`);
    }
}

// Send password reset email
async function sendReset(email, token) {
    try {
        console.log('Attempting to send reset email to:', email);
        
        const transporter = getTransporter();
        const resetUrl = `${process.env.FRONTEND_URL || 'https://your-frontend.onrender.com'}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Password Reset" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset Your Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hello!</p>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetUrl}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
                    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                    <hr>
                    <p>Best regards,<br>Website Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully to:', email, '- Message ID:', info.messageId);
        return true;
    } catch (err) {
        console.error('Send reset error details:', err.message);
        throw new Error(`Failed to send reset email: ${err.message}. Check SMTP settings.`);
    }
}

module.exports = { sendVerification, sendReset };