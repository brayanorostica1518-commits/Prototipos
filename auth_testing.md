# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('assessment_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

```bash
# Test auth endpoint
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "http://localhost:8001/api/sessions" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "http://localhost:8001/api/sessions/new" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing

```javascript
// Set cookie and navigate
await page.context().addCookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "localhost",
    "path": "/",
    "httpOnly": true,
    "secure": false,
    "sameSite": "Lax"
}]);
await page.goto("http://localhost:3000");
```

## Critical Fix: ID Schema

### MongoDB + Pydantic ID Mapping

```python
# Pydantic Model (uses 'id')
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        populate_by_name = True
```

### Insert with proper field names

```javascript
// MongoDB stores with 'id' field (not '_id' for our use case)
db.users.insertOne({ 
  id: "user-123",
  email: "test@example.com",
  name: "Test User"
});

// Session references user
db.user_sessions.insertOne({ 
  user_id: "user-123",  // Matches user.id
  session_token: "token-xyz",
  expires_at: new Date(Date.now() + 7*24*60*60*1000)
});
```

## Backend Auth Code Fix

```python
async def get_current_user(session_token: str):
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    # Query using 'id' field
    user_doc = await db.users.find_one({"id": session["user_id"]})
    if user_doc:
        # Remove MongoDB's _id if present
        user_doc.pop("_id", None)
        return User(**user_doc)
    return None
```

## Quick Debug

```bash
# Check data format
mongosh --eval "
use('assessment_db');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('assessment_db');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```

## Checklist

- [ ] User document has id field
- [ ] Session user_id matches user's id value exactly
- [ ] Both use string IDs (UUID)
- [ ] Pydantic models handle id field correctly
- [ ] Backend queries use correct field names
- [ ] API returns user data (not 401/404)
- [ ] Browser loads dashboard (not login page)

## Success Indicators

✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work with user isolation

## Failure Indicators

❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page
❌ Sessions visible across users
