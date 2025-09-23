const nodemailer = require('nodemailer');

// Ultimate Debug: Log full nodemailer export on load
console.log('Nodemailer module loaded - full export:', JSON.stringify(Object.keys(nodemailer)));
console.log('Nodemailer version:', require('nodemailer/package.json').version || 'Unknown');
console.log('nodemailer.createTransporter type:', typeof nodemailer.createTransporter);

let transporter = null;

function createTransporter() {
    if (!transporter) {
        // Early env check
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP_USER or SMTP_PASS missing - emails disabled');
            return null;  // Return null - skip email
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
            let createFunc;
            // Fallback 1: Standard way
            if (typeof nodemailer.createTransporter === 'function') {
                createFunc = nodemailer.createTransporter;
                console.log('Using standard createTransporter');
            } else {
                // Fallback 2: Dynamic require the function directly (bypasses module issues)
                console.log('Standard failed - trying dynamic require');
                const nodemailerLib = require('nodemailer/lib/nodemailer');
                createFunc = nodemailerLib.createTransporter || nodemailerLib;
                if (typeof createFunc !== 'function') {
                    throw new Error('No valid create function found');
                }
                console.log('Dynamic require succeeded');
            }

            transporter = createFunc(config);
            console.log('Transporter created successfully');

            // Non-blocking verify
            if (transporter.verify) {
                transporter.verify((error, success) => {
                    if (error) {
                        console.error('SMTP verify failed (but emails may work):', error.message);
                    } else {
                        console.log('SMTP ready - emails enabled');
                    }
                });
            }
        } catch (err) {
            console.error('All transporter fallbacks failed:', err.message);
            console.error('Nodemailer exports:', Object.keys(nodemailer));  // Final debug
            transporter = null;  // Disable emails
        }
    }
    return transporter;
}

async function sendVerification(email, code) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - skipping email send. Code for manual test:', code);
        // For dev: Log code so you can use it in verify step
        return { messageId: 'skipped', warning: 'Email disabled - use code from logs' };
    }

    try {
        console.log('Sending verification to:', email, 'code:', code);
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verification Code',
            text: `Code: ${code} (expires 10 min)`,
            html: `<h2>Code: <strong>${code}</strong></h2><p>Expires in 10 min.</p>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent! ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email send failed:', error.message);
        throw new Error(`Email failed: ${error.message}`);
    }
}

async function sendReset(email, token) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('No transporter - reset email skipped');
        return { messageId: 'skipped' };
    }

    try {
        console.log('Sending reset to:', email);
        const resetUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset Password',
            text: `Reset: ${resetUrl}`,
            html: `<h2><a href="${resetUrl}">Reset Password</a></h2>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent! ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('Reset email failed:', error.message);
        throw new Error(`Reset failed: ${error.message}`);
    }
}

module.exports = { sendVerification, sendReset };