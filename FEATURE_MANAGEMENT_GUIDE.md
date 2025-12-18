# Feature Management System - Complete Guide

## Overview

The Coopvest Admin Dashboard now includes a comprehensive **Feature Management System** that allows you to control feature flags across web, mobile, and admin dashboard platforms. This system enables:

- ✅ **Feature Toggles** - Enable/disable features instantly
- ✅ **Gradual Rollout** - Roll out features to a percentage of users
- ✅ **Platform-Specific Control** - Different features for web, mobile, and admin
- ✅ **A/B Testing** - Test features with specific user segments
- ✅ **Audit Trail** - Complete changelog of all feature modifications
- ✅ **Real-time Analytics** - Track feature usage and metrics

---

## Architecture

### Backend Components

#### 1. **Feature Model** (`backend/models/Feature.js`)
Comprehensive MongoDB schema with:
- Feature metadata (name, display name, description)
- Category classification (payment, lending, investment, etc.)
- Platform targeting (web, mobile, admin_dashboard)
- Rollout configuration (percentage, target audience)
- Status tracking (planning, development, testing, active, paused, deprecated)
- Changelog and metrics

#### 2. **Feature Routes** (`backend/routes/features.js`)
RESTful API endpoints:
- `GET /api/features` - List all features with filters
- `GET /api/features/:id` - Get feature details
- `GET /api/features/platform/:platform` - Get features for specific platform
- `POST /api/features` - Create new feature
- `POST /api/features/:id/toggle` - Toggle feature on/off
- `PATCH /api/features/:id/rollout` - Update rollout percentage
- `PATCH /api/features/:id/config` - Update feature configuration
- `PATCH /api/features/:id/status` - Update feature status
- `GET /api/features/:id/changelog` - View feature history
- `GET /api/features/stats/summary` - Get feature statistics

### Frontend Components

#### 1. **Feature Store** (`frontend/src/store/featureStore.js`)
Zustand store managing:
- Feature state and caching
- API communication
- Feature lookup by name
- Filtering and pagination
- Error handling

#### 2. **Feature API** (`frontend/src/api/featureApi.js`)
Axios client for backend communication

#### 3. **Custom Hooks**
- `useFeature(featureName)` - Check if single feature is enabled
- `useFeatures(featureNames[])` - Check multiple features
- `useFeatureContext()` - Access feature context

#### 4. **Feature Provider** (`frontend/src/context/FeatureProvider.jsx`)
React Context for app-wide feature access:
- `<FeatureProvider>` - Wrapper component
- `<FeatureGate>` - Conditional rendering component
- `withFeature()` - HOC for feature-gated components

#### 5. **UI Components**
- `FeatureManagement.jsx` - Main admin interface
- `FeatureToggle.jsx` - Enable/disable switch
- `FeatureRollout.jsx` - Gradual rollout control
- `FeatureStats.jsx` - Statistics dashboard
- `FeatureChangelog.jsx` - Change history viewer
- `FeatureConfig.jsx` - Configuration editor

---

## Usage Guide

### For Admins - Managing Features

#### 1. Access Feature Management
1. Log in as Super Admin
2. Navigate to **Settings → Feature Management** in the sidebar
3. View all features with their current status

#### 2. Toggle Features On/Off
```
1. Find the feature in the list
2. Click the toggle switch in the "State" column
3. Feature is instantly enabled/disabled
```

#### 3. Gradual Rollout
```
1. Click "Details" on a feature
2. Adjust the rollout percentage (0-100%)
3. Use preset buttons (0%, 25%, 50%, 75%, 100%)
4. Save changes
```

#### 4. View Feature History
```
1. Click "Details" on a feature
2. View the changelog showing all modifications
3. See who made changes and when
```

#### 5. Filter Features
- **By Category**: Payment, Lending, Investment, Savings, Admin, Security, Communication
- **By Status**: Planning, Development, Testing, Active, Paused, Deprecated
- **By State**: Enabled or Disabled
- **By Platform**: Web, Mobile, Admin Dashboard

---

### For Developers - Using Features in Code

#### 1. Check Single Feature
```jsx
import { useFeature } from '@/hooks/useFeature'

function MyComponent() {
  const { isEnabled, feature, loading } = useFeature('new_payment_system')
  
  if (loading) return <div>Loading...</div>
  
  if (isEnabled) {
    return <NewPaymentSystem />
  }
  
  return <LegacyPaymentSystem />
}
```

#### 2. Check Multiple Features
```jsx
import { useFeatures } from '@/hooks/useFeature'

function Dashboard() {
  const { features, isEnabled } = useFeatures([
    'advanced_analytics',
    'mobile_app_integration',
    'ai_recommendations'
  ])
  
  return (
    <div>
      {isEnabled('advanced_analytics') && <AnalyticsPanel />}
      {isEnabled('mobile_app_integration') && <MobileSync />}
      {isEnabled('ai_recommendations') && <AIPanel />}
    </div>
  )
}
```

#### 3. Use Feature Gate Component
```jsx
import { FeatureGate } from '@/context/FeatureProvider'

function App() {
  return (
    <div>
      <FeatureGate feature="beta_dashboard">
        <BetaDashboard />
      </FeatureGate>
      
      <FeatureGate 
        feature="experimental_feature"
        fallback={<ComingSoon />}
      >
        <ExperimentalFeature />
      </FeatureGate>
    </div>
  )
}
```

#### 4. Use HOC for Feature-Gated Components
```jsx
import { withFeature } from '@/context/FeatureProvider'

const AdvancedReporting = () => {
  return <div>Advanced Reporting Dashboard</div>
}

export default withFeature('advanced_reporting')(AdvancedReporting)
```

#### 5. Access Feature Context
```jsx
import { useFeatureContext } from '@/context/FeatureProvider'

function Settings() {
  const { isFeatureEnabled, getFeature } = useFeatureContext()
  
  const feature = getFeature('dark_mode')
  const isDarkModeEnabled = isFeatureEnabled('dark_mode')
  
  return (
    <div>
      {isDarkModeEnabled && <DarkModeSettings />}
    </div>
  )
}
```

---

## Feature Categories

### 1. **Payment** 
Features related to payment processing and transactions

### 2. **Lending**
Loan management and lending features

### 3. **Investment**
Investment pool and portfolio features

### 4. **Savings**
Savings and wallet features

### 5. **Admin**
Administrative and management features

### 6. **Security**
Security and authentication features

### 7. **Communication**
Messaging and notification features

### 8. **Other**
Miscellaneous features

---

## Feature Status Lifecycle

```
Planning → Development → Testing → Active → Paused → Deprecated
```

- **Planning**: Feature is being planned
- **Development**: Feature is under development
- **Testing**: Feature is in testing phase
- **Active**: Feature is live and enabled
- **Paused**: Feature is temporarily disabled
- **Deprecated**: Feature is no longer supported

---

## Rollout Strategies

### 1. **Instant Rollout (100%)**
Enable feature for all users immediately

### 2. **Gradual Rollout**
- 0% → 25% → 50% → 75% → 100%
- Monitor metrics at each stage
- Rollback if issues detected

### 3. **Canary Deployment**
- Start with 5-10% of users
- Monitor error rates and performance
- Gradually increase percentage

### 4. **Beta Testing**
- Target specific user groups
- Collect feedback
- Refine before full rollout

---

## API Examples

### Get All Features
```bash
curl -X GET http://localhost:5000/api/features \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Features for Web Platform
```bash
curl -X GET http://localhost:5000/api/features/platform/web \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Toggle Feature
```bash
curl -X POST http://localhost:5000/api/features/FEATURE_ID/toggle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Rollout Percentage
```bash
curl -X PATCH http://localhost:5000/api/features/FEATURE_ID/rollout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 50}'
```

### Update Feature Configuration
```bash
curl -X PATCH http://localhost:5000/api/features/FEATURE_ID/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"config": {"maxRetries": 3, "timeout": 5000}}'
```

### Get Feature Changelog
```bash
curl -X GET http://localhost:5000/api/features/FEATURE_ID/changelog \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Feature Statistics
```bash
curl -X GET http://localhost:5000/api/features/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Best Practices

### 1. **Feature Naming**
- Use descriptive, lowercase names with underscores
- Examples: `new_payment_system`, `mobile_app_sync`, `ai_recommendations`

### 2. **Documentation**
- Always add clear descriptions to features
- Document configuration options
- Explain rollout strategy

### 3. **Testing**
- Test features at different rollout percentages
- Monitor error rates and performance
- Have rollback plan ready

### 4. **Monitoring**
- Track feature usage metrics
- Monitor error rates
- Set up alerts for issues

### 5. **Cleanup**
- Remove deprecated features after sufficient time
- Archive old changelog entries
- Keep feature list clean

### 6. **Security**
- Only Super Admins can modify features
- All changes are audited
- IP whitelisting supported

---

## Troubleshooting

### Feature Not Showing
1. Check if feature is enabled in admin panel
2. Verify platform is correct (web/mobile/admin)
3. Check rollout percentage
4. Clear browser cache

### Changes Not Taking Effect
1. Refresh the page
2. Check browser console for errors
3. Verify API token is valid
4. Check network requests in DevTools

### Performance Issues
1. Reduce number of features checked per component
2. Use `useFeatures()` for multiple features
3. Cache feature state in store
4. Implement lazy loading

---

## File Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── featureApi.js
│   ├── store/
│   │   └── featureStore.js
│   ├── hooks/
│   │   └── useFeature.js
│   ├── context/
│   │   └── FeatureProvider.jsx
│   ├── components/
│   │   └── Features/
│   │       ├── FeatureToggle.jsx
│   │       ├── FeatureRollout.jsx
│   │       ├── FeatureStats.jsx
│   │       ├── FeatureChangelog.jsx
│   │       └── FeatureConfig.jsx
│   └── pages/
│       └── FeatureManagement.jsx

backend/
├── models/
│   └── Feature.js
├── routes/
│   └── features.js
└── middleware/
    ├── auth.js
    └── audit.js
```

---

## Integration Checklist

- [x] Backend Feature Model
- [x] Backend Feature Routes
- [x] Frontend Feature API
- [x] Frontend Feature Store
- [x] Custom Hooks
- [x] Feature Provider Context
- [x] Feature Management UI
- [x] Feature Toggle Component
- [x] Feature Rollout Component
- [x] Feature Stats Component
- [x] Feature Changelog Component
- [x] Sidebar Navigation Link
- [ ] Mobile App Integration
- [ ] Feature Analytics Dashboard
- [ ] A/B Testing Framework

---

## Next Steps

1. **Initialize Features**: Create initial features in the database
2. **Test Integration**: Test feature flags in development
3. **Deploy**: Deploy to staging and production
4. **Monitor**: Track feature usage and metrics
5. **Iterate**: Refine based on user feedback

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintained By**: Coopvest Development Team
