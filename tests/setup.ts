import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Test database directory
const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');

// Track created test database paths for cleanup
const createdDbPaths: string[] = [];

// Setup before all tests
beforeAll(() => {
    // Create test data directory if it doesn't exist
    if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
});

// Cleanup after all tests
afterAll(() => {
    // Clean up tracked test database files
    for (const dbPath of createdDbPaths) {
        try {
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
        } catch {
            // Ignore cleanup errors
        }
    }

    // Clean up test data directory
    try {
        if (fs.existsSync(TEST_DATA_DIR)) {
            const files = fs.readdirSync(TEST_DATA_DIR);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(TEST_DATA_DIR, file));
                } catch {
                    // Ignore individual file cleanup errors
                }
            }
            try {
                fs.rmdirSync(TEST_DATA_DIR);
            } catch {
                // Directory might not be empty or have permission issues
            }
        }
    } catch {
        // Ignore directory cleanup errors
    }
});

/**
 * Generate a unique test database path
 * Uses a combination of test name, timestamp, and random string for uniqueness
 */
export const getTestDbPath = (testName: string): string => {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const dbPath = path.join(TEST_DATA_DIR, `${testName}-${Date.now()}-${uniqueId}.db`);
    createdDbPaths.push(dbPath);
    return dbPath;
};
