# Data Sheets Implementation Guide

This document describes the comprehensive spreadsheet-like data management system implemented for Coopvest Admin Dashboard.

## Overview

The Data Sheets module provides a web-based spreadsheet interface for staff to work with structured data in a controlled, permissioned environment with full audit trails.

## Architecture

### Backend Components

#### Models

1. **SheetDefinition** (`backend/models/SheetDefinition.js`)
   - Defines the structure of each spreadsheet
   - Contains column definitions with validation rules
   - Manages workflow settings and UI preferences

2. **SheetRow** (`backend/models/SheetRow.js`)
   - Stores dynamic data rows
   - Implements versioning for conflict detection
   - Tracks status (draft, pending_review, approved, rejected, returned, locked)
   - Supports row assignment to staff

3. **SheetAssignment** (`backend/models/SheetAssignment.js`)
   - Manages staff-to-sheet assignments
   - Stores granular permissions per assignment
   - Supports expiration dates for temporary access

4. **RowLock** (`backend/models/RowLock.js`)
   - Implements optimistic locking for concurrency control
   - Prevents overwrites from multiple users
   - Auto-expires locks after timeout

5. **SheetAuditLog** (`backend/models/SheetAuditLog.js`)
   - Immutable audit log for all changes
   - Tracks: user, timestamp, action, changes, old/new values
   - Supports filtering and export

#### Middleware

1. **sheetAccess** (`backend/middleware/sheetAccess.js`)
   - Checks if user has access to a sheet
   - Loads user assignments on login
   - Enforces sheet-level permissions

2. **rowLevelSecurity** (`backend/middleware/rowLevelSecurity.js`)
   - Enforces row-level security
   - Filters rows based on assignment scope
   - Prevents access to unassigned rows

3. **permissionValidator** (`backend/middleware/permissionValidator.js`)
   - Validates granular permissions
   - Checks column-level access
   - Validates approval workflow permissions

#### Routes

- `sheets.js` - Sheet definition CRUD
- `sheetData.js` - Data operations (CRUD, lock, assign)
- `sheetApprovals.js` - Approval workflow endpoints
- `sheetAssignments.js` - Staff assignment management
- `sheetAdmin.js` - Admin configuration endpoints
- `sheetAudit.js` - Audit log viewing

### Frontend Components

#### Pages

- **DataSheets** (`frontend/src/pages/DataSheets.jsx`)
  - Main entry point for spreadsheet module
  - Tab-based sheet navigation
  - Modal for creating new rows

#### Components

- **DataGrid** (`frontend/src/components/DataSheets/DataGrid.jsx`)
  - Spreadsheet-like table with inline editing
  - Sorting and filtering
  - Row selection for bulk operations
  - Status badges
  - Lock indicators

#### Store

- **sheetStore** (`frontend/src/store/sheetStore.js`)
  - Zustand store for sheet state
  - Manages rows, columns, pagination
  - Handles CRUD operations

## API Endpoints

### Authentication

```
POST /api/auth/login
GET /api/auth/verify
```

The verify endpoint now returns `allowedSheets` with user permissions.

### Sheets

```
GET /api/sheets              # Get user's sheets
GET /api/sheets/:sheetId     # Get sheet definition
GET /api/sheets/:sheetId/data # Get sheet data
POST /api/sheets/:sheetId/data # Create row
PUT /api/sheets/:sheetId/data/:rowId # Update row
DELETE /api/sheets/:sheetId/data/:rowId # Delete row
```

### Approvals

```
POST /api/sheets/:sheetId/submit/:rowId
POST /api/sheets/:sheetId/approve/:rowId
POST /api/sheets/:sheetId/reject/:rowId
POST /api/sheets/:sheetId/return/:rowId
```

### Assignments

```
GET /api/sheet-assignments/my
POST /api/sheet-assignments
PUT /api/sheet-assignments/:id
DELETE /api/sheet-assignments/:id
```

### Audit

```
GET /api/sheet-audit
GET /api/sheet-audit/sheet/:sheetId
GET /api/sheet-audit/row/:rowId
GET /api/sheet-audit/stats
```

## Workflow

### Row Status Flow

```
Draft → Pending Review → Approved
                  ↓
            Rejected/Returned → Draft
```

### Permission Levels

| Permission | Description |
|------------|-------------|
| canView | Read-only access |
| canEdit | Modify fields |
| canCreate | Add new rows |
| canDelete | Delete rows |
| canSubmit | Submit for review |
| canApprove | Approve/reject rows |
| canAssignRows | Assign rows to staff |
| canViewAudit | View audit logs |

### Row-Level Security

Users can only see rows based on their scope:
- **all**: View all rows in assigned sheets
- **assigned_rows**: Only rows assigned to user
- **own_rows**: Only rows created by user

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure Environment

Create `.env` file in backend:

```env
MONGODB_URI=mongodb://localhost:27017/coopvest_admin
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
PORT=5000
```

### 3. Create Initial Sheet

As super admin, create a sheet definition:

```javascript
POST /api/sheet-admin/sheets
{
  "sheetId": "loan_applications",
  "name": "Loan Applications",
  "category": "loans",
  "columns": [
    {
      "key": "applicant_name",
      "label": "Applicant Name",
      "type": "text",
      "required": true
    },
    {
      "key": "amount",
      "label": "Loan Amount",
      "type": "currency",
      "required": true,
      "validation": { "min": 1000 }
    },
    {
      "key": "status",
      "label": "Status",
      "type": "enum",
      "validation": { "enumValues": ["pending", "approved", "rejected"] }
    }
  ],
  "workflow": {
    "enableApproval": true,
    "defaultStatus": "draft"
  }
}
```

### 4. Assign Staff to Sheet

```javascript
POST /api/sheet-assignments
{
  "adminId": "admin_user_id",
  "sheetId": "loan_applications",
  "permissions": {
    "canView": true,
    "canEdit": true,
    "canCreate": true,
    "canSubmit": true
  },
  "scope": "assigned_rows"
}
```

## Security Features

1. **Row-Level Security**: Backend enforces row access, not frontend
2. **Immutable Audit Logs**: All changes are logged and cannot be modified
3. **Optimistic Locking**: Prevents concurrent edit conflicts
4. **Permission Validation**: Server-side permission checks on every request
5. **No Direct DB Access**: All operations through authenticated APIs

## Usage

### For Staff

1. Login to dashboard
2. Navigate to "Data Sheets" from sidebar
3. Select assigned sheet from tabs
4. View, edit, and submit rows
5. See status badges for approval state

### For Reviewers

1. View pending items in "Pending Review" status
2. Approve or reject with notes
3. Return rows for revision if needed

### For Admins

1. Create new sheet definitions
2. Configure columns and validation
3. Assign staff to sheets
4. View audit logs
5. Bulk reassign rows
6. Lock/unlock records

## File Structure

```
backend/
├── models/
│   ├── SheetDefinition.js
│   ├── SheetRow.js
│   ├── SheetAssignment.js
│   ├── RowLock.js
│   └── SheetAuditLog.js
├── middleware/
│   ├── sheetAccess.js
│   ├── rowLevelSecurity.js
│   └── permissionValidator.js
├── routes/
│   ├── sheets.js
│   ├── sheetData.js
│   ├── sheetApprovals.js
│   ├── sheetAssignments.js
│   ├── sheetAdmin.js
│   └── sheetAudit.js
└── server.js

frontend/
├── src/
│   ├── api/
│   │   └── sheetApi.js
│   ├── store/
│   │   └── sheetStore.js
│   ├── pages/
│   │   └── DataSheets.jsx
│   └── components/
│       └── DataSheets/
│           └── DataGrid.jsx
```

## API Response Examples

### Login Verification

```json
{
  "valid": true,
  "admin": {
    "id": "...",
    "name": "John Doe",
    "email": "john@coopvest.com",
    "role": "loan_officer",
    "permissions": [...]
  },
  "allowedSheets": [
    {
      "sheetId": "loan_applications",
      "name": "Loan Applications",
      "category": "loans",
      "permissions": {
        "canView": true,
        "canEdit": true,
        "canCreate": true,
        "canSubmit": true,
        "canApprove": false
      }
    }
  ]
}
```

### Get Sheet Data

```json
{
  "rows": [
    {
      "_id": "...",
      "sheetId": "loan_applications",
      "status": "draft",
      "data": {
        "applicant_name": "Jane Smith",
        "amount": 50000,
        "status": "pending"
      },
      "canEdit": true,
      "isLocked": false
    }
  ],
  "columns": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request
