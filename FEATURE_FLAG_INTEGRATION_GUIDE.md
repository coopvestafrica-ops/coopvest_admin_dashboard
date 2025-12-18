# Feature Flag Integration Guide - Complete Implementation

## Overview

This guide provides step-by-step instructions to integrate the feature flag system across all CoopVest platforms:
- Admin Dashboard (already complete)
- Flutter App (Qodo)
- Web App
- Laravel Backend

---

## Part 1: Laravel Backend Integration

### Step 1: Copy Files

Copy the following files to your Laravel project:

```bash
# Service
cp coopvest_africa_backend/app/Services/FeatureService.php app/Services/

# Middleware
cp coopvest_africa_backend/app/Http/Middleware/CheckFeatureFlag.php app/Http/Middleware/

# Controller
cp coopvest_africa_backend/app/Http/Controllers/FeatureFlagController.php app/Http/Controllers/
```

### Step 2: Register Middleware

Edit `app/Http/Kernel.php`:

```php
protected $routeMiddleware = [
    // ... existing middleware
    'feature-flag' => \App\Http\Middleware\CheckFeatureFlag::class,
];
```

### Step 3: Add Routes

Edit `routes/api.php`:

```php
<?php

use App\Http\Controllers\FeatureFlagController;

Route::middleware('auth:sanctum')->group(function () {
    // Feature flag routes
    Route::get('/features/enabled', [FeatureFlagController::class, 'getEnabledFeatures']);
    Route::get('/features/{featureName}/check', [FeatureFlagController::class, 'checkFeature']);
    Route::get('/features/{featureName}/config', [FeatureFlagController::class, 'getFeatureConfig']);
    Route::post('/features/multiple', [FeatureFlagController::class, 'getMultipleFeatures']);
    Route::post('/features/cache/clear', [FeatureFlagController::class, 'clearCache'])->middleware('admin');
});
```

### Step 4: Configure Environment

Edit `.env`:

```env
ADMIN_DASHBOARD_URL=http://localhost:3000
FEATURE_FLAG_CACHE_EXPIRATION=3600
```

### Step 5: Test Backend Integration

```bash
# Test endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/features/enabled

# Expected response:
{
  "features": [],
  "platform": "web",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Part 2: Flutter App Integration

### Step 1: Copy Files

Copy the following files to your Flutter project:

```bash
# Service
cp coopvest_Qodo/lib/core/services/feature_flag_service.dart lib/core/services/

# Provider
cp coopvest_Qodo/lib/core/providers/feature_flag_provider.dart lib/core/providers/

# Widget
cp coopvest_Qodo/lib/widgets/feature_flag_widget.dart lib/widgets/
```

### Step 2: Update pubspec.yaml

Ensure you have the required dependencies:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.1
  shared_preferences: ^2.2.3
  flutter_riverpod: ^2.4.0  # Add if not present
```

Run:
```bash
flutter pub get
```

### Step 3: Initialize Service in Main

Edit `lib/main.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:coopvest/core/providers/feature_flag_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize feature flag service
  final container = ProviderContainer();
  final service = container.read(featureFlagServiceProvider);
  await service.initialize();
  
  runApp(
    ProviderScope(
      child: MyApp(),
    ),
  );
}
```

### Step 4: Update Service Locator

Edit `lib/core/utils/service_locator.dart`:

```dart
import 'package:coopvest/core/services/feature_flag_service.dart';

void setupServiceLocator() {
  // ... existing setup
  
  // Feature Flag Service
  getIt.registerSingleton<FeatureFlagService>(
    FeatureFlagService(
      baseUrl: 'http://localhost:8000',
      authToken: '', // Will be set after auth
    ),
  );
}
```

### Step 5: Use Feature Flags in Widgets

Example 1: Simple Feature Toggle

```dart
import 'package:coopvest/widgets/feature_flag_widget.dart';

class PaymentScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FeatureFlagWidget(
      featureName: 'new_payment_system',
      child: NewPaymentWidget(),
      fallback: OldPaymentWidget(),
    );
  }
}
```

Example 2: With Configuration

```dart
import 'package:coopvest/widgets/feature_flag_widget.dart';

class PaymentScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FeatureConfigWidget(
      featureName: 'new_payment_system',
      builder: (config) {
        return PaymentWidget(
          timeout: config['timeout'] ?? 30000,
          gateways: config['paymentGateways'] ?? [],
        );
      },
    );
  }
}
```

Example 3: Get All Enabled Features

```dart
import 'package:coopvest/widgets/feature_flag_widget.dart';

class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return EnabledFeaturesWidget(
      builder: (features) {
        return Column(
          children: [
            if (features.contains('new_payment_system'))
              NewPaymentButton(),
            if (features.contains('advanced_analytics'))
              AnalyticsButton(),
          ],
        );
      },
    );
  }
}
```

### Step 6: Update Auth Service

After user login, update the auth token:

```dart
// In your auth service or login screen
final featureFlagService = getIt<FeatureFlagService>();
featureFlagService.setAuthToken(authToken);
```

---

## Part 3: Web App Integration

### Step 1: Copy Files

Copy the following files to your web project:

```bash
# Service
cp coopvest_africa_website/client/src/services/featureFlagService.ts client/src/services/

# Context
cp coopvest_africa_website/client/src/context/FeatureFlagContext.tsx client/src/context/

# Hooks
cp coopvest_africa_website/client/src/hooks/useFeatureFlag.ts client/src/hooks/

# Component
cp coopvest_africa_website/client/src/components/FeatureFlagWrapper.tsx client/src/components/
```

### Step 2: Wrap App with Provider

Edit `client/src/App.tsx`:

```typescript
import { FeatureFlagProvider } from './context/FeatureFlagContext';

function App() {
  return (
    <FeatureFlagProvider
      baseURL={process.env.REACT_APP_API_URL}
      autoRefresh={true}
      autoRefreshInterval={300000}
    >
      {/* Your app content */}
    </FeatureFlagProvider>
  );
}

export default App;
```

### Step 3: Update Environment Variables

Edit `.env`:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ADMIN_DASHBOARD_URL=http://localhost:3000
```

### Step 4: Use Feature Flags in Components

Example 1: Simple Feature Toggle

```typescript
import { FeatureFlagWrapper } from './components/FeatureFlagWrapper';

function PaymentComponent() {
  return (
    <FeatureFlagWrapper featureName="new_payment_system">
      <NewPaymentComponent />
    </FeatureFlagWrapper>
  );
}
```

Example 2: Using Hook

```typescript
import { useFeature } from './hooks/useFeatureFlag';

function PaymentComponent() {
  const { enabled, config, loading } = useFeature('new_payment_system');

  if (loading) return <Skeleton />;

  if (!enabled) {
    return <OldPaymentComponent />;
  }

  return (
    <NewPaymentComponent
      timeout={config.timeout}
      gateways={config.paymentGateways}
    />
  );
}
```

Example 3: Multiple Features

```typescript
import { useMultipleFeatures } from './hooks/useFeatureFlag';

function DashboardComponent() {
  const features = useMultipleFeatures([
    'new_payment_system',
    'advanced_analytics',
    'ai_recommendations',
  ]);

  return (
    <div>
      {features['new_payment_system'] && <NewPaymentWidget />}
      {features['advanced_analytics'] && <AnalyticsWidget />}
      {features['ai_recommendations'] && <AIWidget />}
    </div>
  );
}
```

Example 4: Get All Features

```typescript
import { useFeatures } from './hooks/useFeatureFlag';

function FeatureListComponent() {
  const { features, loading } = useFeatures();

  if (loading) return <Skeleton />;

  return (
    <ul>
      {features.map((feature) => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
  );
}
```

### Step 5: Update Auth Integration

After user login, update the auth token:

```typescript
import { useFeatureFlag } from './context/FeatureFlagContext';

function LoginComponent() {
  const { setAuthToken } = useFeatureFlag();

  const handleLogin = async (credentials) => {
    const response = await loginAPI(credentials);
    const { token } = response.data;
    
    // Update feature flag service with auth token
    setAuthToken(token);
  };

  return (
    // Login form
  );
}
```

---

## Part 4: Admin Dashboard Configuration

### Create Features in Admin Dashboard

1. Navigate to: `http://localhost:3000/admin/features`
2. Click "Create Feature"
3. Fill in the form:

```
Name: new_payment_system
Display Name: New Payment System
Description: Enhanced payment processing with multiple gateways
Category: payment
Platforms: web, mobile
Enabled: false (start disabled)
Rollout Percentage: 0
Target Audience: all
Priority: high
Status: testing
Config:
{
  "timeout": 30000,
  "paymentGateways": ["stripe", "paypal"]
}
```

4. Click "Create"

### Enable Feature for Testing

1. Find the feature in the list
2. Click "Toggle" to enable it
3. Set rollout percentage to 10% for gradual rollout
4. Monitor usage and gradually increase percentage

### Target Specific Users

1. Edit the feature
2. Set "Target Audience" to "specific_users"
3. Add user IDs to "Target User IDs"
4. Save

---

## Testing the Integration

### Test 1: Backend API

```bash
# Get enabled features
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/features/enabled

# Check specific feature
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/features/new_payment_system/check

# Get feature config
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/features/new_payment_system/config
```

### Test 2: Flutter App

```dart
// In your test
void main() {
  testWidgets('Feature flag widget shows child when enabled', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: FeatureFlagWidget(
            featureName: 'test_feature',
            child: Text('Feature Enabled'),
            fallback: Text('Feature Disabled'),
          ),
        ),
      ),
    );

    // Verify widget is displayed
    expect(find.text('Feature Enabled'), findsOneWidget);
  });
}
```

### Test 3: Web App

```typescript
// In your test
describe('FeatureFlagWrapper', () => {
  it('should show child when feature is enabled', async () => {
    const { getByText } = render(
      <FeatureFlagProvider>
        <FeatureFlagWrapper featureName="test_feature">
          <div>Feature Enabled</div>
        </FeatureFlagWrapper>
      </FeatureFlagProvider>
    );

    await waitFor(() => {
      expect(getByText('Feature Enabled')).toBeInTheDocument();
    });
  });
});
```

---

## Monitoring and Debugging

### Check Feature Status

**Admin Dashboard**: `http://localhost:3000/admin/features`

### View Logs

**Laravel**:
```bash
tail -f storage/logs/laravel.log
```

**Flutter**: Check console output in IDE

**Web**: Check browser console (F12)

### Clear Cache

**API Endpoint**:
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/features/cache/clear
```

**Laravel CLI**:
```bash
php artisan cache:clear
```

---

## Best Practices

1. **Feature Naming**: Use descriptive, snake_case names
   - ✅ `new_payment_system`
   - ❌ `newPayment` or `NPS`

2. **Gradual Rollout**: Start with 0%, increase gradually
   - 0% → 10% → 25% → 50% → 100%

3. **Monitoring**: Track feature usage and errors
   - Monitor error rates
   - Track user adoption
   - Watch performance metrics

4. **Documentation**: Document all features
   - Purpose and benefits
   - Configuration options
   - Rollback procedure

5. **Testing**: Test both enabled and disabled states
   - Unit tests
   - Integration tests
   - E2E tests

6. **Cleanup**: Remove old features after full rollout
   - Archive deprecated features
   - Clean up code
   - Update documentation

---

## Troubleshooting

### Features Not Loading

**Check**:
1. Admin dashboard is running
2. Backend API is running
3. Network connectivity
4. Auth token is valid
5. Feature exists in admin dashboard

**Solution**:
```bash
# Clear cache
php artisan cache:clear

# Restart services
docker-compose restart
```

### Cache Issues

**Clear cache**:
```bash
# Laravel
php artisan cache:clear

# API endpoint
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/features/cache/clear
```

### Auth Token Issues

**Update token**:
```typescript
// Web
const { setAuthToken } = useFeatureFlag();
setAuthToken(newToken);

// Flutter
final service = getIt<FeatureFlagService>();
service.setAuthToken(newToken);
```

---

## Support

For issues or questions:
1. Check the documentation
2. Review logs
3. Test with curl/Postman
4. Contact the development team

---

## Rollback Procedure

If a feature causes issues:

1. **Immediate**: Disable in admin dashboard
2. **Verify**: Check all platforms reflect the change
3. **Investigate**: Review logs and error reports
4. **Fix**: Deploy code fix
5. **Re-enable**: Gradually re-enable with monitoring

---

## Next Steps

1. ✅ Set up backend integration
2. ✅ Set up Flutter integration
3. ✅ Set up web integration
4. ⏳ Create initial features in admin dashboard
5. ⏳ Test across all platforms
6. ⏳ Deploy to production
7. ⏳ Monitor and optimize

