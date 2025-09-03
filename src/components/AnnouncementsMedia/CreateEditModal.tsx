import React, { useState } from 'react';
import { XCircle, AlertCircle } from 'lucide-react';

export default function CreateEditModal({
  isOpen,
  isEditing,
  announcement,
  setAnnouncement,
  onClose,
  onSubmit
}) {
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    let tempErrors = {};

    if (!announcement.title?.trim()) tempErrors.title = 'Title is required';
    if (!announcement.content?.trim()) tempErrors.content = 'Content is required';

    if (!['announcement', 'poster', 'video'].includes(announcement.type)) {
      tempErrors.type = 'Invalid type';
    }

    if (!['high', 'medium', 'low'].includes(announcement.priority)) {
      tempErrors.priority = 'Invalid priority';
    }

    if (!['All Students', 'IIT Students', 'NEET Students'].includes(announcement.targetAudience)) {
      tempErrors.targetAudience = 'Invalid audience';
    }

    if (!['active', 'scheduled', 'expired', 'draft'].includes(announcement.status)) {
      tempErrors.status = 'Invalid status';
    }

    // If it's a poster, we expect an image URL to display
    if (announcement.type === 'poster' && !announcement.mediaUrl?.trim()) {
      tempErrors.mediaUrl = 'Please provide an image URL';
    }

    // If it's a video, we expect a video URL (direct .mp4/webm/ogg or YouTube/Vimeo)
    if (announcement.type === 'video' && !announcement.videoUrl?.trim()) {
      tempErrors.videoUrl = 'Please provide a video URL';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  const renderError = (field) =>
    errors[field] ? (
      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" /> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Announcement' : 'Create New Announcement'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {renderError('title')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={announcement.type}
                onChange={(e) => setAnnouncement({ ...announcement, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="announcement">Text Announcement</option>
                <option value="poster">Poster/Image</option>
                <option value="video">Video</option>
              </select>
              {renderError('type')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={announcement.content}
              onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {renderError('content')}
          </div>

          {(announcement.type === 'poster' || announcement.type === 'video') && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {announcement.type === 'poster' ? 'Image URL' : 'Thumbnail Image URL (optional)'}
              </label>
              <input
                type="url"
                placeholder={
                  announcement.type === 'poster'
                    ? 'https://cdn.example.com/path/to/image.jpg'
                    : 'https://cdn.example.com/path/to/thumbnail.jpg'
                }
                value={announcement.mediaUrl}
                onChange={(e) => setAnnouncement({ ...announcement, mediaUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {announcement.type === 'poster' && renderError('mediaUrl')}
            </div>
          )}

          {announcement.type === 'video' && (
            <div>
              <label className="block text-sm font-medium mb-2">Video URL</label>
              <input
                type="url"
                placeholder="https://cdn.example.com/video.mp4 or YouTube/Vimeo URL"
                value={announcement.videoUrl}
                onChange={(e) => setAnnouncement({ ...announcement, videoUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {renderError('videoUrl')}
            </div>
          )}
          <input
          type="file"
          accept={announcement.type === "poster" ? "image/*" : "video/*"}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements/upload`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            const data = await res.json();

            if (announcement.type === "poster") {
              setAnnouncement({ ...announcement, mediaUrl: data.url });
            } else if (announcement.type === "video") {
              setAnnouncement({ ...announcement, videoUrl: data.url });
            }
          }}
        />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={announcement.priority}
                onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {renderError('priority')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Audience</label>
              <select
                value={announcement.targetAudience}
                onChange={(e) => setAnnouncement({ ...announcement, targetAudience: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="All Students">All Students</option>
                <option value="IIT Students">IIT Students</option>
                <option value="NEET Students">NEET Students</option>
              </select>
              {renderError('targetAudience')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expires On</label>
              <input
                type="date"
                value={announcement.expiresAt}
                onChange={(e) => setAnnouncement({ ...announcement, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={announcement.status}
              onChange={(e) => setAnnouncement({ ...announcement, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="draft">Draft</option>
            </select>
            {renderError('status')}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
