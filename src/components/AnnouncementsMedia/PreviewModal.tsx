import React from 'react';
import { Star, ExternalLink, XCircle } from 'lucide-react';

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

const isDirectVideo = (url = '') => /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
const isYouTube = (url = '') => /youtube\.com|youtu\.be/i.test(url);
const isVimeo = (url = '') => /vimeo\.com/i.test(url);

const toYouTubeEmbed = (url = '') => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};
const toVimeoEmbed = (url = '') => {
  const match = url.match(/vimeo\.com\/(\d+)/i);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
};

export default function PreviewModal({ item, onClose }) {
  if (!item) return null;

  const renderMedia = () => {
    if (item.type === 'video' && item.videoUrl) {
      if (isDirectVideo(item.videoUrl)) {
        return (
          <video
            controls
            preload="metadata"
            className="w-full max-h-[60vh] rounded-lg bg-black"
            poster={item.mediaUrl || undefined}
            src={item.videoUrl}
          />
        );
      }
      if (isYouTube(item.videoUrl)) {
        return (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-lg"
              src={toYouTubeEmbed(item.videoUrl)}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      if (isVimeo(item.videoUrl)) {
        return (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-lg"
              src={toVimeoEmbed(item.videoUrl)}
              title="Video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
    }

    if (item.mediaUrl) {
      return <img src={item.mediaUrl} alt={item.title} className="w-full h-64 object-cover rounded-lg" />;
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Preview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {renderMedia()}

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(item.priority)}`}>
              <Star className="w-4 h-4" /> {item.priority} priority
            </span>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold">{item.title}</h1>
          <p className="text-gray-700">{item.content}</p>

          {item.type === 'video' && item.videoUrl && !isDirectVideo(item.videoUrl) && !isYouTube(item.videoUrl) && !isVimeo(item.videoUrl) && (
            <div className="flex items-center gap-2 text-blue-600">
              <ExternalLink className="w-4 h-4" />
              <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Open Video
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm text-gray-500">Target Audience</span>
              <p className="font-medium">{item.targetAudience}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Views</span>
              <p className="font-medium">{item.views}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created</span>
              <p className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}</p>
            </div>
            {item.expiresAt && (
              <div>
                <span className="text-sm text-gray-500">Expires</span>
                <p className="font-medium">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("en-GB") : "—"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
