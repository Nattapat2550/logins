const nodemailer = require('nodemailer');

let transporter = null;

function createTransporter() {
    if (!transporter) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP_USER or SMTP_PASS missing - emails disabled');
            return null;
        }

        // FIXED: Use port 587 + STARTTLS (more reliable on Render/cloud hosts)
        // Fallback to 465 if env var set, but 587 avoids timeouts
        const port = parseInt(process.env.SMTP_PORT) || 587;  // Default to 587
        const secure = port === 465;  // Only secure=true for 465

        const config = {
            host: 'smtp.gmail.com',
            port: port,
            secure: secure,  // false for 587 (use tls below)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // For port 587: Use STARTTLS
            tls: {
                rejectUnauthorized: false
            },
            // Add connection timeout (prevents long hangs)
            connectionTimeout: 10000,  // 10s
            greetingTimeout: 5000,
            socketTimeout: 10000
        };

        try {
            if (typeof nodemailer.createTransport !== 'function') {
                throw new Error('createTransport not available');
            }
            transporter = nodemailer.createTransport(config);
            console.log('Transporter created successfully (port:', port, ')');

            // Verify with timeout
            transporter.verify((error, success) => {
                if (error) {
                    console.error('SMTP verify failed:', error.message);
                } else {
                    console.log('SMTP ready');
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
        console.warn('No transporter - skipping email. Manual code:', code);
        return { success: false, message: `Manual code: ${code} (email failed)` };
    }

    try {
        console.log('Attempting to send verification to:', email, 'code:', code);
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            text: `Your code is: ${code}. Expires in 10 minutes.`,
            html: `
                <h2>Verify Your Email</h2>
                <p>Your code: <strong style="color: blue; font-size: 24px;">${code}</strong></p>
                <p>Expires in 10 minutes. If not requested, ignore.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email, 'ID:', info.messageId);
        return { success: true, message: 'Email sent' };
    } catch (error) {
        console.error('Send verification failed:', error.message);
        return { success: false, message: `Email failed: ${error.message}. Manual code: ${code}` };
    }
}

async function sendReset(email, token) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - skipping reset email');
        return { success: false, message: 'Reset email skipped' };
    }

    try {
        console.log('Attempting to send reset to:', email);
        const resetUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset',
            text: `Reset link: ${resetUrl} (expires 1 hour)`,
            html: `
                <h2>Reset Password</h2>
                <p><a href="${resetUrl}">Click to reset</a></p>
                <p>Expires in 1 hour. If not requested, ignore.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully to:', email, 'ID:', info.messageId);
        return { success: true, message: 'Reset email sent' };
    } catch (error) {
        console.error('Send reset failed:', error.message);
        return { success: false, message: `Reset email failed: ${error.message}` };
    }
}

module.exports = { sendVerification, sendReset };