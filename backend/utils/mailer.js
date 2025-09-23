const nodemailer = require('nodemailer');

let transporter = null;

function createTransporter() {
    if (!transporter) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

        const config = {
            host: 'smtp.gmail.com',  // Fixed
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: { rejectUnauthorized: false }
        };

        try {
            transporter = nodemailer.createTransporter(config);
            transporter.verify((err) => {
                if (err) console.error('SMTP verify failed:', err.message);
                else console.log('SMTP ready');
            });
        } catch (err) {
            console.error('Transporter failed:', err);
            transporter = null;
        }
    }
    return transporter;
}

async function sendVerification(email, code) {
    const transporter = createTransporter();
    if (!transporter) throw new Error('Email skipped');

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Verification Code',
        text: `Your code: ${code} (10 min)`,
        html: `<h2>Code: <strong>${code}</strong></h2>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
}

async function sendReset(email, token) {
    const transporter = createTransporter();
    if (!transporter) throw new Error('Reset skipped');

    const resetUrl = `${process.env.FRONTEND_URL}/login.html?reset=${token}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Reset Password',
        text: `Reset: ${resetUrl}`,
        html: `<h2><a href="${resetUrl}">Reset Password</a></h2>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Reset sent:', info.messageId);
    return info;
}

module.exports = { sendVerification, sendReset };