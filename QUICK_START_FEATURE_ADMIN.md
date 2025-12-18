# Quick Start Guide - Feature Management & Admin Roles

## 5-Minute Setup

### Backend (Laravel)

1. **Copy Files**
   - Copy all migration files from `coopvest_africa_backend/database/migrations/`
   - Copy all model files from `coopvest_africa_backend/app/Models/`
   - Copy all controller files from `coopvest_africa_backend/app/Http/Controllers/`
   - Copy middleware file from `coopvest_africa_backend/app/Http/Middleware/`
   - Copy helper file from `coopvest_africa_backend/app/Helpers/`
   - Copy seeder files from `coopvest_africa_backend/database/seeders/`

2. **Run Migrations**
   ```bash
   cd coopvest_africa_backend
   php artisan migrate
   ```

3. **Seed Data**
   ```bash
   php artisan db:seed --class=AdminRoleSeeder
   php artisan db:seed --class=FeatureSeeder
   ```

4. **Register Routes**
   Add to `routes/api.php`:
   ```php
   require base_path('routes/feature-admin-routes.php');
   ```

5. **Register Middleware**
   Add to `app/Http/Kernel.php` in `$routeMiddleware`:
   ```php
   'super.admin' => \App\Http\Middleware\SuperAdminCheck::class,
   ```

### Frontend (Admin Dashboard)

1. **Copy Files**
   - Copy `src/services/featureApi.js`
   - Copy `src/store/featureStore.js`
   - Copy `src/components/Features/FeatureManagement.jsx`
   - Copy `src/components/AdminRoles/AdminRoleManagement.jsx`
   - Copy `src/components/AdminUsers/AdminUserManagement.jsx`

2. **Install Dependencies** (if not already installed)
   ```bash
   cd coopvest_admin_dashboard/frontend
   npm install axios zustand react-hot-toast lucide-react
   ```

3. **Configure API URL**
   Create `.env.local`:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Add Routes to Navigation**
   ```jsx
   import FeatureManagement from './components/Features/FeatureManagement';
   import AdminRoleManagement from './components/AdminRoles/AdminRoleManagement';
   import AdminUserManagement from './components/AdminUsers/AdminUserManagement';

   // In your router:
   {
     path: '/admin/features',
     element: <FeatureManagement />
   },
   {
     path: '/admin/roles',
     element: <AdminRoleManagement />
   },
   {
     path: '/admin/users',
     element: <AdminUserManagement />
   }
   ```

### Web App Integration

1. **Create Feature Service**
   Create `src/services/featureService.ts`:
   ```typescript
   import axios from 'axios';

   class FeatureService {
     async isFeatureEnabled(slug: string, platform: string = 'web'): Promise<boolean> {
       try {
         const response = await axios.get(
           `${process.env.REACT_APP_API_URL}/features/check/${slug}`,
           { params: { platform } }
         );
         return response.data.data.is_enabled;
       } catch (error) {
         return false;
       }
     }
   }

   export default new FeatureService();
   ```

2. **Use in Components**
   ```jsx
   import featureService from '../services/featureService';

   function MyComponent() {
     const [isEnabled, setIsEnabled] = useState(false);

     useEffect(() => {
       featureService.isFeatureEnabled('loan_application', 'web')
         .then(setIsEnabled);
     }, []);

     if (!isEnabled) return null;
     return <div>Feature Content</div>;
   }
   ```

### Flutter Mobile App Integration

1. **Create Feature Service**
   Create `lib/services/feature_service.dart`:
   ```dart
   import 'package:dio/dio.dart';

   class FeatureService {
     final Dio _dio;

     FeatureService(this._dio);

     Future<bool> isFeatureEnabled(String slug) async {
       try {
         final response = await _dio.get(
           '/features/check/$slug',
           queryParameters: {'platform': 'mobile'},
         );
         return response.data['data']['is_enabled'] as bool;
       } catch (e) {
         return false;
       }
     }
   }
   ```

2. **Use in Screens**
   ```dart
   class MyScreen extends StatefulWidget {
     @override
     State<MyScreen> createState() => _MyScreenState();
   }

   class _MyScreenState extends State<MyScreen> {
     bool _isEnabled = false;

     @override
     void initState() {
       super.initState();
       _checkFeature();
     }

     Future<void> _checkFeature() async {
       final isEnabled = await featureService.isFeatureEnabled('loan_application');
       setState(() => _isEnabled = isEnabled);
     }

     @override
     Widget build(BuildContext context) {
       if (!_isEnabled) return SizedBox.shrink();
       return Text('Feature Content');
     }
   }
   ```

---

## Testing the System

### 1. Create a Feature
```bash
curl -X POST http://localhost:8000/api/features \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Feature",
    "slug": "test_feature",
    "description": "A test feature",
    "category": "test",
    "platforms": ["web", "mobile"]
  }'
```

### 2. Enable a Feature
```bash
curl -X POST http://localhost:8000/api/features/1/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Feature Status
```bash
curl -X GET "http://localhost:8000/api/features/check/test_feature?platform=web" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Assign Admin Role
```bash
curl -X POST http://localhost:8000/api/admin-users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "role_id": 2,
    "notes": "Assigned as admin"
  }'
```

---

## Default Credentials

After seeding, you'll have:

**Roles:**
- Super Admin (ID: 1, Level: 0)
- Admin (ID: 2, Level: 1)
- Moderator (ID: 3, Level: 2)
- Support (ID: 4, Level: 3)

**Features:**
- Loan Application (enabled)
- Guarantor System (enabled)
- QR Code Verification (disabled)
- Two Factor Authentication (disabled)
- Advanced Analytics (disabled)
- Mobile App Push Notifications (disabled)
- Email Notifications (enabled)
- Referral Program (disabled)
- Investment Features (disabled)
- Mobile App Offline Mode (disabled)

---

## Common Tasks

### Enable a Feature for All Platforms
```php
$feature = Feature::where('slug', 'loan_application')->first();
$feature->enable(auth()->id());
```

### Check if User is Admin
```php
$adminUser = AdminUser::where('user_id', $userId)->first();
if ($adminUser && $adminUser->isActive()) {
    // User is an active admin
}
```

### Get All Permissions for Admin
```php
$adminUser = AdminUser::where('user_id', $userId)->with('role')->first();
$permissions = $adminUser->role->permissions;
```

### Disable Feature for Specific Platform
```php
$feature = Feature::find(1);
$platforms = array_filter($feature->platforms, fn($p) => $p !== 'mobile');
$feature->update(['platforms' => array_values($platforms)]);
```

---

## Troubleshooting

**Q: Getting 403 Forbidden error**
A: Make sure you're logged in as a super admin. Check that your user has an admin role with level 0.

**Q: Features not showing in frontend**
A: Verify the API URL is correct in your `.env.local` file and the backend is running.

**Q: Feature changes not reflected immediately**
A: The system caches features for 1 hour. Clear cache with `FeatureFlag::clearCache()` or wait for cache to expire.

**Q: Cannot delete a role**
A: Make sure no active admin users have that role assigned.

---

## Next Steps

1. Customize the default roles and permissions for your needs
2. Add more features as needed
3. Implement feature-based conditional rendering in your apps
4. Set up monitoring and analytics for feature usage
5. Create scheduled tasks for feature rollouts

---

## Support

For detailed documentation, see `FEATURE_ADMIN_IMPLEMENTATION_GUIDE.md`
