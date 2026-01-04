// universalconfig/universalMongoDbConnect.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error('❌ MONGO_URI is missing from .env');
  process.exit(1);
}

const universalMongoDbConnect = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB (mobile and web are online)');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

export default universalMongoDbConnect;

