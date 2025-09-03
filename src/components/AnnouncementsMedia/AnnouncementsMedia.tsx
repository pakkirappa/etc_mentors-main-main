import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import CreateEditModal from './CreateEditModal';
import PreviewModal from './PreviewModal';
import StatsCards from './StatsCards';
import TabsFilterBar from './TabsFilterBar';
import { toast } from "react-toastify";
import { confirmDialog } from '../../common/confirm';

export default function AnnouncementsMedia() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnnouncements(data.map(item => ({
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
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

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

    const url = isEditing
      ? `${import.meta.env.VITE_API_BASE_URL}/api/announcements/${editingId}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/announcements`;

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      await fetchAnnouncements();
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      resetForm();
    } catch {
      toast.error('Failed to save announcement');
    }
  };

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

  const handleEdit = (item) => {
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
    setIsEditing(true);
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ok = await confirmDialog("Delete this announcement?", { danger: true, confirmText: "Delete" });
    if (!ok) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = announcements.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    return matchesSearch && matchesTab && matchesPriority;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Announcements & Media</h1>
          <p className="text-gray-600">Manage posters, videos, and announcements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create Announcement
        </button>
      </div>

      <StatsCards announcements={announcements} />
      <TabsFilterBar {...{ activeTab, setActiveTab, searchTerm, setSearchTerm, filterPriority, setFilterPriority }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(item => (
          <AnnouncementCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onPreview={setPreviewItem} />
        ))}
      </div>

      {filtered.length === 0 && <p className="text-center text-gray-500 py-12">No announcements found</p>}

      <CreateEditModal
        isOpen={showModal}
        isEditing={isEditing}
        announcement={newAnnouncement}
        setAnnouncement={setNewAnnouncement}
        onClose={() => { setShowModal(false); setIsEditing(false); resetForm(); }}
        onSubmit={handleSubmit}
      />

      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
