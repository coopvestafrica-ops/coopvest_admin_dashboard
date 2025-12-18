# Feature Management & Role Assignment System

## Overview

The Coopvest Admin Dashboard includes a comprehensive feature management and role assignment system that allows Super Admins to:

1. **Control Features** across web app, mobile app, and admin dashboard
2. **Manage Rollout** with gradual deployment percentages
3. **Assign Roles** to admins with granular permissions
4. **Track Changes** with complete audit trails

---

## 🎯 Feature Management

### What is Feature Management?

Feature Management allows Super Admins to enable/disable features across all platforms without code deployment. Features can be:

- **Toggled on/off** instantly
- **Rolled out gradually** to specific percentages of users
- **Targeted** to specific user groups or regions
- **Monitored** with usage metrics
- **Tracked** with complete changelog

### Feature Categories

- **Payment**: Payment processing and wallet features
- **Lending**: Loan application and management
- **Investment**: Investment pool features
- **Savings**: Savings and contribution features
- **Security**: Authentication and security features
- **Admin**: Admin dashboard features
- **Communication**: Notifications and messaging
- **Other**: Miscellaneous features

### Feature Platforms

- **Web**: Web application features
- **Mobile**: Flutter mobile app features
- **Admin Dashboard**: Admin dashboard features

### Feature Statuses

- **Planning**: Feature is being planned
- **Development**: Feature is in development
- **Testing**: Feature is in testing phase
- **Active**: Feature is live and available
- **Paused**: Feature is temporarily disabled
- **Deprecated**: Feature is no longer supported

### API Endpoints

#### Get All Features
```bash
GET /api/features
Query Parameters:
  - category: Filter by category
  - platform: Filter by platform
  - status: Filter by status
  - enabled: Filter by enabled/disabled
  - page: Page number (default: 1)
  - limit: Items per page (default: 20)
```

#### Get Features for Specific Platform
```bash
GET /api/features/platform/:platform
Response: Array of enabled features for that platform
```

#### Create Feature (Super Admin Only)
```bash
POST /api/features
Body: {
  "name": "feature_name",
  "displayName": "Feature Display Name",
  "description": "Feature description",
  "category": "payment",
  "platforms": ["web", "mobile"],
  "config": { /* feature-specific config */ }
}
```

#### Toggle Feature (Super Admin Only)
```bash
POST /api/features/:id/toggle
Response: Feature with toggled enabled status
```

#### Update Rollout Percentage (Super Admin Only)
```bash
PATCH /api/features/:id/rollout
Body: {
  "rolloutPercentage": 50
}
```

#### Update Feature Configuration (Super Admin Only)
```bash
PATCH /api/features/:id/config
Body: {
  "config": { /* new config */ }
}
```

#### Update Feature Status (Super Admin Only)
```bash
PATCH /api/features/:id/status
Body: {
  "status": "active"
}
```

#### Get Feature Changelog
```bash
GET /api/features/:id/changelog
Response: Array of all changes made to the feature
```

---

## 👥 Role Assignment System

### What is Role Assignment?

Role Assignment allows Super Admins to:

1. **Create and manage roles** with specific permissions
2. **Assign admins** to roles
3. **Control permissions** at the role level
4. **Track role changes** with audit logs

### Built-in Roles

#### 1. Super Admin
- **Description**: Full system control and governance authority
- **Permissions**: All permissions
- **Max Admins**: Unlimited
- **Capabilities**:
  - Create/modify/delete admins
  - Assign roles and permissions
  - Manage features
  - View all audit logs
  - Override any action

#### 2. Finance Admin
- **Description**: Manage contributions, loans, and financial operations
- **Permissions**: read, write, approve
- **Max Admins**: 5
- **Capabilities**:
  - View financial data
  - Approve loans and contributions
  - Generate financial reports

#### 3. Operations Admin
- **Description**: Manage day-to-day operations and member services
- **Permissions**: read, write
- **Max Admins**: 3
- **Capabilities**:
  - View member data
  - Update member information
  - Process member requests

#### 4. Compliance Admin
- **Description**: Monitor compliance and regulatory requirements
- **Permissions**: read, view_audit_logs
- **Max Admins**: 2
- **Capabilities**:
  - View compliance data
  - Access audit logs
  - Generate compliance reports

#### 5. Member Support Admin
- **Description**: Handle member inquiries and support
- **Permissions**: read, write
- **Max Admins**: 10
- **Capabilities**:
  - View member information
  - Respond to member inquiries
  - Update member records

#### 6. Investment Admin
- **Description**: Manage investment pools and allocations
- **Permissions**: read, write, approve
- **Max Admins**: 3
- **Capabilities**:
  - Create investment pools
  - Approve member participation
  - Track investment performance

#### 7. Technology Admin
- **Description**: System administration and technical operations
- **Permissions**: read, write, manage_features
- **Max Admins**: 2
- **Capabilities**:
  - Manage system features
  - Configure integrations
  - Monitor system health

### Permissions

| Permission | Description |
|-----------|-------------|
| `read` | View data and reports |
| `write` | Create and update records |
| `approve` | Approve applications and requests |
| `manage_admins` | Create and manage admin accounts |
| `manage_members` | Manage member accounts |
| `manage_loans` | Manage loan applications |
| `manage_investments` | Manage investment pools |
| `manage_compliance` | Manage compliance settings |
| `manage_features` | Enable/disable features |
| `view_analytics` | View analytics and reports |
| `export_data` | Export data to CSV/PDF |
| `manage_roles` | Create and modify roles |
| `manage_permissions` | Assign permissions |
| `view_audit_logs` | View audit logs |
| `manage_communications` | Send communications |
| `manage_documents` | Manage documents |

### API Endpoints

#### Get All Roles
```bash
GET /api/roles
Response: Array of all roles with details
```

#### Get Role by ID
```bash
GET /api/roles/:id
Response: Role details with assigned admins
```

#### Get Role by Name
```bash
GET /api/roles/name/:name
Response: Role details
```

#### Create Role (Super Admin Only)
```bash
POST /api/roles
Body: {
  "name": "custom_role",
  "displayName": "Custom Role",
  "description": "Role description",
  "permissions": ["read", "write"],
  "scope": "global"
}
```

#### Update Role Permissions (Super Admin Only)
```bash
PATCH /api/roles/:id/permissions
Body: {
  "permissions": ["read", "write", "approve"]
}
```

#### Assign Feature Access to Role (Super Admin Only)
```bash
POST /api/roles/:id/features/:featureId
Body: {
  "canEnable": true,
  "canDisable": true,
  "canConfigure": true
}
```

#### Remove Feature Access from Role (Super Admin Only)
```bash
DELETE /api/roles/:id/features/:featureId
```

#### Assign Admin to Role (Super Admin Only)
```bash
POST /api/roles/:id/assign-admin/:adminId
Response: Updated role and admin
```

#### Remove Admin from Role (Super Admin Only)
```bash
POST /api/roles/:id/remove-admin/:adminId
Response: Updated role and admin
```

#### Get Admins with Specific Role
```bash
GET /api/roles/:id/admins
Response: Role details and list of assigned admins
```

---

## 🎮 Frontend UI

### Feature Management Page

**Location**: `/feature-management`

**Features**:
- View all features with filters
- Filter by platform (Web, Mobile, Admin Dashboard)
- Filter by category (Payment, Lending, Investment, etc.)
- Toggle features on/off
- Adjust rollout percentage with slider
- View feature status and priority
- Configure feature settings
- View feature changelog

### Role Assignment Page

**Location**: `/role-assignment`

**Features**:
- View all roles with details
- See assigned admins per role
- Assign new admins to roles
- Remove admins from roles
- View role permissions
- Edit role settings
- Track role changes

---

## 📱 Mobile App Integration

### Flutter Implementation

The Flutter mobile app can fetch enabled features from the API:

```dart
// Get features for mobile platform
final response = await http.get(
  Uri.parse('https://api.coopvest.com/api/features/platform/mobile'),
  headers: {'Authorization': 'Bearer $token'},
);

if (response.statusCode == 200) {
  final features = jsonDecode(response.body);
  
  // Check if feature is enabled
  final loanFeatureEnabled = features.any((f) => f['name'] == 'loan_application');
  
  if (loanFeatureEnabled) {
    // Show loan feature UI
  }
}
```

### Feature Flags in Flutter

```dart
class FeatureFlags {
  static final Map<String, bool> _flags = {};
  
  static Future<void> loadFeatures() async {
    final response = await http.get(
      Uri.parse('https://api.coopvest.com/api/features/platform/mobile'),
    );
    
    if (response.statusCode == 200) {
      final features = jsonDecode(response.body);
      for (var feature in features) {
        _flags[feature['name']] = feature['enabled'];
      }
    }
  }
  
  static bool isEnabled(String featureName) {
    return _flags[featureName] ?? false;
  }
}

// Usage in widgets
if (FeatureFlags.isEnabled('loan_application')) {
  return LoanApplicationWidget();
}
```

---

## 🌐 Web App Integration

### React Implementation

```javascript
// Fetch features for web platform
const fetchWebFeatures = async () => {
  const response = await fetch(
    'https://api.coopvest.com/api/features/platform/web',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const features = await response.json();
  return features;
};

// Check if feature is enabled
const isFeatureEnabled = (features, featureName) => {
  return features.some(f => f.name === featureName && f.enabled);
};

// Usage in components
function App() {
  const [features, setFeatures] = useState([]);
  
  useEffect(() => {
    fetchWebFeatures().then(setFeatures);
  }, []);
  
  return (
    <>
      {isFeatureEnabled(features, 'investment_pools') && (
        <InvestmentPoolsSection />
      )}
    </>
  );
}
```

---

## 🔄 Workflow Examples

### Example 1: Rolling Out a New Feature

1. **Create Feature** (Status: Development)
   - Create feature in admin dashboard
   - Set rollout percentage to 0%
   - Configure feature settings

2. **Test Feature** (Status: Testing)
   - Update status to "Testing"
   - Enable for 10% of users
   - Monitor usage and errors

3. **Gradual Rollout** (Status: Active)
   - Increase rollout to 25%
   - Monitor performance
   - Increase to 50%
   - Increase to 100%

4. **Full Deployment**
   - Feature is now available to all users
   - Monitor metrics
   - Keep in audit trail

### Example 2: Assigning Admin Roles

1. **Create New Admin**
   - Create admin account in Access Management
   - Status: Pending Approval

2. **Assign Role**
   - Go to Role Assignment
   - Select Finance Admin role
   - Click "Assign Admin"
   - Select the new admin
   - Confirm assignment

3. **Verify Permissions**
   - Admin now has Finance permissions
   - Can approve loans and contributions
   - Changes logged in audit trail

4. **Monitor Activity**
   - View admin actions in Audit Logs
   - Track role changes
   - Monitor permission usage

---

## 🔒 Security Considerations

1. **Super Admin Only**: Only Super Admins can manage features and roles
2. **Audit Trail**: All changes are logged with timestamp and admin info
3. **Permission Inheritance**: Admins inherit all permissions from their role
4. **Role Limits**: Maximum admins per role can be enforced
5. **Feature Dependencies**: Features can depend on other features
6. **Rollback Capability**: All changes can be reversed via audit trail

---

## 📊 Monitoring & Analytics

### Feature Metrics

- **Toggle Count**: Number of times feature was toggled
- **Last Toggled**: When feature was last changed
- **Enabled Count**: Number of users with feature enabled
- **Disabled Count**: Number of users with feature disabled
- **Rollout Percentage**: Current rollout percentage

### Role Metrics

- **Admin Count**: Number of admins with this role
- **Max Admins**: Maximum admins allowed
- **Permissions**: List of permissions
- **Last Modified**: When role was last changed

---

## 🚀 Best Practices

1. **Test Before Rollout**: Always test features in development/testing before full rollout
2. **Gradual Deployment**: Use rollout percentages for gradual deployment
3. **Monitor Metrics**: Watch feature usage and error rates
4. **Document Changes**: Add notes when making significant changes
5. **Audit Trail**: Review audit logs regularly
6. **Role Segregation**: Keep roles focused on specific responsibilities
7. **Permission Principle**: Follow principle of least privilege
8. **Regular Reviews**: Review roles and permissions regularly

---

## 📞 Support

For questions or issues with feature management and role assignment:

1. Check audit logs for recent changes
2. Review feature changelog
3. Verify admin permissions
4. Contact system administrator

---

**Last Updated**: December 2024
**Version**: 1.0.0
