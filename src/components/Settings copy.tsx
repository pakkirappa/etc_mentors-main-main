// Updated Settings.tsx with Roles & Permissions management added under "User Management"

import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, Database, Mail, Globe, User, Key, BookOpen, Plus, Edit, Trash2, CheckSquare } from 'lucide-react';

const PERMISSION_CATALOG: string[] = [
  // --- User/account ---
  'users.read',
  'users.write',
  'users.delete',
  'users.invite',
  // --- Roles/permissions ---
  'roles.read',
  'roles.write',
  'roles.delete',
  // --- Subjects/Exams/Results ---
  'subjects.read',
  'subjects.write',
  'subjects.delete',
  'exams.read',
  'exams.write',
  'exams.delete',
  'results.read',
  'results.publish',
  // --- Settings ---
  'settings.read',
  'settings.update',
];

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      siteName: '',
      siteDescription: '',
      adminEmail: '',
      timezone: '',
      language: '',
      allowRegistration: true,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      examReminders: true,
      resultNotifications: true,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionPeriod: 90,
    },
  });

  // ---------- Subjects state (unchanged) ----------
  const [subjects, setSubjects] = useState({
    IIT: [],
    NEET: []
  });

  // ---------- Roles & Permissions state ----------
  type RoleRow = {
    role_id: number;
    name: string;
    description?: string | null;
    permissions: string[];
    is_system: boolean;
    created_at?: string;
    updated_at?: string;
  };

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [newRole, setNewRole] = useState<{ name: string; description: string; permissions: string[] }>({
    name: '',
    description: '',
    permissions: [],
  });
  const [permFilter, setPermFilter] = useState('');

  // ---------- Effects ----------
  useEffect(() => {
    fetchSettings();
    fetchSubjects();
    fetchRoles();
  }, []);

  // ---------- Helpers ----------
  const api = (path: string, init: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found. Please log in.');
    return fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
  };

  // ---------- Settings API ----------
  const fetchSettings = async () => {
    try {
      const res = await api(`/api/settings`);
      if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
      const data = await res.json();
      const settingsObj = data.reduce((acc, { setting_key, setting_value }) => {
        acc[setting_key] = setting_value;
        return acc;
      }, {});
      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      for (const [key, value] of Object.entries(settings)) {
        const res = await api(`${import.meta.env.VITE_API_BASE_URL}/api/settings/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ setting_value: value })
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to update ${key}: ${res.status} - ${errorText}`);
          throw new Error(`Failed to update ${key}`);
        }
      }
      alert('Settings saved successfully!');
      fetchSettings(); // refresh
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings. Check console for details.');
    }
  };

  // ---------- Subjects API (unchanged) ----------
  const fetchSubjects = async () => {
    try {
      const res = await api(`/api/subjects`);
      if (!res.ok) throw new Error(`Failed to fetch subjects: ${res.statusText}`);
      const data = await res.json();
      const grouped = data.reduce((acc, subject) => {
        if (!acc[subject.exam_type]) acc[subject.exam_type] = [];
        acc[subject.exam_type].push({
          id: subject.subject_id,
          name: subject.name,
          code: subject.code,
          description: subject.description,
          examType: subject.exam_type,
          isActive: subject.is_active
        });
        return acc;
      }, { IIT: [], NEET: [] });
      setSubjects(grouped);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    description: '',
    examType: 'IIT',
    isActive: true
  });

  const handleAddSubject = async () => {
    if (!newSubject.name || !newSubject.code) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const res = await api(`/api/subjects`, {
        method: 'POST',
        body: JSON.stringify({
          name: newSubject.name,
          code: newSubject.code,
          description: newSubject.description,
          exam_type: newSubject.examType,
          is_active: newSubject.isActive
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to add subject: ${res.status} - ${errorText}`);
        throw new Error('Failed to add subject');
      }
      fetchSubjects();
      setNewSubject({ name: '', code: '', description: '', examType: 'IIT', isActive: true });
      setShowAddSubjectModal(false);
    } catch (err) {
      console.error('Failed to add subject:', err);
      alert('Failed to add subject. Check console for details.');
    }
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setNewSubject(subject);
    setShowAddSubjectModal(true);
  };

  const handleUpdateSubject = async () => {
    if (!newSubject.name || !newSubject.code) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const res = await api(`/api/subjects/${editingSubject.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: newSubject.name,
          code: newSubject.code,
          description: newSubject.description,
          exam_type: newSubject.examType,
          is_active: newSubject.isActive
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to update subject: ${res.status} - ${errorText}`);
        throw new Error('Failed to update subject');
      }
      fetchSubjects();
      setEditingSubject(null);
      setNewSubject({ name: '', code: '', description: '', examType: 'IIT', isActive: true });
      setShowAddSubjectModal(false);
    } catch (err) {
      console.error('Failed to update subject:', err);
      alert('Failed to update subject. Check console for details.');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      const res = await api(`/api/subjects/${subjectId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to delete subject: ${res.status} - ${errorText}`);
        throw new Error('Failed to delete subject');
      }
      fetchSubjects();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      alert('Failed to delete subject. Check console for details.');
    }
  };

  const toggleSubjectStatus = async (subjectId, currentStatus) => {
    try {
      const res = await api(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to toggle subject status: ${res.status} - ${errorText}`);
        throw new Error('Failed to toggle subject status');
      }
      fetchSubjects();
    } catch (err) {
      console.error('Failed to toggle subject status:', err);
      alert('Failed to toggle subject status. Check console for details.');
    }
  };

  // ---------- Roles & Permissions API ----------
  const fetchRoles = async () => {
    try {
      const res = await api(`/api/roles`);
      if (!res.ok) throw new Error(`Failed to fetch roles: ${res.statusText}`);
      const data = await res.json();
      // Backend already normalizes JSON to array
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const openAddRole = () => {
    setEditingRole(null);
    setNewRole({ name: '', description: '', permissions: [] });
    setPermFilter('');
    setShowRoleModal(true);
  };

  const openEditRole = (r: RoleRow) => {
    setEditingRole(r);
    setNewRole({ name: r.name, description: r.description || '', permissions: r.permissions || [] });
    setPermFilter('');
    setShowRoleModal(true);
  };

  const handleRoleCheckbox = (perm: string) => {
    setNewRole((prev) => {
      const has = prev.permissions.includes(perm);
      return { ...prev, permissions: has ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] };
    });
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return alert('Role name is required');
    try {
      const res = await api(`/api/roles`, {
        method: 'POST',
        body: JSON.stringify({
          name: newRole.name.trim(),
          description: newRole.description || null,
          permissions: newRole.permissions
        })
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('Create role failed:', t);
        throw new Error('Failed to create role');
      }
      await fetchRoles();
      setShowRoleModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create role. Check console for details.');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    if (!newRole.name.trim()) return alert('Role name is required');
    try {
      const res = await api(`/api/roles/${editingRole.role_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: newRole.name.trim(),
          description: newRole.description || null,
          permissions: newRole.permissions
        })
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('Update role failed:', t);
        throw new Error('Failed to update role');
      }
      await fetchRoles();
      setEditingRole(null);
      setShowRoleModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to update role. Check console for details.');
    }
  };

  const handleDeleteRole = async (r: RoleRow) => {
    if (r.is_system) return; // just in case
    if (!confirm(`Delete role "${r.name}"?`)) return;
    try {
      const res = await api(`/api/roles/${r.role_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const t = await res.text();
        console.error('Delete role failed:', t);
        throw new Error('Failed to delete role');
      }
      await fetchRoles();
    } catch (e) {
      console.error(e);
      alert('Failed to delete role. Check console for details.');
    }
  };

  const filteredCatalog = PERMISSION_CATALOG.filter(p =>
    p.toLowerCase().includes(permFilter.trim().toLowerCase())
  );

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup & Data', icon: Database },
    { id: 'users', label: 'User Management', icon: User },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                    <input
                      type="text"
                      value={settings.general.siteName}
                      onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                    <input
                      type="email"
                      value={settings.general.adminEmail}
                      onChange={(e) => handleSettingChange('general', 'adminEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.general.language}
                      onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                  <textarea
                    value={settings.general.siteDescription}
                    onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.general.allowRegistration}
                      onChange={(e) => handleSettingChange('general', 'allowRegistration', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow new student registrations</span>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Send email notifications for important events</p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifications.smsNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Send SMS notifications for urgent updates</p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifications.examReminders}
                        onChange={(e) => handleSettingChange('notifications', 'examReminders', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Exam Reminders</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Automatically remind students about upcoming exams</p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifications.resultNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'resultNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Result Notifications</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Notify students when results are published</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Require 2FA for all admin logins</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Policy</label>
                    <select
                      value={settings.security.passwordPolicy}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="weak">Weak</option>
                      <option value="medium">Medium</option>
                      <option value="strong">Strong</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Backup & Data Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.backup.autoBackup}
                        onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Automatic Backups</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-7">Enable automatic database backups</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                    <select
                      value={settings.backup.backupFrequency}
                      onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention Period (days)</label>
                    <input
                      type="number"
                      value={settings.backup.retentionPeriod}
                      onChange={(e) => handleSettingChange('backup', 'retentionPeriod', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'users' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">User Management Settings</h2>
                
                {/* Existing blocks */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Default User Roles</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">New Students</span>
                        <span className="text-sm font-medium text-blue-600">Student</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Teachers</span>
                        <span className="text-sm font-medium text-green-600">Instructor</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Administrators</span>
                        <span className="text-sm font-medium text-purple-600">Admin</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">User Statistics</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">2,847</div>
                        <div className="text-sm text-gray-500">Total Users</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">2,734</div>
                        <div className="text-sm text-gray-500">Active Students</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">13</div>
                        <div className="text-sm text-gray-500">Administrators</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------- Roles & Permissions Management -------- */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="w-5 h-5 text-gray-700" />
                    Roles & Permissions
                  </h3>
                  <button
                    onClick={openAddRole}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Role</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  {roles.length === 0 ? (
                    <div className="text-sm text-gray-500">No roles yet. Click “Add Role” to create one.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roles.map((r) => (
                        <div key={r.role_id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{r.name}</h4>
                                {r.is_system && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">system</span>
                                )}
                              </div>
                              {r.description && (
                                <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditRole(r)}
                                disabled={r.is_system}
                                className={`p-1 rounded ${r.is_system ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-yellow-600'}`}
                                title={r.is_system ? 'System role cannot be edited' : 'Edit'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(r)}
                                disabled={r.is_system}
                                className={`p-1 rounded ${r.is_system ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                title={r.is_system ? 'System role cannot be deleted' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-gray-700">
                            <div className="flex items-center gap-1 mb-1">
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span className="font-medium">Permissions</span>
                            </div>
                            {r.permissions?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {r.permissions.map((p) => (
                                  <span key={p} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'subjects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Subject Management</h2>
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {/* IIT Subjects */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    IIT-JEE Subjects ({subjects.IIT.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.IIT.map((subject: any) => (
                      <div key={subject.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subject.name}</h4>
                            <p className="text-sm text-gray-500">Code: {subject.code}</p>
                            {subject.description && (
                              <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditSubject(subject)}
                              className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {subject.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => toggleSubjectStatus(subject.id, subject.isActive)}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {subject.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEET Subjects */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    NEET Subjects ({subjects.NEET.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.NEET.map((subject: any) => (
                      <div key={subject.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subject.name}</h4>
                            <p className="text-sm text-gray-500">Code: {subject.code}</p>
                            {subject.description && (
                              <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditSubject(subject)}
                              className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {subject.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => toggleSubjectStatus(subject.id, subject.isActive)}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {subject.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Add/Edit Subject Modal (unchanged) ---------- */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Physics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label>
                <input
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({...newSubject, code: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., PHY"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                <select
                  value={newSubject.examType}
                  onChange={(e) => setNewSubject({...newSubject, examType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="IIT">IIT-JEE</option>
                  <option value="NEET">NEET</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newSubject.isActive}
                    onChange={(e) => setNewSubject({...newSubject, isActive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Subject</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddSubjectModal(false);
                  setEditingSubject(null);
                  setNewSubject({
                    name: '',
                    code: '',
                    description: '',
                    examType: 'IIT',
                    isActive: true
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingSubject ? handleUpdateSubject : handleAddSubject}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                {editingSubject ? 'Update Subject' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Add/Edit Role Modal ---------- */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRole ? 'Edit Role' : 'Add Role'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Instructor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What can this role do?"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Permissions</label>
                  <input
                    type="text"
                    value={permFilter}
                    onChange={(e) => setPermFilter(e.target.value)}
                    placeholder="Filter..."
                    className="px-2 py-1 text-sm border rounded-md"
                  />
                </div>

                <div className="border rounded-md max-h-64 overflow-auto p-2 space-y-1">
                  {filteredCatalog.length ? (
                    filteredCatalog.map((perm) => {
                      const checked = newRole.permissions.includes(perm);
                      return (
                        <label key={perm} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleRoleCheckbox(perm)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="font-mono">{perm}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 px-1">No permissions match.</div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setNewRole(r => ({ ...r, permissions: PERMISSION_CATALOG.slice() }))}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setNewRole(r => ({ ...r, permissions: [] }))}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  setNewRole({ name: '', description: '', permissions: [] });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                disabled={!!editingRole && editingRole.is_system}
                title={editingRole?.is_system ? 'System role cannot be modified' : ''}
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
