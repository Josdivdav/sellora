import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { io } from 'socket.io-client';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, DocumentReference } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 1. Firebase Admin Initialization
const firebaseAdmin = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
        privateKey: (process.env.PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
});
const firestore = getFirestore(firebaseAdmin);

// 2. FastDB Credentials
const FASTDB_HOST = process.env.FASTDB_HOST || 'http://129.146.69.138:5500';
const creds = {
    databaseId: process.env.FASTDB_DATABASE_ID || 'a9079015-7d4d-42f8-8216-1e6774861022',
    apiKey: process.env.FASTDB_API_KEY || '70H0iOAl1EDvz9h1I4dzBujJCgR9qEk3uUMj',
    author: process.env.FASTDB_AUTHOR_ID || '468932de-0199-453c-8501-1064aba26d50',
    userEmail: process.env.FASTDB_USER_EMAIL || 'joshuadivine985@gmail.com',
};

console.log('====================================================');
console.log('       FIRESTORE -> FASTDB DATA MIGRATION           ');
console.log('====================================================');
console.log(`Target FastDB Host: ${FASTDB_HOST}`);
console.log(`Database ID       : ${creds.databaseId}`);
console.log(`Author ID         : ${creds.author}\n`);

// Helper to convert Firestore types (Timestamps, Refs, etc.) into clean JSON
function sanitizeData(obj) {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }
    if (typeof obj === 'object' && typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
    }
    if (obj instanceof DocumentReference) {
        return obj.path;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeData);
    }
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(obj)) {
            cleaned[k] = sanitizeData(v);
        }
        return cleaned;
    }
    return obj;
}

// Socket Request Promise Wrapper with Event Listener
async function emitSocket(socket, event, payload, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const _reqId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                const reqData = { ...payload, _reqId };
                let done = false;

                const timeout = setTimeout(() => {
                    if (!done) {
                        done = true;
                        socket.off(event, onEvent);
                        reject(new Error(`Timeout waiting for ${event} after 60s`));
                    }
                }, 60000);

                const onEvent = (res) => {
                    if (res && res._reqId && res._reqId !== _reqId) return;
                    if (!done) {
                        done = true;
                        clearTimeout(timeout);
                        socket.off(event, onEvent);
                        if (res && res.error) {
                            reject(new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error)));
                        } else {
                            resolve(res);
                        }
                    }
                };

                socket.on(event, onEvent);
                socket.emit(event, reqData);
            });
        } catch (err) {
            if (attempt === retries) throw err;
            console.warn(`  ⚠️ Attempt ${attempt} failed for ${event} (${err.message}), retrying...`);
            await new Promise((r) => setTimeout(r, 1500));
        }
    }
}

async function migrateCollection(socket, colRef, collectionPath) {
    console.log(`\nScanning collection: [${collectionPath}]...`);
    const snapshot = await colRef.get();
    let migratedCount = 0;

    for (const doc of snapshot.docs) {
        const rawData = doc.data();
        const data = sanitizeData(rawData);
        const docId = doc.id;

        // Write document to FastDB
        await emitSocket(socket, 'document:set', {
            ...creds,
            collection: collectionPath,
            id: docId,
            data
        });

        migratedCount++;
        console.log(`  ✓ Migrated: ${collectionPath}/${docId}`);

        // Check for subcollections
        const subcollections = await doc.ref.listCollections();
        for (const sub of subcollections) {
            const subPath = `${collectionPath}/${docId}/${sub.id}`;
            await migrateCollection(socket, sub, subPath);
        }
    }

    console.log(`Summary: [${collectionPath}] -> ${migratedCount} documents migrated.`);
}

async function main() {
    console.log(`Connecting to FastDB server at ${FASTDB_HOST}...`);
    const socket = io(FASTDB_HOST, { transports: ['websocket', 'polling'], maxHttpBufferSize: 1e8 });


    await new Promise((resolve, reject) => {
        socket.once('connect', () => {
            console.log(`Connected to FastDB socket (ID: ${socket.id})`);
            resolve();
        });
        socket.once('connect_error', reject);
    });

    console.log('Authenticating database session with FastDB...');
    await emitSocket(socket, 'database:connect', creds);
    console.log('Database connected successfully!\n');

    // 1. Discover all root collections in Firestore
    const rootCollections = await firestore.listCollections();
    console.log(`Discovered ${rootCollections.length} root collections in Firestore:`, rootCollections.map(c => c.id));

    // 2. Migrate each collection hierarchy
    for (const col of rootCollections) {
        await migrateCollection(socket, col, col.id);
    }

    console.log('\n====================================================');
    console.log('      MIGRATION TO FASTDB COMPLETED SUCCESSFULLY    ');
    console.log('====================================================');

    socket.close();
    process.exit(0);
}

main().catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
});
