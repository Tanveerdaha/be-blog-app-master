import userModel from '../model/userModel.js';
import bcrypt from 'bcryptjs';

/**
 * Ensures exactly one bootstrap admin exists when no admin is in the database.
 * Uses ADMIN_EMAIL (+ ADMIN_PASSWORD for new accounts, optional ADMIN_USERNAME).
 * Safe to run on every server start — no-op if an admin already exists.
 */
export const ensureInitialAdmin = async () => {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
        return { skipped: true, reason: 'ADMIN_EMAIL not set' };
    }

    const existingAdminCount = await userModel.countDocuments({ isAdmin: true });

    if (existingAdminCount > 0) {
        return { skipped: true, reason: 'Admin already exists' };
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
        await userModel.findByIdAndUpdate(existingUser._id, { isAdmin: true });
        return { action: 'promoted', email: existingUser.email };
    }

    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
        return {
            skipped: true,
            reason: 'ADMIN_PASSWORD required to create a new admin account'
        };
    }

    const username = (process.env.ADMIN_USERNAME || email.split('@')[0])
        .toLowerCase()
        .replace(/\s/g, '');

    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);

    const newAdmin = new userModel({
        username,
        email,
        password: hashedPassword,
        isAdmin: true
    });

    await newAdmin.save();

    return { action: 'created', email: newAdmin.email, username: newAdmin.username };
};
