import React, { useEffect, useMemo, useState } from 'react';
import { Save, Bell, Shield, Database, Globe, User, Key, BookOpen, Plus, Edit, Trash2, CheckSquare } from 'lucide-react';
import { toast } from "react-toastify";
import { confirmDialog } from '../common/confirm';

type RoleBreakdown = { role: string; count: number };

type UserMetrics = {
  total_users: number;
  active_students: number;
  administrators: number;
  by_role: RoleBreakdown[];
};

interface DefaultRoles {
  new_students: string;
  teachers: string;
  administrators: string;
}

// Permissions catalog for Roles UI
const PERMISSION_CATALOG: string[] = [
  'users.read', 'users.write', 'users.delete', 'users.invite',
  'roles.read', 'roles.write', 'roles.delete',
  'subjects.read', 'subjects.write', 'subjects.delete',
  'exams.read', 'exams.write', 'exams.delete',
  'results.read', 'results.publish',
  'settings.read', 'settings.update',
];

// Helper API wrapper (no hooks here)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
function api(path: string, init: RequestInit = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

function fmt(n: number | undefined) { try { return typeof n === 'number' ? n.toLocaleString() : '0'; } catch { return String(n ?? 0); } }

// ---------------- Component ----------------

const Settings: React.FC = () => {
  // NAV/SECTION
  const [activeSection, setActiveSection] = useState<'general'|'notifications'|'security'|'backup'|'users'|'subjects'>('users');

  // SETTINGS (general/notifications/security/backup)
  const [settings, setSettings] = useState({
    general: { siteName: '', siteDescription: '', adminEmail: '', timezone: 'Asia/Kolkata', language: 'English', allowRegistration: true },
    notifications: { emailNotifications: true, smsNotifications: false, examReminders: true, resultNotifications: true },
    security: { twoFactorAuth: false, sessionTimeout: 30, passwordPolicy: 'strong' },
    backup: { autoBackup: true, backupFrequency: 'daily', retentionPeriod: 90 },
  });

  // METRICS + DEFAULT ROLES (NEW)
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [defRoles, setDefRoles] = useState<DefaultRoles>({ new_students: 'student', teachers: 'instructor', administrators: 'admin' });
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // SUBJECTS
  const [subjects, setSubjects] = useState<{ IIT: any[]; NEET: any[] }>({ IIT: [], NEET: [] });
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '', examType: 'IIT', isActive: true });

  // ROLES
  type RoleRow = { role_id: number; name: string; description?: string | null; permissions: string[]; is_system: boolean; created_at?: string; updated_at?: string; };
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [newRole, setNewRole] = useState<{ name: string; description: string; permissions: string[] }>({ name: '', description: '', permissions: [] });
  const [permFilter, setPermFilter] = useState('');

  // ---------- EFFECTS ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg(null);
      try {
        const [sRes, subjRes, rolesRes, mRes, rRes] = await Promise.all([
          api('/api/settings'),
          api('/api/subjects'),
          api('/api/roles'),
          api('/api/settings/metrics'),
          api('/api/settings/default-roles'),
        ]);

        // settings
        if (sRes.ok) {
          const data = await sRes.json();
          const settingsObj = (data || []).reduce((acc: any, { setting_key, setting_value }: any) => {
            acc[setting_key] = setting_value; return acc;
          }, {} as any);
          mounted && setSettings((prev) => ({ ...prev, ...settingsObj }));
        }

        // subjects
        if (subjRes.ok) {
          const data = await subjRes.json();
          const grouped = (data || []).reduce((acc: any, subject: any) => {
            if (!acc[subject.exam_type]) acc[subject.exam_type] = [];
            acc[subject.exam_type].push({
              id: subject.subject_id,
              name: subject.name,
              code: subject.code,
              description: subject.description,
              examType: subject.exam_type,
              isActive: subject.is_active,
            });
            return acc;
          }, { IIT: [], NEET: [] } as any);
          mounted && setSubjects(grouped);
        }

        // roles
        if (rolesRes.ok) {
          const r = await rolesRes.json();
          mounted && setRoles(r || []);
        }

        // metrics
        if (mRes.ok) {
          const m = await mRes.json();
          mounted && setMetrics(m);
        } else {
          throw new Error(`metrics ${mRes.status}`);
        }

        // default roles
        if (rRes.ok) {
          const dr = await rRes.json();
          mounted && setDefRoles(dr);
        } else {
          throw new Error(`default-roles ${rRes.status}`);
        }
      } catch (e: any) {
        mounted && setErrMsg(e?.message || 'Failed to load');
        console.error(e);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ---------- HELPERS ----------
  const handleSettingChange = (section: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({ ...prev, [section]: { ...(prev as any)[section], [key]: value } }));
  };

  const handleSave = async () => {
    try {
      for (const [key, value] of Object.entries(settings)) {
        const res = await api(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ setting_value: value }) });
        if (!res.ok) throw new Error(`Failed to update ${key}`);
      }
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    }
  };

  // Subjects CRUD
  const fetchSubjects = async () => {
    const res = await api('/api/subjects');
    if (!res.ok) return;
    const data = await res.json();
    const grouped = (data || []).reduce((acc: any, subject: any) => {
      if (!acc[subject.exam_type]) acc[subject.exam_type] = [];
      acc[subject.exam_type].push({
        id: subject.subject_id, name: subject.name, code: subject.code, description: subject.description, examType: subject.exam_type, isActive: subject.is_active,
      });
      return acc;
    }, { IIT: [], NEET: [] } as any);
    setSubjects(grouped);
  };

  const handleAddSubject = async () => {
    if (!newSubject.name || !newSubject.code) return toast.error('Please fill in all required fields');
    const res = await api('/api/subjects', { method: 'POST', body: JSON.stringify({
      name: newSubject.name, code: newSubject.code, description: newSubject.description, exam_type: newSubject.examType, is_active: newSubject.isActive,
    }) });
    if (!res.ok) return toast.error('Failed to add subject');
    setShowAddSubjectModal(false); setEditingSubject(null); setNewSubject({ name: '', code: '', description: '', examType: 'IIT', isActive: true });
    fetchSubjects();
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    const res = await api(`/api/subjects/${editingSubject.id}`, { method: 'PUT', body: JSON.stringify({
      name: newSubject.name, code: newSubject.code, description: newSubject.description, exam_type: newSubject.examType, is_active: newSubject.isActive,
    }) });
    if (!res.ok) return toast.error('Failed to update subject');
    setShowAddSubjectModal(false); setEditingSubject(null); setNewSubject({ name: '', code: '', description: '', examType: 'IIT', isActive: true });
    fetchSubjects();
  };

  const handleDeleteSubject = async (id: number) => {
    const ok = await confirmDialog("Delete this subject?", { danger: true, confirmText: "Delete" });
    if (!ok) return;
    const res = await api(`/api/subjects/${id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Failed to delete subject');
    fetchSubjects();
  };

  const toggleSubjectStatus = async (id: number, current: boolean) => {
    const res = await api(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: !current }) });
    if (!res.ok) return toast.error('Failed to toggle');
    fetchSubjects();
  };

  // Roles CRUD
  const fetchRoles = async () => {
    const res = await api('/api/roles');
    if (!res.ok) return;
    const data = await res.json();
    setRoles(data || []);
  };

  const openAddRole = () => { setEditingRole(null); setNewRole({ name: '', description: '', permissions: [] }); setPermFilter(''); setShowRoleModal(true); };
  const openEditRole = (r: RoleRow) => { setEditingRole(r); setNewRole({ name: r.name, description: r.description || '', permissions: r.permissions || [] }); setPermFilter(''); setShowRoleModal(true); };
  const handleRoleCheckbox = (perm: string) => setNewRole(prev => ({ ...prev, permissions: prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] }));

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return toast.error('Role name is required');
    const res = await api('/api/roles', { method: 'POST', body: JSON.stringify({ name: newRole.name.trim(), description: newRole.description || null, permissions: newRole.permissions }) });
    if (!res.ok) return toast.error('Failed to create role');
    setShowRoleModal(false); fetchRoles();
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    if (!newRole.name.trim()) return toast.error('Role name is required');
    const res = await api(`/api/roles/${editingRole.role_id}`, { method: 'PUT', body: JSON.stringify({ name: newRole.name.trim(), description: newRole.description || null, permissions: newRole.permissions }) });
    if (!res.ok) return toast.error('Failed to update role');
    setEditingRole(null); setShowRoleModal(false); fetchRoles();
  };

  const handleDeleteRole = async (r: RoleRow) => {
    if (r.is_system) return;
    const ok = await confirmDialog(`Delete role "${r.name}"?`, { danger: true, confirmText: "Delete" });
    if (!ok) return;
    const res = await api(`/api/roles/${r.role_id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Failed to delete role');
    fetchRoles();
  };

  const filteredCatalog = useMemo(() => PERMISSION_CATALOG.filter(p => p.toLowerCase().includes(permFilter.trim().toLowerCase())), [permFilter]);

  // Sections list
  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup & Data', icon: Database },
    { id: 'users', label: 'User Management', icon: User },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      {errMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nav */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-4">
            <nav className="space-y-2">
              {sections.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${activeSection === s.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <s.icon className="w-5 h-5" />
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border p-6">
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                    <input type="text" value={settings.general.siteName} onChange={(e) => handleSettingChange('general','siteName', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                    <input type="email" value={settings.general.adminEmail} onChange={(e) => handleSettingChange('general','adminEmail', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select value={settings.general.timezone} onChange={(e) => handleSettingChange('general','timezone', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select value={settings.general.language} onChange={(e) => handleSettingChange('general','language', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                  <textarea value={settings.general.siteDescription} onChange={(e) => handleSettingChange('general','siteDescription', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={settings.general.allowRegistration} onChange={(e) => handleSettingChange('general','allowRegistration', e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm">Allow new student registrations</span>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                <div className="space-y-4">
                  {['emailNotifications','smsNotifications','examReminders','resultNotifications'].map((k) => (
                    <label key={k} className="flex items-center gap-3">
                      <input type="checkbox" checked={(settings as any).notifications[k]} onChange={(e) => handleSettingChange('notifications', k, e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">{k}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.security.twoFactorAuth} onChange={(e) => handleSettingChange('security','twoFactorAuth', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Enable Two-Factor Authentication</span>
                </label>
                <div>
                  <label className="block text-sm mb-1">Session Timeout (minutes)</label>
                  <input type="number" value={settings.security.sessionTimeout} onChange={(e) => handleSettingChange('security','sessionTimeout', parseInt(e.target.value || '0', 10))} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Password Policy</label>
                  <select value={settings.security.passwordPolicy} onChange={(e) => handleSettingChange('security','passwordPolicy', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="weak">Weak</option>
                    <option value="medium">Medium</option>
                    <option value="strong">Strong</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Backup & Data Settings</h2>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.backup.autoBackup} onChange={(e) => handleSettingChange('backup','autoBackup', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Automatic Backups</span>
                </label>
                <div>
                  <label className="block text-sm mb-1">Backup Frequency</label>
                  <select value={settings.backup.backupFrequency} onChange={(e) => handleSettingChange('backup','backupFrequency', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Data Retention Period (days)</label>
                  <input type="number" value={settings.backup.retentionPeriod} onChange={(e) => handleSettingChange('backup','retentionPeriod', parseInt(e.target.value || '0', 10))} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
            )}

            {activeSection === 'users' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>

                {/* Default roles + Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Default User Roles</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><span className="text-sm">New Students</span><span className="rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">{defRoles.new_students}</span></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Teachers</span><span className="rounded bg-green-50 px-2 py-1 text-sm font-medium text-green-700">{defRoles.teachers}</span></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Administrators</span><span className="rounded bg-purple-50 px-2 py-1 text-sm font-medium text-purple-700">{defRoles.administrators}</span></div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-gray-900 mb-3">User Statistics</h3>
                    {!metrics ? (
                      <div className="text-sm text-gray-500">{loading ? 'Loading…' : 'No data'}</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded border p-3"><div className="text-2xl font-bold text-blue-600">{fmt(metrics.total_users)}</div><div className="text-xs text-gray-500">Total Users</div></div>
                        <div className="rounded border p-3"><div className="text-2xl font-bold text-green-600">{fmt(metrics.active_students)}</div><div className="text-xs text-gray-500">Active Students</div></div>
                        <div className="rounded border p-3"><div className="text-2xl font-bold text-purple-600">{fmt(metrics.administrators)}</div><div className="text-xs text-gray-500">Administrators</div></div>
                      </div>
                    )}
                    {metrics?.by_role?.length ? (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-gray-800">By Role</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Users</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {[...metrics.by_role].sort((a,b)=>a.role.localeCompare(b.role)).map(r => (
                                <tr key={r.role}><td className="px-4 py-2 text-sm text-gray-700">{r.role}</td><td className="px-4 py-2 text-sm font-medium text-gray-900">{fmt(r.count)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Roles & Permissions */}
                <div className="flex items-center justify-between mt-2">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Key className="w-5 h-5" /> Roles & Permissions</h3>
                  <button onClick={openAddRole} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Add Role</button>
                </div>
                <div className="rounded-lg border p-4 bg-gray-50">
                  {roles.length === 0 ? (
                    <div className="text-sm text-gray-500">No roles yet. Click “Add Role”.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roles.map(r => (
                        <div key={r.role_id} className="bg-white rounded-lg border p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2"><h4 className="font-semibold text-gray-900">{r.name}</h4>{r.is_system && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">system</span>}</div>
                              {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditRole(r)} disabled={r.is_system} className={`p-1 rounded ${r.is_system ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-yellow-600'}`} title={r.is_system ? 'System role cannot be edited' : 'Edit'}><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRole(r)} disabled={r.is_system} className={`p-1 rounded ${r.is_system ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`} title={r.is_system ? 'System role cannot be deleted' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-700">
                            <div className="flex items-center gap-1 mb-1"><CheckSquare className="w-3.5 h-3.5" /><span className="font-medium">Permissions</span></div>
                            {r.permissions?.length ? (
                              <div className="flex flex-wrap gap-1">{r.permissions.map(p => (<span key={p} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{p}</span>))}</div>
                            ) : (<span className="text-gray-500">None</span>)}
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
                  <button onClick={() => setShowAddSubjectModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Add Subject</button>
                </div>

                {/* IIT */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>IIT-JEE Subjects ({subjects.IIT.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.IIT.map((subject: any) => (
                      <div key={subject.id} className="bg-white rounded-lg border p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subject.name}</h4>
                            <p className="text-sm text-gray-500">Code: {subject.code}</p>
                            {subject.description && <p className="text-sm text-gray-600 mt-1">{subject.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingSubject(subject); setNewSubject(subject); setShowAddSubjectModal(true); }} className="p-1 text-gray-400 hover:text-yellow-600"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteSubject(subject.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{subject.isActive ? 'Active' : 'Inactive'}</span>
                          <button onClick={() => toggleSubjectStatus(subject.id, subject.isActive)} className="text-sm text-blue-600 hover:text-blue-800">{subject.isActive ? 'Deactivate' : 'Activate'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEET */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>NEET Subjects ({subjects.NEET.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.NEET.map((subject: any) => (
                      <div key={subject.id} className="bg-white rounded-lg border p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subject.name}</h4>
                            <p className="text-sm text-gray-500">Code: {subject.code}</p>
                            {subject.description && <p className="text-sm text-gray-600 mt-1">{subject.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingSubject(subject); setNewSubject(subject); setShowAddSubjectModal(true); }} className="p-1 text-gray-400 hover:text-yellow-600"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteSubject(subject.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{subject.isActive ? 'Active' : 'Inactive'}</span>
                          <button onClick={() => toggleSubjectStatus(subject.id, subject.isActive)} className="text-sm text-blue-600 hover:text-blue-800">{subject.isActive ? 'Deactivate' : 'Activate'}</button>
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

      {/* Add/Edit Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label><input type="text" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label><input type="text" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-md" maxLength={5} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Description</label><textarea value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label><select value={newSubject.examType} onChange={(e) => setNewSubject({ ...newSubject, examType: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="IIT">IIT-JEE</option><option value="NEET">NEET</option></select></div>
              <div><label className="flex items-center gap-3"><input type="checkbox" checked={newSubject.isActive} onChange={(e) => setNewSubject({ ...newSubject, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Active Subject</span></label></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddSubjectModal(false); setEditingSubject(null); setNewSubject({ name: '', code: '', description: '', examType: 'IIT', isActive: true }); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={editingSubject ? handleUpdateSubject : handleAddSubject} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingSubject ? 'Update Subject' : 'Add Subject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingRole ? 'Edit Role' : 'Add Role'}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
                  <input type="text" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Instructor" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md" placeholder="What can this role do?" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-gray-700">Permissions</label><input type="text" value={permFilter} onChange={(e) => setPermFilter(e.target.value)} placeholder="Filter..." className="px-2 py-1 text-sm border rounded-md" /></div>
                <div className="border rounded-md max-h-64 overflow-auto p-2 space-y-1">
                  {filteredCatalog.length ? (
                    filteredCatalog.map(perm => {
                      const checked = newRole.permissions.includes(perm);
                      return (
                        <label key={perm} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => handleRoleCheckbox(perm)} className="w-4 h-4" />
                          <span className="font-mono">{perm}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 px-1">No permissions match.</div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => setNewRole(r => ({ ...r, permissions: PERMISSION_CATALOG.slice() }))} className="px-2 py-1 bg-gray-100 rounded">Select All</button>
                  <button onClick={() => setNewRole(r => ({ ...r, permissions: [] }))} className="px-2 py-1 bg-gray-100 rounded">Clear</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowRoleModal(false); setEditingRole(null); setNewRole({ name: '', description: '', permissions: [] }); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={editingRole ? handleUpdateRole : handleCreateRole} className="px-4 py-2 bg-blue-600 text-white rounded-lg" disabled={!!editingRole && editingRole.is_system} title={editingRole?.is_system ? 'System role cannot be modified' : ''}>{editingRole ? 'Update Role' : 'Create Role'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
