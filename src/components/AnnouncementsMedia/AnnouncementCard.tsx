import React from 'react';
import { Edit, Trash2, Eye, Image, Video, FileText, Play, Star, Calendar, Clock } from 'lucide-react';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'expired': return 'bg-gray-100 text-gray-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'poster': return <Image className="w-5 h-5" />;
    case 'video': return <Video className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

export default function AnnouncementCard({ item, onEdit, onDelete, onPreview }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {item.priority === 'high' && <div className="bg-red-500 h-1 w-full"></div>}
      {(item.type === 'poster' || item.type === 'video') && item.mediaUrl && (
        <div className="relative">
          <img src={item.mediaUrl} alt={item.title} className="w-full h-48 object-cover" />
          {item.type === 'video' && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white bg-opacity-90 rounded-full p-3">
                <Play className="w-8 h-8 text-gray-800" />
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
              <Star className="w-3 h-3" /> {item.priority}
            </span>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getTypeIcon(item.type)}
            <span className="text-sm font-medium text-gray-600 capitalize">{item.type}</span>
          </div>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.content}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" /> <span>Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}</span>
          </div>
          {item.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" /> <span>Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("en-GB") : "—"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">{item.targetAudience}</span>
          <div className="flex gap-2">
            <button onClick={() => onPreview(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
