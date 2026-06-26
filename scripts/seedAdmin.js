import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ensureInitialAdmin } from '../utils/bootstrapAdmin.js';

const run = async () => {
    const dbUrl = process.env.DB_URL;

    if (!dbUrl) {
        console.error('DB_URL is required in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(dbUrl);
        console.log('Connected to database');

        const result = await ensureInitialAdmin();

        if (result.skipped) {
            console.log(`Skipped: ${result.reason}`);
        } else if (result.action === 'created') {
            console.log(`Created admin account: ${result.email} (username: ${result.username})`);
        } else if (result.action === 'promoted') {
            console.log(`Promoted existing user to admin: ${result.email}`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('seed:admin failed:', error.message);
        process.exit(1);
    }
};

run();
