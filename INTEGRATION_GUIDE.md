# Integration Guide: Feature Management Across Platforms

This guide explains how to integrate the feature management system with your web app, mobile app, and admin dashboard.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│  (Feature Management & Role Assignment)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ /api/features - Feature Management                  │   │
│  │ /api/roles - Role Management                        │   │
│  │ /api/statistics - Analytics                         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │  Web   │  │Mobile  │  │  Admin   │
    │  App   │  │  App   │  │Dashboard │
    │(React) │  │(Flutter)  │(React)   │
    └────────┘  └────────┘  └──────────┘
```

---

## 📱 Mobile App (Flutter) Integration

### 1. Setup

Add HTTP package to `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.1.0
  shared_preferences: ^2.2.0
```

### 2. Create Feature Service

Create `lib/services/feature_service.dart`:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FeatureService {
  static const String _baseUrl = 'https://api.coopvest.com/api';
  static const String _cacheKey = 'mobile_features';
  static const int _cacheDurationMinutes = 60;
  
  final String _token;
  
  FeatureService(this._token);
  
  /// Fetch features for mobile platform
  Future<List<Feature>> getMobileFeatures() async {
    try {
      // Check cache first
      final cached = await _getCachedFeatures();
      if (cached != null) {
        return cached;
      }
      
      // Fetch from API
      final response = await http.get(
        Uri.parse('$_baseUrl/features/platform/mobile'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Content-Type': 'application/json',
        },
      ).timeout(Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final features = data
            .map((json) => Feature.fromJson(json))
            .toList();
        
        // Cache features
        await _cacheFeatures(features);
        
        return features;
      } else {
        throw Exception('Failed to load features');
      }
    } catch (e) {
      print('Error fetching features: $e');
      // Return cached features if available
      return await _getCachedFeatures() ?? [];
    }
  }
  
  /// Check if a specific feature is enabled
  Future<bool> isFeatureEnabled(String featureName) async {
    final features = await getMobileFeatures();
    return features.any((f) => f.name == featureName && f.enabled);
  }
  
  /// Get feature configuration
  Future<Map<String, dynamic>?> getFeatureConfig(String featureName) async {
    final features = await getMobileFeatures();
    final feature = features.firstWhere(
      (f) => f.name == featureName,
      orElse: () => Feature.empty(),
    );
    return feature.config;
  }
  
  /// Cache features locally
  Future<void> _cacheFeatures(List<Feature> features) async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(features.map((f) => f.toJson()).toList());
    await prefs.setString(_cacheKey, json);
    await prefs.setInt('${_cacheKey}_timestamp', DateTime.now().millisecondsSinceEpoch);
  }
  
  /// Get cached features if not expired
  Future<List<Feature>?> _getCachedFeatures() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_cacheKey);
    final timestamp = prefs.getInt('${_cacheKey}_timestamp') ?? 0;
    
    if (json == null) return null;
    
    // Check if cache is expired
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - timestamp > _cacheDurationMinutes * 60 * 1000) {
      return null;
    }
    
    final List<dynamic> data = jsonDecode(json);
    return data.map((json) => Feature.fromJson(json)).toList();
  }
}

class Feature {
  final String name;
  final String displayName;
  final String description;
  final bool enabled;
  final int rolloutPercentage;
  final Map<String, dynamic>? config;
  
  Feature({
    required this.name,
    required this.displayName,
    required this.description,
    required this.enabled,
    required this.rolloutPercentage,
    this.config,
  });
  
  factory Feature.empty() => Feature(
    name: '',
    displayName: '',
    description: '',
    enabled: false,
    rolloutPercentage: 0,
  );
  
  factory Feature.fromJson(Map<String, dynamic> json) {
    return Feature(
      name: json['name'] ?? '',
      displayName: json['displayName'] ?? '',
      description: json['description'] ?? '',
      enabled: json['enabled'] ?? false,
      rolloutPercentage: json['rolloutPercentage'] ?? 0,
      config: json['config'],
    );
  }
  
  Map<String, dynamic> toJson() => {
    'name': name,
    'displayName': displayName,
    'description': description,
    'enabled': enabled,
    'rolloutPercentage': rolloutPercentage,
    'config': config,
  };
}
```

### 3. Usage in Widgets

```dart
// In your main app or provider
final featureService = FeatureService(authToken);

// Check if feature is enabled
if (await featureService.isFeatureEnabled('loan_application')) {
  // Show loan feature
}

// Get feature configuration
final config = await featureService.getFeatureConfig('mobile_wallet');
if (config != null) {
  final walletLimit = config['daily_limit'] ?? 100000;
}

// In a widget
class LoanApplicationScreen extends StatefulWidget {
  @override
  State<LoanApplicationScreen> createState() => _LoanApplicationScreenState();
}

class _LoanApplicationScreenState extends State<LoanApplicationScreen> {
  late Future<bool> _isEnabled;
  
  @override
  void initState() {
    super.initState();
    _isEnabled = featureService.isFeatureEnabled('loan_application');
  }
  
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _isEnabled,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(child: CircularProgressIndicator());
        }
        
        if (snapshot.data == true) {
          return LoanApplicationForm();
        } else {
          return Center(
            child: Text('This feature is not available yet'),
          );
        }
      },
    );
  }
}
```

---

## 🌐 Web App (React) Integration

### 1. Create Feature Hook

Create `src/hooks/useFeatures.js`:

```javascript
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.coopvest.com/api'

export const useFeatures = (platform = 'web') => {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/features/platform/${platform}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )
        setFeatures(response.data)
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching features:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFeatures()
    
    // Refresh features every 5 minutes
    const interval = setInterval(fetchFeatures, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [platform])
  
  const isFeatureEnabled = (featureName) => {
    return features.some(f => f.name === featureName && f.enabled)
  }
  
  const getFeatureConfig = (featureName) => {
    const feature = features.find(f => f.name === featureName)
    return feature?.config || null
  }
  
  return {
    features,
    loading,
    error,
    isFeatureEnabled,
    getFeatureConfig
  }
}
```

### 2. Create Feature Gate Component

Create `src/components/FeatureGate.jsx`:

```javascript
import React from 'react'
import { useFeatures } from '../hooks/useFeatures'

export const FeatureGate = ({ 
  featureName, 
  children, 
  fallback = null,
  platform = 'web'
}) => {
  const { isFeatureEnabled, loading } = useFeatures(platform)
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (isFeatureEnabled(featureName)) {
    return children
  }
  
  return fallback
}

// Usage
export const ConditionalFeature = ({ featureName, children }) => (
  <FeatureGate 
    featureName={featureName}
    fallback={<p>This feature is not available yet</p>}
  >
    {children}
  </FeatureGate>
)
```

### 3. Usage in Components

```javascript
import { useFeatures } from '../hooks/useFeatures'
import { FeatureGate } from '../components/FeatureGate'

function Dashboard() {
  const { isFeatureEnabled, getFeatureConfig } = useFeatures()
  
  return (
    <div>
      {/* Conditional rendering */}
      {isFeatureEnabled('investment_pools') && (
        <InvestmentPoolsSection />
      )}
      
      {/* Using FeatureGate component */}
      <FeatureGate featureName="advanced_analytics">
        <AnalyticsSection />
      </FeatureGate>
      
      {/* Get feature configuration */}
      {isFeatureEnabled('mobile_wallet') && (
        <WalletSection 
          config={getFeatureConfig('mobile_wallet')}
        />
      )}
    </div>
  )
}
```

---

## 🔄 Synchronization Strategy

### Real-time Updates

For real-time feature updates, implement WebSocket or polling:

```javascript
// Polling approach (simpler)
useEffect(() => {
  const interval = setInterval(() => {
    fetchFeatures()
  }, 30000) // Check every 30 seconds
  
  return () => clearInterval(interval)
}, [])

// WebSocket approach (more efficient)
useEffect(() => {
  const ws = new WebSocket('wss://api.coopvest.com/features')
  
  ws.onmessage = (event) => {
    const updatedFeatures = JSON.parse(event.data)
    setFeatures(updatedFeatures)
  }
  
  return () => ws.close()
}, [])
```

---

## 🔐 Security Best Practices

1. **Always use HTTPS** for API calls
2. **Store token securely** (use secure storage in mobile)
3. **Validate features** on both client and server
4. **Don't expose sensitive config** in client-side code
5. **Implement rate limiting** for feature requests
6. **Cache features locally** to reduce API calls
7. **Handle errors gracefully** with fallbacks

---

## 📊 Monitoring

### Track Feature Usage

```javascript
// Log feature usage
const trackFeatureUsage = async (featureName, action) => {
  await axios.post(`${API_BASE_URL}/analytics/feature-usage`, {
    featureName,
    action,
    platform: 'web',
    timestamp: new Date().toISOString()
  })
}

// Usage
trackFeatureUsage('loan_application', 'viewed')
trackFeatureUsage('loan_application', 'submitted')
```

---

## 🚀 Deployment Checklist

- [ ] Update API endpoints in all apps
- [ ] Implement feature service in mobile app
- [ ] Implement feature hook in web app
- [ ] Add feature gates to UI components
- [ ] Test feature toggling
- [ ] Set up monitoring
- [ ] Document feature names
- [ ] Train team on feature management
- [ ] Set up gradual rollout strategy
- [ ] Monitor metrics and errors

---

## 📞 Support

For integration questions:

1. Check API documentation in FEATURE_MANAGEMENT.md
2. Review example implementations
3. Check admin dashboard for feature status
4. Review audit logs for changes

---

**Last Updated**: December 2024
**Version**: 1.0.0
