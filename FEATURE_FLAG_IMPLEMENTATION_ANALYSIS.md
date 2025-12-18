# Feature Flag Control System - Implementation Analysis & Plan

## Executive Summary

The CoopVest Admin Dashboard already has a **robust feature flag system** in place with:
- ✅ Complete backend API with MongoDB models
- ✅ Advanced feature management capabilities (rollout, targeting, scheduling)
- ✅ Frontend UI components for management
- ✅ Audit logging and changelog tracking

**However**, the Flutter app (Qodo) and Web app are **NOT currently integrated** with this feature flag system. This document outlines the implementation plan to enable the admin dashboard to control features across all platforms.

---

## Current State Analysis

### 1. Admin Dashboard (✅ COMPLETE)

**Backend Implementation:**
- **Model**: `backend/models/Feature.js` - Comprehensive feature schema
- **Routes**: `backend/routes/features.js` - Full CRUD operations
- **Features**:
  - Multi-platform support (web, mobile, admin_dashboard)
  - Rollout percentage control (0-100%)
  - Target audience segmentation (all, beta_users, premium_members, specific_regions)
  - Feature status tracking (planning, development, testing, active, paused, deprecated)
  - Changelog and audit logging
  - Feature dependencies
  - Custom configuration per feature
  - Metrics tracking (enabledCount, disabledCount, toggleCount)

**Frontend Implementation:**
- `frontend/src/components/Features/` - Complete UI components
  - FeatureManagement.jsx
  - FeatureToggle.jsx
  - FeatureRollout.jsx
  - FeatureConfig.jsx
  - FeatureChangelog.jsx
  - FeatureStats.jsx
- `frontend/src/context/FeatureProvider.jsx` - Context provider
- `frontend/src/pages/FeatureManagement.jsx` - Main page

**API Endpoints Available:**
```
GET    /api/features                    - List all features
GET    /api/features/:id                - Get feature details
GET    /api/features/platform/:platform - Get features for specific platform
POST   /api/features                    - Create feature (Super Admin)
POST   /api/features/:id/toggle         - Toggle feature (Super Admin)
PATCH  /api/features/:id/rollout        - Update rollout percentage (Super Admin)
PATCH  /api/features/:id/config         - Update configuration (Super Admin)
PATCH  /api/features/:id/status         - Update status (Super Admin)
GET    /api/features/:id/changelog      - Get feature changelog
GET    /api/features/stats/summary      - Get statistics
```

### 2. Flutter App (Qodo) - ❌ NOT INTEGRATED

**Current State:**
- No feature flag service
- No integration with admin dashboard
- Uses hardcoded feature availability
- No dynamic feature control capability

**Architecture:**
- Uses Provider for state management
- Has service locator pattern
- Firebase integration for auth and data
- Modular feature-based structure

### 3. Web App - ❌ NOT INTEGRATED

**Current State:**
- No feature flag service
- No integration with admin dashboard
- Uses hardcoded feature availability
- No dynamic feature control capability

**Architecture:**
- React-based with TypeScript
- Uses context API for state management
- Vite for build tooling
- Tailwind CSS for styling
- Firebase integration

### 4. Laravel Backend - ⚠️ PARTIAL

**Current State:**
- No feature flag endpoints
- No feature flag middleware
- No integration with admin dashboard feature system

**Architecture:**
- Laravel framework
- Modular route structure
- Middleware support

---

## Implementation Plan

### Phase 1: Backend Integration (Laravel)

#### 1.1 Create Feature Flag Service
**File**: `app/Services/FeatureService.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class FeatureService
{
    private $adminDashboardUrl;
    private $cacheExpiration = 3600; // 1 hour

    public function __construct()
    {
        $this->adminDashboardUrl = config('services.admin_dashboard.url');
    }

    /**
     * Check if a feature is enabled for a user
     */
    public function isFeatureEnabled($featureName, $userId = null, $platform = 'web')
    {
        $feature = $this->getFeature($featureName, $platform);
        
        if (!$feature || !$feature['enabled']) {
            return false;
        }

        // Check rollout percentage
        if ($feature['rolloutPercentage'] < 100) {
            if (!$this->isUserInRollout($userId, $featureName, $feature['rolloutPercentage'])) {
                return false;
            }
        }

        // Check target audience
        if (!$this->isUserInTargetAudience($userId, $feature)) {
            return false;
        }

        // Check date range
        if (!$this->isWithinDateRange($feature)) {
            return false;
        }

        return true;
    }

    /**
     * Get feature configuration
     */
    public function getFeatureConfig($featureName, $platform = 'web')
    {
        $feature = $this->getFeature($featureName, $platform);
        return $feature['config'] ?? [];
    }

    /**
     * Get all enabled features for a platform
     */
    public function getEnabledFeatures($platform = 'web', $userId = null)
    {
        $cacheKey = "features:{$platform}:{$userId}";
        
        return Cache::remember($cacheKey, $this->cacheExpiration, function () use ($platform, $userId) {
            try {
                $response = Http::get("{$this->adminDashboardUrl}/api/features/platform/{$platform}");
                
                if ($response->successful()) {
                    $features = $response->json();
                    return array_filter($features, function ($feature) use ($userId) {
                        return $this->isFeatureEnabled($feature['name'], $userId, $platform);
                    });
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch features from admin dashboard', ['error' => $e->getMessage()]);
            }
            
            return [];
        });
    }

    /**
     * Get feature from cache or admin dashboard
     */
    private function getFeature($featureName, $platform = 'web')
    {
        $cacheKey = "feature:{$featureName}:{$platform}";
        
        return Cache::remember($cacheKey, $this->cacheExpiration, function () use ($featureName, $platform) {
            try {
                $response = Http::get("{$this->adminDashboardUrl}/api/features", [
                    'name' => $featureName,
                    'platform' => $platform
                ]);
                
                if ($response->successful()) {
                    $features = $response->json()['features'] ?? [];
                    return $features[0] ?? null;
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch feature from admin dashboard', ['error' => $e->getMessage()]);
            }
            
            return null;
        });
    }

    /**
     * Check if user is in rollout percentage
     */
    private function isUserInRollout($userId, $featureName, $rolloutPercentage)
    {
        if (!$userId) {
            return rand(0, 100) <= $rolloutPercentage;
        }

        // Consistent hashing for same user
        $hash = crc32($userId . $featureName) % 100;
        return $hash < $rolloutPercentage;
    }

    /**
     * Check if user is in target audience
     */
    private function isUserInTargetAudience($userId, $feature)
    {
        $targetAudience = $feature['targetAudience'] ?? 'all';

        if ($targetAudience === 'all') {
            return true;
        }

        if ($targetAudience === 'specific_regions' && !empty($feature['targetRegions'])) {
            // Implement region checking based on user data
            return true; // Placeholder
        }

        if ($targetAudience === 'specific_users' && !empty($feature['targetUserIds'])) {
            return in_array($userId, $feature['targetUserIds']);
        }

        return true;
    }

    /**
     * Check if feature is within date range
     */
    private function isWithinDateRange($feature)
    {
        $now = now();

        if ($feature['startDate'] && $now->isBefore($feature['startDate'])) {
            return false;
        }

        if ($feature['endDate'] && $now->isAfter($feature['endDate'])) {
            return false;
        }

        return true;
    }

    /**
     * Clear feature cache
     */
    public function clearCache($featureName = null, $platform = null)
    {
        if ($featureName && $platform) {
            Cache::forget("feature:{$featureName}:{$platform}");
        } else {
            Cache::flush();
        }
    }
}
```

#### 1.2 Create Feature Flag Middleware
**File**: `app/Http/Middleware/CheckFeatureFlag.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use App\Services\FeatureService;

class CheckFeatureFlag
{
    public function __construct(private FeatureService $featureService)
    {
    }

    public function handle($request, Closure $next, $featureName)
    {
        $userId = auth()->id();
        
        if (!$this->featureService->isFeatureEnabled($featureName, $userId, 'web')) {
            return response()->json(['error' => 'Feature not available'], 403);
        }

        return $next($request);
    }
}
```

#### 1.3 Create Feature Flag Controller
**File**: `app/Http/Controllers/FeatureFlagController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Services\FeatureService;

class FeatureFlagController extends Controller
{
    public function __construct(private FeatureService $featureService)
    {
    }

    /**
     * Get all enabled features for current user
     */
    public function getEnabledFeatures()
    {
        $userId = auth()->id();
        $features = $this->featureService->getEnabledFeatures('web', $userId);
        
        return response()->json([
            'features' => $features,
            'timestamp' => now()
        ]);
    }

    /**
     * Check if specific feature is enabled
     */
    public function checkFeature($featureName)
    {
        $userId = auth()->id();
        $enabled = $this->featureService->isFeatureEnabled($featureName, $userId, 'web');
        $config = $this->featureService->getFeatureConfig($featureName, 'web');
        
        return response()->json([
            'feature' => $featureName,
            'enabled' => $enabled,
            'config' => $config
        ]);
    }

    /**
     * Get feature configuration
     */
    public function getFeatureConfig($featureName)
    {
        $config = $this->featureService->getFeatureConfig($featureName, 'web');
        
        return response()->json([
            'feature' => $featureName,
            'config' => $config
        ]);
    }
}
```

#### 1.4 Register Routes
**File**: `routes/api.php`

```php
Route::middleware('auth:sanctum')->group(function () {
    // Feature flag routes
    Route::get('/features/enabled', [FeatureFlagController::class, 'getEnabledFeatures']);
    Route::get('/features/{featureName}/check', [FeatureFlagController::class, 'checkFeature']);
    Route::get('/features/{featureName}/config', [FeatureFlagController::class, 'getFeatureConfig']);
    
    // Protected routes with feature flag middleware
    Route::middleware('feature-flag:new_payment_system')->group(function () {
        // Routes that require new_payment_system feature
    });
});
```

---

### Phase 2: Flutter App Integration

#### 2.1 Create Feature Flag Service
**File**: `lib/core/services/feature_flag_service.dart`

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FeatureFlagService {
  final String baseUrl;
  final String? authToken;
  late SharedPreferences _prefs;
  static const String _cachePrefix = 'feature_flag_';
  static const int _cacheExpiration = 3600; // 1 hour

  FeatureFlagService({
    required this.baseUrl,
    this.authToken,
  });

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Check if a feature is enabled
  Future<bool> isFeatureEnabled(String featureName) async {
    try {
      final cached = _getCachedFeature(featureName);
      if (cached != null) {
        return cached['enabled'] ?? false;
      }

      final response = await http.get(
        Uri.parse('$baseUrl/api/features/$featureName/check'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _cacheFeature(featureName, data);
        return data['enabled'] ?? false;
      }
    } catch (e) {
      print('Error checking feature flag: $e');
      // Return cached value or false
      final cached = _getCachedFeature(featureName);
      return cached?['enabled'] ?? false;
    }
    return false;
  }

  /// Get feature configuration
  Future<Map<String, dynamic>> getFeatureConfig(String featureName) async {
    try {
      final cached = _getCachedFeature(featureName);
      if (cached != null && cached['config'] != null) {
        return cached['config'];
      }

      final response = await http.get(
        Uri.parse('$baseUrl/api/features/$featureName/config'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['config'] ?? {};
      }
    } catch (e) {
      print('Error fetching feature config: $e');
    }
    return {};
  }

  /// Get all enabled features
  Future<List<String>> getEnabledFeatures() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/features/enabled'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final features = data['features'] as List;
        return features.map((f) => f['name'].toString()).toList();
      }
    } catch (e) {
      print('Error fetching enabled features: $e');
    }
    return [];
  }

  /// Cache feature data
  void _cacheFeature(String featureName, Map<String, dynamic> data) {
    final cacheData = {
      ...data,
      'cached_at': DateTime.now().millisecondsSinceEpoch,
    };
    _prefs.setString(
      '$_cachePrefix$featureName',
      jsonEncode(cacheData),
    );
  }

  /// Get cached feature data
  Map<String, dynamic>? _getCachedFeature(String featureName) {
    final cached = _prefs.getString('$_cachePrefix$featureName');
    if (cached == null) return null;

    final data = jsonDecode(cached) as Map<String, dynamic>;
    final cachedAt = data['cached_at'] as int?;

    if (cachedAt != null) {
      final age = DateTime.now().millisecondsSinceEpoch - cachedAt;
      if (age > _cacheExpiration * 1000) {
        _prefs.remove('$_cachePrefix$featureName');
        return null;
      }
    }

    return data;
  }

  /// Clear cache
  Future<void> clearCache() async {
    final keys = _prefs.getKeys();
    for (final key in keys) {
      if (key.startsWith(_cachePrefix)) {
        await _prefs.remove(key);
      }
    }
  }

  /// Refresh feature flags from server
  Future<void> refreshFeatures() async {
    await clearCache();
    await getEnabledFeatures();
  }
}
```

#### 2.2 Create Feature Flag Provider
**File**: `lib/core/providers/feature_flag_provider.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:coopvest/core/services/feature_flag_service.dart';

final featureFlagServiceProvider = Provider<FeatureFlagService>((ref) {
  return FeatureFlagService(
    baseUrl: 'https://api.coopvest.com', // Configure from env
    authToken: '', // Will be set after auth
  );
});

final featureEnabledProvider = FutureProvider.family<bool, String>((ref, featureName) async {
  final service = ref.watch(featureFlagServiceProvider);
  return service.isFeatureEnabled(featureName);
});

final featureConfigProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, featureName) async {
  final service = ref.watch(featureFlagServiceProvider);
  return service.getFeatureConfig(featureName);
});

final enabledFeaturesProvider = FutureProvider<List<String>>((ref) async {
  final service = ref.watch(featureFlagServiceProvider);
  return service.getEnabledFeatures();
});
```

#### 2.3 Create Feature Flag Widget
**File**: `lib/widgets/feature_flag_widget.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:coopvest/core/providers/feature_flag_provider.dart';

class FeatureFlagWidget extends ConsumerWidget {
  final String featureName;
  final Widget child;
  final Widget? fallback;

  const FeatureFlagWidget({
    required this.featureName,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featureAsync = ref.watch(featureEnabledProvider(featureName));

    return featureAsync.when(
      data: (enabled) {
        return enabled ? child : (fallback ?? const SizedBox.shrink());
      },
      loading: () => const SizedBox.shrink(),
      error: (error, stack) {
        print('Feature flag error: $error');
        return fallback ?? const SizedBox.shrink();
      },
    );
  }
}

/// Usage in widgets:
/// FeatureFlagWidget(
///   featureName: 'new_payment_system',
///   child: NewPaymentWidget(),
///   fallback: OldPaymentWidget(),
/// )
```

---

### Phase 3: Web App Integration

#### 3.1 Create Feature Flag Service
**File**: `client/src/services/featureFlagService.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export class FeatureFlagService {
  private api: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiration = 3600000; // 1 hour

  constructor(baseURL: string, token?: string) {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    try {
      const cached = this.getFromCache(`feature:${featureName}`);
      if (cached) {
        return cached.enabled;
      }

      const response = await this.api.get<FeatureFlag>(
        `/api/features/${featureName}/check`
      );

      this.setCache(`feature:${featureName}`, response.data);
      return response.data.enabled;
    } catch (error) {
      console.error(`Error checking feature flag: ${featureName}`, error);
      return false;
    }
  }

  /**
   * Get feature configuration
   */
  async getFeatureConfig(featureName: string): Promise<Record<string, any>> {
    try {
      const cached = this.getFromCache(`config:${featureName}`);
      if (cached) {
        return cached;
      }

      const response = await this.api.get<{ config: Record<string, any> }>(
        `/api/features/${featureName}/config`
      );

      this.setCache(`config:${featureName}`, response.data.config);
      return response.data.config;
    } catch (error) {
      console.error(`Error fetching feature config: ${featureName}`, error);
      return {};
    }
  }

  /**
   * Get all enabled features
   */
  async getEnabledFeatures(): Promise<string[]> {
    try {
      const cached = this.getFromCache('enabled_features');
      if (cached) {
        return cached;
      }

      const response = await this.api.get<{ features: FeatureFlag[] }>(
        '/api/features/enabled'
      );

      const features = response.data.features.map((f) => f.name);
      this.setCache('enabled_features', features);
      return features;
    } catch (error) {
      console.error('Error fetching enabled features', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheExpiration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Update auth token
   */
  setAuthToken(token: string): void {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
```

#### 3.2 Create Feature Flag Context
**File**: `client/src/context/FeatureFlagContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { FeatureFlagService } from '../services/featureFlagService';

interface FeatureFlagContextType {
  isFeatureEnabled: (featureName: string) => Promise<boolean>;
  getFeatureConfig: (featureName: string) => Promise<Record<string, any>>;
  getEnabledFeatures: () => Promise<string[]>;
  clearCache: (key?: string) => void;
  setAuthToken: (token: string) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
  undefined
);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [service] = useState(
    () =>
      new FeatureFlagService(
        process.env.REACT_APP_API_URL || 'http://localhost:3000'
      )
  );

  const value: FeatureFlagContextType = {
    isFeatureEnabled: (featureName) => service.isFeatureEnabled(featureName),
    getFeatureConfig: (featureName) => service.getFeatureConfig(featureName),
    getEnabledFeatures: () => service.getEnabledFeatures(),
    clearCache: (key) => service.clearCache(key),
    setAuthToken: (token) => service.setAuthToken(token),
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (): FeatureFlagContextType => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  }
  return context;
};
```

#### 3.3 Create Feature Flag Hook
**File**: `client/src/hooks/useFeatureFlag.ts`

```typescript
import { useEffect, useState } from 'react';
import { useFeatureFlag } from '../context/FeatureFlagContext';

export const useFeature = (featureName: string) => {
  const { isFeatureEnabled, getFeatureConfig } = useFeatureFlag();
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        setLoading(true);
        const [isEnabled, featureConfig] = await Promise.all([
          isFeatureEnabled(featureName),
          getFeatureConfig(featureName),
        ]);
        setEnabled(isEnabled);
        setConfig(featureConfig);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    checkFeature();
  }, [featureName, isFeatureEnabled, getFeatureConfig]);

  return { enabled, config, loading, error };
};

export const useFeatures = () => {
  const { getEnabledFeatures } = useFeatureFlag();
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoading(true);
        const enabledFeatures = await getEnabledFeatures();
        setFeatures(enabledFeatures);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [getEnabledFeatures]);

  return { features, loading, error };
};
```

#### 3.4 Create Feature Flag Component
**File**: `client/src/components/FeatureFlagWrapper.tsx`

```typescript
import React from 'react';
import { useFeature } from '../hooks/useFeatureFlag';

interface FeatureFlagWrapperProps {
  featureName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export const FeatureFlagWrapper: React.FC<FeatureFlagWrapperProps> = ({
  featureName,
  children,
  fallback,
  loading: loadingComponent,
}) => {
  const { enabled, loading } = useFeature(featureName);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  return <>{enabled ? children : fallback || null}</>;
};

// Usage:
// <FeatureFlagWrapper featureName="new_payment_system">
//   <NewPaymentComponent />
// </FeatureFlagWrapper>
```

---

## Integration Checklist

### Admin Dashboard
- [x] Feature model with comprehensive schema
- [x] Feature API endpoints
- [x] Frontend UI components
- [x] Audit logging
- [ ] WebSocket support for real-time updates (optional enhancement)

### Flutter App (Qodo)
- [ ] Feature flag service
- [ ] Provider integration
- [ ] Feature flag widget
- [ ] Offline caching
- [ ] Update service locator

### Web App
- [ ] Feature flag service
- [ ] Context provider
- [ ] Custom hooks
- [ ] Wrapper component
- [ ] Integration in App.tsx

### Laravel Backend
- [ ] Feature service
- [ ] Feature controller
- [ ] Feature middleware
- [ ] Routes registration
- [ ] Configuration setup

---

## Configuration Required

### Environment Variables

**Admin Dashboard** (`.env`):
```
VITE_API_URL=http://localhost:5000
VITE_ADMIN_DASHBOARD_URL=http://localhost:3000
```

**Laravel Backend** (`.env`):
```
ADMIN_DASHBOARD_URL=http://localhost:3000
FEATURE_FLAG_CACHE_EXPIRATION=3600
```

**Flutter App** (`lib/core/config/app_config.dart`):
```dart
const String apiBaseUrl = 'http://localhost:8000';
const String adminDashboardUrl = 'http://localhost:3000';
```

**Web App** (`.env`):
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ADMIN_DASHBOARD_URL=http://localhost:3000
```

---

## Usage Examples

### Admin Dashboard - Creating a Feature

```javascript
// POST /api/features
{
  "name": "new_payment_system",
  "displayName": "New Payment System",
  "description": "Enhanced payment processing with multiple gateways",
  "category": "payment",
  "platforms": ["web", "mobile"],
  "enabled": false,
  "rolloutPercentage": 0,
  "targetAudience": "beta_users",
  "priority": "high",
  "status": "testing",
  "config": {
    "paymentGateways": ["stripe", "paypal"],
    "timeout": 30000
  }
}
```

### Flutter App - Using Feature Flag

```dart
FeatureFlagWidget(
  featureName: 'new_payment_system',
  child: NewPaymentWidget(),
  fallback: OldPaymentWidget(),
)
```

### Web App - Using Feature Flag

```typescript
function PaymentComponent() {
  const { enabled, config } = useFeature('new_payment_system');

  if (!enabled) {
    return <OldPaymentComponent />;
  }

  return <NewPaymentComponent config={config} />;
}
```

### Laravel Backend - Protecting Routes

```php
Route::middleware('auth:sanctum', 'feature-flag:new_payment_system')
  ->post('/payments', [PaymentController::class, 'store']);
```

---

## Benefits

1. **Centralized Control**: Manage all features from a single admin dashboard
2. **Gradual Rollout**: Deploy features to a percentage of users
3. **Targeted Rollout**: Enable features for specific user segments
4. **A/B Testing**: Test features with different user groups
5. **Quick Rollback**: Disable problematic features instantly
6. **Audit Trail**: Track all feature changes with timestamps and user info
7. **Zero Downtime**: Deploy features without restarting applications
8. **Cross-Platform**: Control features across web, mobile, and admin apps

---

## Next Steps

1. Implement Laravel backend integration
2. Integrate Flutter app with feature flag service
3. Integrate web app with feature flag service
4. Create comprehensive testing suite
5. Set up monitoring and analytics
6. Document feature flag naming conventions
7. Train team on feature flag best practices

