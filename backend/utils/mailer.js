const nodemailer = require('nodemailer');

// Debug: Log exports on load
console.log('Nodemailer exports:', Object.keys(nodemailer));
console.log('nodemailer.createTransport type:', typeof nodemailer.createTransport);

let transporter = null;

function createTransporter() {
    if (!transporter) {
        // Early env check
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP_USER or SMTP_PASS missing - emails disabled');
            return null;
        }

        const config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: { rejectUnauthorized: false }
        };

        try {
            // Correct: Use createTransport (not createTransporter)
            if (typeof nodemailer.createTransport !== 'function') {
                throw new Error('createTransport not available - check nodemailer install');
            }
            transporter = nodemailer.createTransport(config);
            console.log('Transporter created successfully with createTransport');

            // Non-blocking verify
            transporter.verify((error, success) => {
                if (error) {
                    console.error('SMTP verify failed (emails may still work):', error.message);
                } else {
                    console.log('SMTP ready - emails enabled');
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
        return { skipped: true, manualCode: code };  // For controller to handle
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
        return info;
    } catch (error) {
        console.error('Send verification failed:', error.message);
        throw new Error(`Email send failed: ${error.message}`);
    }
}

async function sendReset(email, token) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - skipping reset email');
        return { skipped: true };
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
        return info;
    } catch (error) {
        console.error('Send reset failed:', error.message);
        throw new Error(`Reset email failed: ${error.message}`);
    }
}

module.exports = { sendVerification, sendReset };