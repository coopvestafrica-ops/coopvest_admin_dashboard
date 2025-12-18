import { create } from 'zustand';
import { featureApi, adminRoleApi, adminUserApi } from '../services/featureApi';

export const useFeatureStore = create((set, get) => ({
  // Features state
  features: [],
  featuresLoading: false,
  featuresError: null,
  featuresPagination: {},

  // Roles state
  roles: [],
  rolesLoading: false,
  rolesError: null,
  rolesPagination: {},

  // Admin users state
  adminUsers: [],
  adminUsersLoading: false,
  adminUsersError: null,
  adminUsersPagination: {},

  // Feature actions
  fetchFeatures: async (params = {}) => {
    set({ featuresLoading: true, featuresError: null });
    try {
      const response = await featureApi.getFeatures(params);
      set({
        features: response.data.data.data || response.data.data,
        featuresPagination: {
          current_page: response.data.data.current_page,
          total: response.data.data.total,
          per_page: response.data.data.per_page,
        },
        featuresLoading: false,
      });
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to fetch features',
        featuresLoading: false,
      });
    }
  },

  toggleFeature: async (featureId) => {
    try {
      const response = await featureApi.toggleFeature(featureId);
      // Update the feature in the list
      set((state) => ({
        features: state.features.map((f) =>
          f.id === featureId ? response.data.data : f
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to toggle feature',
      });
      throw error;
    }
  },

  enableFeature: async (featureId) => {
    try {
      const response = await featureApi.enableFeature(featureId);
      set((state) => ({
        features: state.features.map((f) =>
          f.id === featureId ? response.data.data : f
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to enable feature',
      });
      throw error;
    }
  },

  disableFeature: async (featureId) => {
    try {
      const response = await featureApi.disableFeature(featureId);
      set((state) => ({
        features: state.features.map((f) =>
          f.id === featureId ? response.data.data : f
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to disable feature',
      });
      throw error;
    }
  },

  createFeature: async (data) => {
    try {
      const response = await featureApi.createFeature(data);
      set((state) => ({
        features: [response.data.data, ...state.features],
      }));
      return response.data.data;
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to create feature',
      });
      throw error;
    }
  },

  updateFeature: async (featureId, data) => {
    try {
      const response = await featureApi.updateFeature(featureId, data);
      set((state) => ({
        features: state.features.map((f) =>
          f.id === featureId ? response.data.data : f
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to update feature',
      });
      throw error;
    }
  },

  deleteFeature: async (featureId) => {
    try {
      await featureApi.deleteFeature(featureId);
      set((state) => ({
        features: state.features.filter((f) => f.id !== featureId),
      }));
    } catch (error) {
      set({
        featuresError: error.response?.data?.message || 'Failed to delete feature',
      });
      throw error;
    }
  },

  // Role actions
  fetchRoles: async (params = {}) => {
    set({ rolesLoading: true, rolesError: null });
    try {
      const response = await adminRoleApi.getRoles(params);
      set({
        roles: response.data.data.data || response.data.data,
        rolesPagination: {
          current_page: response.data.data.current_page,
          total: response.data.data.total,
          per_page: response.data.data.per_page,
        },
        rolesLoading: false,
      });
    } catch (error) {
      set({
        rolesError: error.response?.data?.message || 'Failed to fetch roles',
        rolesLoading: false,
      });
    }
  },

  createRole: async (data) => {
    try {
      const response = await adminRoleApi.createRole(data);
      set((state) => ({
        roles: [response.data.data, ...state.roles],
      }));
      return response.data.data;
    } catch (error) {
      set({
        rolesError: error.response?.data?.message || 'Failed to create role',
      });
      throw error;
    }
  },

  updateRole: async (roleId, data) => {
    try {
      const response = await adminRoleApi.updateRole(roleId, data);
      set((state) => ({
        roles: state.roles.map((r) =>
          r.id === roleId ? response.data.data : r
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        rolesError: error.response?.data?.message || 'Failed to update role',
      });
      throw error;
    }
  },

  deleteRole: async (roleId) => {
    try {
      await adminRoleApi.deleteRole(roleId);
      set((state) => ({
        roles: state.roles.filter((r) => r.id !== roleId),
      }));
    } catch (error) {
      set({
        rolesError: error.response?.data?.message || 'Failed to delete role',
      });
      throw error;
    }
  },

  // Admin user actions
  fetchAdminUsers: async (params = {}) => {
    set({ adminUsersLoading: true, adminUsersError: null });
    try {
      const response = await adminUserApi.getAdminUsers(params);
      set({
        adminUsers: response.data.data.data || response.data.data,
        adminUsersPagination: {
          current_page: response.data.data.current_page,
          total: response.data.data.total,
          per_page: response.data.data.per_page,
        },
        adminUsersLoading: false,
      });
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to fetch admin users',
        adminUsersLoading: false,
      });
    }
  },

  assignRole: async (data) => {
    try {
      const response = await adminUserApi.assignRole(data);
      set((state) => ({
        adminUsers: [response.data.data, ...state.adminUsers],
      }));
      return response.data.data;
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to assign role',
      });
      throw error;
    }
  },

  updateAdminUser: async (adminUserId, data) => {
    try {
      const response = await adminUserApi.updateAdminUser(adminUserId, data);
      set((state) => ({
        adminUsers: state.adminUsers.map((au) =>
          au.id === adminUserId ? response.data.data : au
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to update admin user',
      });
      throw error;
    }
  },

  removeAdminRole: async (adminUserId) => {
    try {
      await adminUserApi.removeAdminRole(adminUserId);
      set((state) => ({
        adminUsers: state.adminUsers.filter((au) => au.id !== adminUserId),
      }));
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to remove admin role',
      });
      throw error;
    }
  },

  activateAdminUser: async (adminUserId) => {
    try {
      const response = await adminUserApi.activateAdminUser(adminUserId);
      set((state) => ({
        adminUsers: state.adminUsers.map((au) =>
          au.id === adminUserId ? response.data.data : au
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to activate admin user',
      });
      throw error;
    }
  },

  suspendAdminUser: async (adminUserId) => {
    try {
      const response = await adminUserApi.suspendAdminUser(adminUserId);
      set((state) => ({
        adminUsers: state.adminUsers.map((au) =>
          au.id === adminUserId ? response.data.data : au
        ),
      }));
      return response.data.data;
    } catch (error) {
      set({
        adminUsersError: error.response?.data?.message || 'Failed to suspend admin user',
      });
      throw error;
    }
  },

  clearErrors: () => {
    set({
      featuresError: null,
      rolesError: null,
      adminUsersError: null,
    });
  },
}));
