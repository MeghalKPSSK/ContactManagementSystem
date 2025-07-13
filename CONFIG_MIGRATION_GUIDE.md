# Config Migration Guide

## Problem
Multiple components in the application are calling `fetch('/config.json')` on every API request, which is inefficient and causes unnecessary network calls.

## Solution
We have implemented a centralized `configService` and `apiService` that loads config once on app initialization and reuses it throughout the application.

## How to Migrate Components

### Step 1: Import the API Service
Replace direct config fetches with the API service:

```javascript
// BEFORE (inefficient)
import { toast } from 'react-toastify';

// AFTER (optimized)
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
```

### Step 2: Replace API Calls

#### BEFORE (old pattern):
```javascript
const handleSomeAction = async () => {
  try {
    const config = await fetch('/config.json').then(res => res.json());
    const response = await fetch(`${config.apiUrl}/some-endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    // handle result
  } catch (error) {
    // handle error
  }
};
```

#### AFTER (new pattern):
```javascript
const handleSomeAction = async () => {
  try {
    const result = await apiService.someMethod(data);
    if (result.success) {
      // handle success
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    // handle error
  }
};
```

## Available API Service Methods

### User Operations
- `apiService.loginUser(credentials)`
- `apiService.registerUser(userData)`
- `apiService.getUserById(userId)`
- `apiService.updateUser(userId, userData)`
- `apiService.changePassword(userId, passwordData)`

### Contact Operations
- `apiService.getContacts(userId)`
- `apiService.createContact(contactData)`
- `apiService.updateContact(contactId, contactData)`
- `apiService.deleteContact(contactId)`
- `apiService.starContact(contactId)`
- `apiService.unstarContact(contactId)`

### Group Operations
- `apiService.getGroups(userId)`
- `apiService.getGroupById(groupId)`
- `apiService.createGroup(groupData)`
- `apiService.updateGroup(groupId, groupData)`
- `apiService.deleteGroup(groupId)`
- `apiService.addGroupMember(groupId, memberData)`
- `apiService.removeGroupMember(groupId, memberId)`

### Dashboard Operations
- `apiService.getDashboardData(userId)`

### Utility Methods
- `apiService.getImageUrl(imagePath)` - For constructing image URLs
- `apiService.fetch(endpoint, options)` - For custom API calls

## Files That Need Migration

The following files still contain direct config.json fetches and should be updated:

### Components to Update:
1. `src/components/Groups/GroupModal.jsx` (3 instances)
2. `src/components/Groups/Groups.jsx` (3 instances)
3. `src/components/Groups/GroupDetails.jsx` (4 instances)
4. `src/components/Contacts/Contacts.jsx` (3 instances)
5. `src/components/Contacts/ContactModal.jsx` (4 instances)

### Example Migration - Contacts Component:

#### BEFORE:
```javascript
const fetchContacts = async () => {
  try {
    const config = await fetch('/config.json').then(res => res.json());
    const response = await fetch(`${config.apiUrl}/contacts/contactsList/${userId}`);
    const data = await response.json();
    setContacts(data.contacts);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### AFTER:
```javascript
const fetchContacts = async () => {
  try {
    const data = await apiService.getContacts(userId);
    if (data.success) {
      setContacts(data.contacts);
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to fetch contacts');
  }
};
```

## Benefits After Migration

1. **Performance**: Config is loaded only once on app start
2. **Efficiency**: No redundant network calls for config
3. **Maintainability**: Centralized API management
4. **Error Handling**: Consistent error handling across all API calls
5. **Type Safety**: Better code organization and reusability

## Status
✅ **Completed:**
- ConfigService implementation
- ApiService implementation
- App-level config loading
- Profile component migration
- Login component migration
- RegisterUser component migration

🔄 **In Progress:**
- Contacts component (partially done)

📋 **Remaining:**
- Groups components
- ContactModal component
- Dashboard component (if any direct fetches exist)

## Next Steps
Apply the patterns shown above to migrate the remaining components. Each component should follow the same pattern:
1. Import apiService
2. Replace direct fetch calls with apiService methods
3. Handle responses using the consistent success/error pattern
4. Remove any direct config.json fetch calls
