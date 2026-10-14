import mongoose from "mongoose";

type MongooseCache = {
    connection: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongooseCache: MongooseCache | undefined;
}

const cached = globalThis.mongooseCache ??= {
    connection: null,
    promise: null,
};

async function dbConnect(): Promise<void> {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
        throw new Error("MONGODB_URI is not configured. Add your MongoDB Atlas connection string to .env.");
    }

    if (cached.connection?.connection.readyState === 1) return;

    cached.promise ??= mongoose.connect(uri);

    try {
        cached.connection = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
}

export default dbConnect;