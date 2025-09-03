import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Image, Video, FileText, Star, Calendar, Clock, Search, Filter, Upload, Download, Play, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from "react-toastify";

const AnnouncementsMedia = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    type: 'announcement',
    content: '',
    mediaUrl: '',
    videoUrl: '',
    priority: 'medium',
    targetAudience: 'All Students',
    expiresAt: '',
    status: 'active'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error(`Failed to fetch announcements: ${res.statusText}`);
      }

      const data = await res.json();
      const mapped = data.map(item => ({
        id: item.announcement_id,
        title: item.title,
        type: item.announcement_type,
        content: item.content,
        mediaUrl: item.media_url,
        videoUrl: item.video_url,
        priority: item.priority,
        status: item.status,
        createdAt: item.created_at,
        expiresAt: item.expires_at,
        views: item.views,
        targetAudience: item.target_audience
      }));
      setAnnouncements(mapped);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'poster':
        return <Image className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'announcement':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const filteredAnnouncements = announcements
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || item.type === activeTab;
      const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
      return matchesSearch && matchesTab && matchesPriority;
    })
    .sort((a, b) => {
      // Sort by priority (high first), then by creation date
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const resetForm = () => {
    setNewAnnouncement({
      title: '',
      type: 'announcement',
      content: '',
      mediaUrl: '',
      videoUrl: '',
      priority: 'medium',
      targetAudience: 'All Students',
      expiresAt: '',
      status: 'active'
    });
  };

  const handleCreateAnnouncement = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    const body = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      announcement_type: newAnnouncement.type,
      media_url: newAnnouncement.mediaUrl || null,
      video_url: newAnnouncement.videoUrl || null,
      priority: newAnnouncement.priority,
      target_audience: newAnnouncement.targetAudience,
      status: newAnnouncement.status,
      expires_at: newAnnouncement.expiresAt || null,
      created_at: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to create announcement');
      }
      await fetchAnnouncements();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create announcement');
    }
  };

  const handleUpdateAnnouncement = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    const body = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      announcement_type: newAnnouncement.type,
      media_url: newAnnouncement.mediaUrl || null,
      video_url: newAnnouncement.videoUrl || null,
      priority: newAnnouncement.priority,
      target_audience: newAnnouncement.targetAudience,
      status: newAnnouncement.status,
      expires_at: newAnnouncement.expiresAt || null
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements/${editingItem?.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to update announcement');
      }
      await fetchAnnouncements();
      setShowCreateModal(false);
      setEditingItem(null);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update announcement');
    }
  };

  const handleSubmit = () => {
    if (editingItem) {
      handleUpdateAnnouncement();
    } else {
      handleCreateAnnouncement();
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Invalid or expired token. Redirecting to login...');
          // Optionally: localStorage.removeItem('token'); navigate('/login');
        }
        throw new Error('Failed to delete announcement');
      }
      await fetchAnnouncements();
      toast.success('Announcement deleted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete announcement');
    }
  };

  const handleEditAnnouncement = (item) => {
    setNewAnnouncement({
      title: item.title,
      type: item.type,
      content: item.content,
      mediaUrl: item.mediaUrl || '',
      videoUrl: item.videoUrl || '',
      priority: item.priority,
      targetAudience: item.targetAudience,
      expiresAt: item.expiresAt || '',
      status: item.status
    });
    setEditingItem(item);
    setShowCreateModal(true);
  };

  const handleFileUpload = (event, field) => {
    const file = event.target.files[0];
    if (file) {
      // In a real application, you would upload the file to a server
      // For demo purposes, we'll use a placeholder URL
      const fakeUrl = `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/placeholder.jpg`;
      setNewAnnouncement({...newAnnouncement, [field]: fakeUrl});
    }
  };

  const AnnouncementCard = ({ item }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Priority Indicator */}
      {item.priority === 'high' && (
        <div className="bg-red-500 h-1 w-full"></div>
      )}
      
      {/* Media Preview */}
      {(item.type === 'poster' || item.type === 'video') && item.mediaUrl && (
        <div className="relative">
          <img 
            src={item.mediaUrl} 
            alt={item.title}
            className="w-full h-48 object-cover"
          />
          {item.type === 'video' && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white bg-opacity-90 rounded-full p-3">
                <Play className="w-8 h-8 text-gray-800" />
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
              <Star className="w-3 h-3" />
              {item.priority}
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
            <Calendar className="w-4 h-4" />
            <span>Created: {item.createdAt}</span>
          </div>
          {item.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Expires: {item.expiresAt}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{item.views} views</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">{item.targetAudience}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedItem(item)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleEditAnnouncement(item)}
              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleDeleteAnnouncement(item.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const CreateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">{editingItem ? 'Edit Announcement' : 'Create New Announcement'}</h2>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingItem(null);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter announcement title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={newAnnouncement.type}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="announcement">Text Announcement</option>
                <option value="poster">Poster/Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter announcement content..."
            />
          </div>

          {(newAnnouncement.type === 'poster' || newAnnouncement.type === 'video') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newAnnouncement.type === 'poster' ? 'Upload Image' : 'Upload Thumbnail'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'mediaUrl')}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">Click to upload image</span>
                </label>
              </div>
              {newAnnouncement.mediaUrl && (
                <p className="mt-2 text-sm text-gray-500">Uploaded: {newAnnouncement.mediaUrl}</p>
              )}
            </div>
          )}

          {newAnnouncement.type === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
              <input
                type="url"
                value={newAnnouncement.videoUrl}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, videoUrl: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video URL (YouTube, Vimeo, etc.)"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={newAnnouncement.priority}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
              <select
                value={newAnnouncement.targetAudience}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, targetAudience: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All Students">All Students</option>
                <option value="IIT Students">IIT Students</option>
                <option value="NEET Students">NEET Students</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires On</label>
              <input
                type="date"
                value={newAnnouncement.expiresAt}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={newAnnouncement.status}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Priority Guidelines:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>High Priority:</strong> Important notices, urgent announcements</li>
              <li>• <strong>Medium Priority:</strong> Regular updates, event notifications</li>
              <li>• <strong>Low Priority:</strong> General information, tips and resources</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingItem(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              {editingItem ? 'Update Announcement' : 'Create Announcement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const PreviewModal = () => selectedItem && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedItem.mediaUrl && (
            <div className="mb-6">
              <img 
                src={selectedItem.mediaUrl} 
                alt={selectedItem.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedItem.priority)}`}>
                <Star className="w-4 h-4" />
                {selectedItem.priority} priority
              </span>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status)}`}>
                {selectedItem.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{selectedItem.title}</h1>
            <p className="text-gray-700 leading-relaxed">{selectedItem.content}</p>

            {selectedItem.videoUrl && (
              <div className="flex items-center gap-2 text-blue-600">
                <ExternalLink className="w-4 h-4" />
                <a href={selectedItem.videoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Watch Video
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <span className="text-sm text-gray-500">Target Audience</span>
                <p className="font-medium">{selectedItem.targetAudience}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Views</span>
                <p className="font-medium">{selectedItem.views}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-medium">{selectedItem.createdAt}</p>
              </div>
              {selectedItem.expiresAt && (
                <div>
                  <span className="text-sm text-gray-500">Expires</span>
                  <p className="font-medium">{selectedItem.expiresAt}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements & Media</h1>
          <p className="text-gray-600 mt-1">Manage posters, videos, and announcements for students</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">{announcements.filter(a => a.priority === 'high').length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{announcements.filter(a => a.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{announcements.reduce((sum, a) => sum + a.views, 0)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'announcement', label: 'Announcements' },
          { id: 'poster', label: 'Posters' },
          { id: 'video', label: 'Videos' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAnnouncements.map(item => (
          <AnnouncementCard key={item.id} item={item} />
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && <CreateModal />}
      {selectedItem && <PreviewModal />}
    </div>
  );
};

export default AnnouncementsMedia;