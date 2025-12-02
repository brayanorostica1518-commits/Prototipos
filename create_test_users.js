// Script to create test users in MongoDB
// Run with: node create_test_users.js

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'assessment_db';

async function createTestUsers() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Create test users
    const users = [
      {
        id: 'admin-user-001',
        email: 'admin@assessmentai.com',
        name: 'Admin Usuario',
        picture: 'https://ui-avatars.com/api/?name=Admin+Usuario&background=06b6d4&color=fff',
        created_at: new Date()
      },
      {
        id: 'test-user-001',
        email: 'usuario1@test.com',
        name: 'Usuario Test 1',
        picture: 'https://ui-avatars.com/api/?name=Usuario+Test+1&background=3b82f6&color=fff',
        created_at: new Date()
      },
      {
        id: 'test-user-002',
        email: 'usuario2@test.com',
        name: 'Usuario Test 2',
        picture: 'https://ui-avatars.com/api/?name=Usuario+Test+2&background=8b5cf6&color=fff',
        created_at: new Date()
      }
    ];
    
    // Insert users (or skip if exists)
    for (const user of users) {
      const existing = await db.collection('users').findOne({ id: user.id });
      if (!existing) {
        await db.collection('users').insertOne(user);
        console.log(`✓ Created user: ${user.email}`);
      } else {
        console.log(`- User already exists: ${user.email}`);
      }
    }
    
    // Create sessions
    const sessions = [
      {
        user_id: 'admin-user-001',
        session_token: `admin_session_${Date.now()}`,
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
      },
      {
        user_id: 'test-user-001',
        session_token: `user1_session_${Date.now()}`,
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
      },
      {
        user_id: 'test-user-002',
        session_token: `user2_session_${Date.now()}`,
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
      }
    ];
    
    await db.collection('user_sessions').insertMany(sessions);
    
    console.log('\n===== USUARIOS DE PRUEBA CREADOS =====\n');
    
    sessions.forEach((session, idx) => {
      const user = users[idx];
      console.log(`${idx + 1}. ${user.name}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Session Token: ${session.session_token}`);
      console.log('');
    });
    
    console.log('========================================\n');
    console.log('Para usar: Copia un session_token y úsalo como cookie o Bearer token');
    console.log('Cookie: session_token=<token>');
    console.log('Header: Authorization: Bearer <token>\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestUsers();
