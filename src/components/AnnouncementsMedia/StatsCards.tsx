import React from 'react';
import { FileText, AlertCircle, CheckCircle, Eye } from 'lucide-react';

export default function StatsCards({ announcements }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard label="Total Items" value={announcements.length} icon={<FileText className="w-6 h-6 text-blue-600" />} bg="bg-blue-100" />
      <StatCard label="High Priority" value={announcements.filter(a => a.priority === 'high').length} icon={<AlertCircle className="w-6 h-6 text-red-600" />} bg="bg-red-100" />
      <StatCard label="Active" value={announcements.filter(a => a.status === 'active').length} icon={<CheckCircle className="w-6 h-6 text-green-600" />} bg="bg-green-100" />
      <StatCard label="Total Views" value={announcements.reduce((sum, a) => sum + a.views, 0)} icon={<Eye className="w-6 h-6 text-purple-600" />} bg="bg-purple-100" />
    </div>
  );
}

function StatCard({ label, value, icon, bg }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 ${bg} rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}
