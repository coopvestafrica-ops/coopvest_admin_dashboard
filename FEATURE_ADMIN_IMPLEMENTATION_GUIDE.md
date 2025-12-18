# Feature Management & Admin Role System - Implementation Guide

## Overview

This comprehensive guide covers the implementation of a Feature Management System and Admin Role Assignment system for the Coopvest Africa platform. The system allows super admins to:

1. **Enable/Disable Features** on web and mobile apps
2. **Assign Admin Roles** to users with specific permissions
3. **Manage Admin Users** and their access levels
4. **Track Feature Changes** with audit logs

---

## Architecture

### Backend (Laravel)

#### Database Schema

**Features Table**
```sql
- id (Primary Key)
- name (unique)
- slug (unique)
- description
- is_enabled (boolean)
- category (general, core, security, etc.)
- platforms (JSON array: ['web', 'mobile'])
- metadata (JSON - additional config)
- timestamps
- soft_deletes
```

**Admin Roles Table**
```sql
- id (Primary Key)
- name (unique)
- slug (unique)
- description
- level (0=super_admin, 1=admin, 2=moderator, 3=support)
- permissions (JSON array)
- is_active (boolean)
- timestamps
- soft_deletes
```

**Admin Users Table**
```sql
- id (Primary Key)
- user_id (Foreign Key)
- role_id (Foreign Key)
- status (active, inactive, suspended)
- notes
- assigned_at
- assigned_by (Foreign Key)
- timestamps
- soft_deletes
```

**Feature Logs Table**
```sql
- id (Primary Key)
- feature_id (Foreign Key)
- admin_id (Foreign Key)
- action (enabled, disabled, updated)
- changes (JSON)
- ip_address
- user_agent
- created_at
```

#### Models

**Feature Model** (`app/Models/Feature.php`)
- Methods: `enable()`, `disable()`, `toggle()`
- Scopes: `enabled()`, `disabled()`, `byCategory()`, `byPlatform()`
- Relations: `logs()`

**AdminRole Model** (`app/Models/AdminRole.php`)
- Methods: `hasPermission()`, `addPermission()`, `removePermission()`
- Scopes: `active()`, `inactive()`, `byLevel()`
- Relations: `adminUsers()`, `users()`

**AdminUser Model** (`app/Models/AdminUser.php`)
- Methods: `isActive()`, `activate()`, `deactivate()`, `suspend()`, `hasPermission()`
- Scopes: `active()`, `inactive()`, `suspended()`, `byRole()`
- Relations: `user()`, `role()`, `assignedBy()`

**FeatureLog Model** (`app/Models/FeatureLog.php`)
- Relations: `feature()`, `admin()`

#### Controllers

**FeatureController** (`app/Http/Controllers/FeatureController.php`)
- `index()` - List all features with filters
- `show()` - Get single feature
- `store()` - Create feature
- `update()` - Update feature
- `destroy()` - Delete feature
- `enable()` - Enable feature
- `disable()` - Disable feature
- `toggle()` - Toggle feature state
- `logs()` - Get feature change logs
- `byPlatform()` - Get features for specific platform
- `isEnabled()` - Check if feature is enabled

**AdminRoleController** (`app/Http/Controllers/AdminRoleController.php`)
- `index()` - List all roles
- `show()` - Get single role
- `store()` - Create role
- `update()` - Update role
- `destroy()` - Delete role
- `addPermission()` - Add permission to role
- `removePermission()` - Remove permission from role
- `users()` - Get users with role

**AdminUserController** (`app/Http/Controllers/AdminUserController.php`)
- `index()` - List all admin users
- `show()` - Get single admin user
- `store()` - Assign role to user
- `update()` - Update admin user
- `destroy()` - Remove admin role
- `activate()` - Activate admin user
- `deactivate()` - Deactivate admin user
- `suspend()` - Suspend admin user
- `isAdmin()` - Check if user is admin
- `getByUserId()` - Get admin user by user ID

#### Middleware

**SuperAdminCheck** (`app/Http/Middleware/SuperAdminCheck.php`)
- Verifies user is a super admin (level 0)
- Checks admin user status is active
- Returns 403 if not authorized

#### Helpers

**FeatureFlag** (`app/Helpers/FeatureFlag.php`)
- `isEnabled()` - Check if feature is enabled (cached)
- `get()` - Get feature by slug (cached)
- `getEnabledForPlatform()` - Get all enabled features for platform
- `clearCache()` - Clear feature cache
- `getStatus()` - Get feature status with metadata

#### Routes

All routes are defined in `routes/feature-admin-routes.php`:

**Feature Routes** (Protected by super admin middleware)
```
GET    /features                    - List features
POST   /features                    - Create feature
GET    /features/{id}               - Get feature
PUT    /features/{id}               - Update feature
DELETE /features/{id}               - Delete feature
POST   /features/{id}/enable        - Enable feature
POST   /features/{id}/disable       - Disable feature
POST   /features/{id}/toggle        - Toggle feature
GET    /features/{id}/logs          - Get feature logs
GET    /features/platform/{platform} - Get features by platform
```

**Admin Role Routes** (Protected by super admin middleware)
```
GET    /admin-roles                 - List roles
POST   /admin-roles                 - Create role
GET    /admin-roles/{id}            - Get role
PUT    /admin-roles/{id}            - Update role
DELETE /admin-roles/{id}            - Delete role
POST   /admin-roles/{id}/permissions/add    - Add permission
POST   /admin-roles/{id}/permissions/remove - Remove permission
GET    /admin-roles/{id}/users      - Get role users
```

**Admin User Routes** (Protected by super admin middleware)
```
GET    /admin-users                 - List admin users
POST   /admin-users                 - Assign role
GET    /admin-users/{id}            - Get admin user
PUT    /admin-users/{id}            - Update admin user
DELETE /admin-users/{id}            - Remove admin role
POST   /admin-users/{id}/activate   - Activate admin user
POST   /admin-users/{id}/deactivate - Deactivate admin user
POST   /admin-users/{id}/suspend    - Suspend admin user
GET    /admin-users/user/{userId}   - Get admin user by user ID
```

**Public Routes** (Protected by auth middleware)
```
GET    /features/check/{slug}       - Check if feature is enabled
GET    /admin-users/check/{userId}  - Check if user is admin
```

---

## Frontend Implementation

### Admin Dashboard (React)

#### API Service (`src/services/featureApi.js`)

Axios-based API client with interceptors for authentication:

```javascript
// Feature API
featureApi.getFeatures(params)
featureApi.getFeature(id)
featureApi.createFeature(data)
featureApi.updateFeature(id, data)
featureApi.deleteFeature(id)
featureApi.enableFeature(id)
featureApi.disableFeature(id)
featureApi.toggleFeature(id)
featureApi.getFeatureLogs(id, params)
featureApi.getFeaturesByPlatform(platform)
featureApi.isFeatureEnabled(slug, platform)

// Admin Role API
adminRoleApi.getRoles(params)
adminRoleApi.getRole(id)
adminRoleApi.createRole(data)
adminRoleApi.updateRole(id, data)
adminRoleApi.deleteRole(id)
adminRoleApi.addPermission(id, permission)
adminRoleApi.removePermission(id, permission)
adminRoleApi.getRoleUsers(id, params)

// Admin User API
adminUserApi.getAdminUsers(params)
adminUserApi.getAdminUser(id)
adminUserApi.assignRole(data)
adminUserApi.updateAdminUser(id, data)
adminUserApi.removeAdminRole(id)
adminUserApi.activateAdminUser(id)
adminUserApi.deactivateAdminUser(id)
adminUserApi.suspendAdminUser(id)
adminUserApi.isAdmin(userId)
adminUserApi.getByUserId(userId)
```

#### State Management (`src/store/featureStore.js`)

Zustand store with actions for:
- Fetching features, roles, and admin users
- Creating, updating, and deleting features
- Toggling feature states
- Managing admin roles and users
- Error handling and caching

#### Components

**FeatureManagement** (`src/components/Features/FeatureManagement.jsx`)
- Display all features in a table
- Search and filter features
- Toggle feature states
- Delete features
- Pagination support

**AdminRoleManagement** (`src/components/AdminRoles/AdminRoleManagement.jsx`)
- Display all roles in a grid
- Search and filter roles
- View role details and permissions
- Delete roles
- Pagination support

**AdminUserManagement** (`src/components/AdminUsers/AdminUserManagement.jsx`)
- Display all admin users in a table
- Search and filter admin users
- Assign roles to users
- Activate/suspend admin users
- Remove admin roles
- Pagination support

---

## Web App Integration

### Feature Flag Service

Create `src/services/featureService.ts`:

```typescript
import axios from 'axios';

class FeatureService {
  private apiUrl = process.env.REACT_APP_API_URL;
  private cache = new Map();
  private cacheTimeout = 3600000; // 1 hour

  async isFeatureEnabled(slug: string, platform: string = 'web'): Promise<boolean> {
    const cacheKey = `${slug}:${platform}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/features/check/${slug}`,
        { params: { platform } }
      );
      
      const isEnabled = response.data.data.is_enabled;
      this.cache.set(cacheKey, isEnabled);
      
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
      
      return isEnabled;
    } catch (error) {
      console.error('Failed to check feature status:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default new FeatureService();
```

### Usage in Components

```jsx
import { useEffect, useState } from 'react';
import featureService from '../services/featureService';

function MyComponent() {
  const [isLoanFeatureEnabled, setIsLoanFeatureEnabled] = useState(false);

  useEffect(() => {
    featureService.isFeatureEnabled('loan_application', 'web')
      .then(setIsLoanFeatureEnabled);
  }, []);

  if (!isLoanFeatureEnabled) {
    return <div>Feature not available</div>;
  }

  return <div>Loan Application Feature</div>;
}
```

---

## Flutter Mobile App Integration

### Feature Flag Service

Create `lib/services/feature_service.dart`:

```dart
import 'package:dio/dio.dart';

class FeatureService {
  final Dio _dio;
  final Map<String, bool> _cache = {};

  FeatureService(this._dio);

  Future<bool> isFeatureEnabled(
    String slug, {
    String platform = 'mobile',
  }) async {
    final cacheKey = '$slug:$platform';
    
    if (_cache.containsKey(cacheKey)) {
      return _cache[cacheKey]!;
    }

    try {
      final response = await _dio.get(
        '/features/check/$slug',
        queryParameters: {'platform': platform},
      );
      
      final isEnabled = response.data['data']['is_enabled'] as bool;
      _cache[cacheKey] = isEnabled;
      
      return isEnabled;
    } catch (e) {
      print('Failed to check feature status: $e');
      return false;
    }
  }

  void clearCache() {
    _cache.clear();
  }
}
```

### Usage in Flutter

```dart
class LoanApplicationScreen extends StatefulWidget {
  @override
  State<LoanApplicationScreen> createState() => _LoanApplicationScreenState();
}

class _LoanApplicationScreenState extends State<LoanApplicationScreen> {
  late FeatureService _featureService;
  bool _isLoanFeatureEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkFeature();
  }

  Future<void> _checkFeature() async {
    final isEnabled = await _featureService.isFeatureEnabled(
      'loan_application',
      platform: 'mobile',
    );
    
    setState(() {
      _isLoanFeatureEnabled = isEnabled;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isLoanFeatureEnabled) {
      return Scaffold(
        body: Center(
          child: Text('Feature not available'),
        ),
      );
    }

    return Scaffold(
      body: Center(
        child: Text('Loan Application'),
      ),
    );
  }
}
```

---

## Setup Instructions

### Backend Setup

1. **Run Migrations**
```bash
php artisan migrate
```

2. **Seed Initial Data**
```bash
php artisan db:seed --class=AdminRoleSeeder
php artisan db:seed --class=FeatureSeeder
```

3. **Register Routes**
Add to `routes/api.php`:
```php
require base_path('routes/feature-admin-routes.php');
```

4. **Register Middleware**
Add to `app/Http/Kernel.php`:
```php
protected $routeMiddleware = [
    // ... other middleware
    'super.admin' => \App\Http\Middleware\SuperAdminCheck::class,
];
```

### Frontend Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure API URL**
Create `.env.local`:
```
VITE_API_URL=http://localhost:8000/api
```

3. **Import Components**
```jsx
import FeatureManagement from './components/Features/FeatureManagement';
import AdminRoleManagement from './components/AdminRoles/AdminRoleManagement';
import AdminUserManagement from './components/AdminUsers/AdminUserManagement';
```

---

## API Examples

### Enable a Feature

**Request**
```bash
POST /api/features/1/enable
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "message": "Feature enabled successfully",
  "data": {
    "id": 1,
    "name": "Loan Application",
    "slug": "loan_application",
    "is_enabled": true,
    "platforms": ["web", "mobile"]
  }
}
```

### Assign Role to User

**Request**
```bash
POST /api/admin-users
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": 5,
  "role_id": 2,
  "notes": "Assigned as admin for loan management"
}
```

**Response**
```json
{
  "success": true,
  "message": "Role assigned successfully",
  "data": {
    "id": 1,
    "user_id": 5,
    "role_id": 2,
    "status": "active",
    "user": {
      "id": 5,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "role": {
      "id": 2,
      "name": "Admin",
      "slug": "admin",
      "level": 1
    }
  }
}
```

### Check Feature Status

**Request**
```bash
GET /api/features/check/loan_application?platform=web
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "message": "Feature status retrieved",
  "data": {
    "slug": "loan_application",
    "is_enabled": true,
    "platform": "web",
    "metadata": {
      "min_amount": 1000,
      "max_amount": 100000
    }
  }
}
```

---

## Default Roles

The system comes with 4 pre-configured roles:

1. **Super Admin** (Level 0)
   - Full system access
   - Can manage features, admins, roles, and users

2. **Admin** (Level 1)
   - Administrative access
   - Can manage features, users, and loans

3. **Moderator** (Level 2)
   - Moderation capabilities
   - Can manage users and loans

4. **Support** (Level 3)
   - Customer support access
   - Can view logs and manage users

---

## Default Features

The system comes with 10 pre-configured features:

1. **Loan Application** - Core feature for loan applications
2. **Guarantor System** - Guarantor functionality
3. **QR Code Verification** - QR-based verification (mobile only)
4. **Two Factor Authentication** - 2FA security feature
5. **Advanced Analytics** - Analytics dashboard (web only)
6. **Mobile App Push Notifications** - Push notifications (mobile only)
7. **Email Notifications** - Email notifications
8. **Referral Program** - User referral system
9. **Investment Features** - Investment and savings
10. **Mobile App Offline Mode** - Offline functionality (mobile only)

---

## Security Considerations

1. **Authentication**: All endpoints require Bearer token authentication
2. **Authorization**: Super admin middleware ensures only super admins can manage features and roles
3. **Audit Logging**: All feature changes are logged with admin ID, IP address, and user agent
4. **Soft Deletes**: All models support soft deletes for data recovery
5. **Rate Limiting**: Consider implementing rate limiting on API endpoints
6. **CORS**: Configure CORS properly for frontend access

---

## Troubleshooting

### Features not showing in frontend
- Check API URL configuration in `.env.local`
- Verify authentication token is valid
- Check browser console for API errors

### Admin user cannot access features
- Verify user has admin role assigned
- Check admin user status is 'active'
- Verify role has required permissions

### Feature changes not reflected immediately
- Clear browser cache
- Check feature cache timeout (default 1 hour)
- Manually clear cache using `FeatureFlag::clearCache()`

---

## Future Enhancements

1. **Feature Rollout**: Gradual feature rollout to percentage of users
2. **A/B Testing**: Built-in A/B testing framework
3. **Feature Analytics**: Track feature usage and adoption
4. **Scheduled Features**: Schedule feature enable/disable at specific times
5. **Feature Dependencies**: Define feature dependencies
6. **User Segments**: Enable features for specific user segments

---

## Support

For issues or questions, please contact the development team or refer to the API documentation.
