const nodemailer = require('nodemailer');
require('dotenv').config();  // Load env vars (if not already in app.js)

let transporter = null;

function createTransporter() {
    if (!transporter) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP_USER or SMTP_PASS missing - emails disabled');
            return null;
        }

        // FIXED: Use your working config - port 465 + secure: true (direct SSL, no STARTTLS)
        const config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',  // Default to Gmail
            port: parseInt(process.env.SMTP_PORT) || 465,     // Your test: 465
            secure: true,                                     // SSL from start (matches your test)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // Timeouts to prevent hangs on Render (10s max)
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000
            // No tls options needed (direct secure connection)
        };

        try {
            transporter = nodemailer.createTransporter(config);
            console.log('Transporter created successfully (port 465, secure SSL)');

            // Verify connection (async, non-blocking)
            transporter.verify((error, success) => {
                if (error) {
                    console.error('SMTP verify failed:', error.message);
                } else {
                    console.log('SMTP server ready - emails can be sent');
                }
            });
        } catch (err) {
            console.error('Transporter creation failed:', err.message);
            transporter = null;
        }
    }
    return transporter;
}

async function sendVerification(email, code) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - email skipped for', email);
        return { success: false, message: 'SMTP unavailable' };  // Generic, no code exposed
    }

    try {
        console.log('Attempting to send verification to:', email, 'code:', code);  // Server-side log only
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,  // Matches your test
            to: email,
            subject: 'Your Verification Code',              // English for app consistency
            text: `Your code is: ${code}. Expires in 10 minutes.`,
            html: `
                <h2>Verify Your Email</h2>
                <p>Your code: <strong style="color: blue; font-size: 24px;">${code}</strong></p>
                <p>Expires in 10 minutes. If not requested, ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent:', info.messageId, 'to:', email);  // Matches your test log
        return { success: true, message: 'Email sent' };
    } catch (error) {
        console.error('❌ Send verification failed for', email, ':', error.message);  // Matches your test error log
        return { success: false, message: 'Send failed' };  // Generic, no code
    }
}

async function sendReset(email, token) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - reset email skipped for', email);
        return { success: false, message: 'SMTP unavailable' };
    }

    try {
        console.log('Attempting to send reset to:', email);
        const resetUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the link below to reset your password:</p>
                <p><a href="${resetUrl}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>This link expires in 1 hour. If you didn't request this, ignore the email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reset email sent:', info.messageId, 'to:', email);
        return { success: true, message: 'Reset email sent' };
    } catch (error) {
        console.error('❌ Send reset failed for', email, ':', error.message);
        return { success: false, message: 'Reset email failed' };
    }
}

module.exports = { sendVerification, sendReset };