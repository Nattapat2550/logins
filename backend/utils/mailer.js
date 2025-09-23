const nodemailer = require('nodemailer');

// Debug: Log nodemailer version and type on load
console.log('Nodemailer loaded:', require('nodemailer/package.json').version);
console.log('nodemailer.createTransporter type:', typeof nodemailer.createTransporter);

let transporter = null;

function createTransporter() {
    if (!transporter) {
        // Check env vars early
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP_USER or SMTP_PASS missing - skipping email send');
            throw new Error('SMTP_USER and SMTP_PASS env vars required');
        }

        const config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,  // true for 465 (SSL)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // Add TLS for Gmail
            tls: {
                rejectUnauthorized: false
            }
        };

        try {
            // Ensure createTransporter exists (fallback if import issue)
            if (typeof nodemailer.createTransporter !== 'function') {
                console.error('nodemailer.createTransporter is not a function - using direct export');
                // Direct fallback: nodemailer exports the function itself in some setups
                transporter = nodemailer(config);  // Alternative: Call nodemailer directly as function
            } else {
                transporter = nodemailer.createTransporter(config);
            }

            console.log('Transporter created successfully');

            // Verify SMTP (async, non-blocking)
            transporter.verify((error, success) => {
                if (error) {
                    console.error('SMTP verification failed (emails may still work):', error.message);
                } else {
                    console.log('SMTP server is ready - emails can be sent');
                }
            });
        } catch (err) {
            console.error('Failed to create transporter:', err.message);
            throw new Error(`Transporter creation failed: ${err.message}`);
        }
    }
    return transporter;
}

async function sendVerification(email, code) {
    let info;
    try {
        console.log('Attempting to send verification email to:', email, 'with code:', code);
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Auth App Verification" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Account Verification Code',
            text: `Your verification code is: ${code}. This code expires in 10 minutes. If you didn't request this, ignore this email.`,
            html: `
                <h2>Verify Your Email</h2>
                <p>Your verification code is: <strong style="color: blue; font-size: 24px;">${code}</strong></p>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            `
        };

        info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email, '- Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Send verification error:', error.message);
        // Don't throw - allow register to succeed (user can retry)
        // But log for debugging
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
}

async function sendReset(email, token) {
    let info;
    try {
        console.log('Attempting to send reset email to:', email);
        const transporter = createTransporter();
        const resetUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?reset=${token}`;  // Use login for reset (add token handling if needed)

        const mailOptions = {
            from: `"Auth App Reset" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            text: `Click to reset: ${resetUrl}. Expires in 1 hour. If not requested, ignore.`,
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the link to reset your password: <a href="${resetUrl}">Reset Password</a></p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, ignore this email.</p>
            `
        };

        info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully to:', email, '- Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Send reset error:', error.message);
        throw new Error(`Failed to send reset email: ${error.message}`);
    }
}

module.exports = { sendVerification, sendReset };