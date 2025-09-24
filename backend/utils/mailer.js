const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

const createTransporter = () => {
    if (transporter) return transporter;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP_USER or SMTP_PASS missing - emails disabled');
        return null;
    }

    // Safety Check: Verify Nodemailer API (logs version for debug)
    if (typeof nodemailer.createTransporter !== 'function') {
        console.error('❌ Nodemailer API error: createTransporter not available. Version:', require('nodemailer/package.json').version);
        console.error('Fix: Run "npm i nodemailer@latest" and redeploy.');
        return null;
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;
    const secure = port === 465;

    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 60000,
        greetingTimeout: 40000,
        socketTimeout: 40000,
        debug: process.env.SMTP_DEBUG === 'true',
        logger: process.env.SMTP_DEBUG === 'true'
    };

    try {
        transporter = nodemailer.createTransporter(config);
        console.log(`✅ Transporter created (port ${port}, ${secure ? 'SSL' : 'STARTTLS'}) - Nodemailer v${require('nodemailer/package.json').version}`);

        if (process.env.SKIP_VERIFY !== 'true') {
            transporter.verify((error) => {
                if (error) console.warn('SMTP verify failed (but continuing):', error.message);
                else console.log('SMTP server ready');
            });
        }
    } catch (err) {
        console.error('❌ Transporter creation failed:', err.message);
        transporter = null;
    }

    return transporter;
};

const sendVerification = async (email, code) => {
    const t = createTransporter();
    if (!t) {
        console.warn('No transporter - verification skipped for', email);
        return { success: false, message: 'SMTP unavailable' };
    }

    try {
        console.log(`Attempting SMTP verification to: ${email}, code: ${code}`);
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

        const info = await t.sendMail(mailOptions);
        console.log('✅ SMTP verification sent:', info.messageId, 'to:', email);
        return { success: true, message: 'Email sent' };
    } catch (error) {
        console.error('❌ SMTP verification failed for', email, ':', error.message);
        if (error.code === 'ETIMEDOUT') {
            console.error('Timeout details:', { command: error.command, code: error.code });
        } else if (error.code === 'EAUTH') {
            console.error('Auth failed - check App Password');
        }
        return { success: false, message: 'Send failed' };
    }
};

const sendReset = async (email, token) => {
    const t = createTransporter();
    if (!t) {
        console.warn('No transporter - reset skipped for', email);
        return { success: false, message: 'SMTP unavailable' };
    }

    try {
        console.log('Attempting SMTP reset to:', email);
        const resetUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?reset=${token}`;
        const mailOptions = {
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
            html: `
                <h2>Reset Your Password</h2>
                <p>Click below to reset:</p>
                <p><a href="${resetUrl}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>Expires in 1 hour. If not requested, ignore.</p>
            `
        };

        const info = await t.sendMail(mailOptions);
        console.log('✅ SMTP reset sent:', info.messageId, 'to:', email);
        return { success: true, message: 'Reset email sent' };
    } catch (error) {
        console.error('❌ SMTP reset failed for', email, ':', error.message);
        return { success: false, message: 'Reset email failed' };
    }
};

module.exports = { sendVerification, sendReset };