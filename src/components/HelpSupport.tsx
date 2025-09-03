import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, FileText, Video, Mail, Phone, BookOpen } from 'lucide-react';
import { toast } from "react-toastify";
const HelpSupport = () => {
  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [guides, setGuides] = useState([]);
  const [videos, setVideos] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    name: '',
    email: '',
    issueType: '',
    description: ''
  });

  useEffect(() => {
    fetchFaqs();
    fetchGuides();
    fetchVideos();
  }, []);

  const fetchFaqs = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/help/faqs`, {
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
        throw new Error(`Failed to fetch FAQs: ${res.statusText}`);
      }
      const data = await res.json();
      setFaqs(data.map(item => ({
        id: item.faq_id,
        question: item.question,
        answer: item.answer
      })));
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    }
  };

  const fetchGuides = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/help/guides`, {
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
        throw new Error(`Failed to fetch guides: ${res.statusText}`);
      }
      const data = await res.json();
      setGuides(data.map((item, index) => ({
        id: item.guide_id,
        title: item.title,
        description: item.content.substring(0, 100) + '...', // Use content as description, truncate
        icon: [BookOpen, FileText, FileText, FileText][index % 4], // Cycle through icons
        duration: '10 min read' // Placeholder, as not in backend
      })));
    } catch (err) {
      console.error('Failed to fetch guides:', err);
    }
  };

  const fetchVideos = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/help/videos`, {
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
        throw new Error(`Failed to fetch videos: ${res.statusText}`);
      }
      const data = await res.json();
      setVideos(data.map((item, index) => ({
        id: item.video_id,
        title: item.title,
        description: `Video tutorial on ${item.title}`, // Placeholder description
        duration: '10:00', // Placeholder
        thumbnail: item.thumbnail_url || 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg' // Use thumbnail_url or placeholder
      })));
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    }
  };

  const handleTicketChange = (e) => {
    const { name, value } = e.target;
    setTicketForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      return;
    }

    const body = {
      issue_type: ticketForm.issueType,
      description: `From: ${ticketForm.name} (${ticketForm.email})\n\n${ticketForm.description}`
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/help/tickets`, {
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
        throw new Error('Failed to submit ticket');
      }
      toast.success('Ticket submitted successfully!');
      setTicketForm({
        name: '',
        email: '',
        issueType: '',
        description: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit ticket');
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGuides = guides.filter(guide => 
    guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
        <div className="flex items-center space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for help articles, guides, or FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'faq', label: 'FAQ' },
          { id: 'guides', label: 'Guides' },
          { id: 'videos', label: 'Video Tutorials' },
          { id: 'contact', label: 'Contact' }
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

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
            {filteredFaqs.length === 0 && <p className="text-center text-gray-600">No FAQs found</p>}
          </div>
        )}

        {activeTab === 'guides' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuides.map((guide) => (
                <div key={guide.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <guide.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{guide.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{guide.description}</p>
                      <span className="text-xs text-gray-500 mt-2 block">{guide.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredGuides.length === 0 && <p className="text-center text-gray-600">No guides found</p>}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900">{video.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">{video.duration}</span>
                      <Video className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredVideos.length === 0 && <p className="text-center text-gray-600">No videos found</p>}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Contact Support</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Email Support</h3>
                    <p className="text-sm text-gray-600">support@examhub.com</p>
                    <p className="text-xs text-gray-500">Response within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <Phone className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Phone Support</h3>
                    <p className="text-sm text-gray-600">+91 1800-123-4567</p>
                    <p className="text-xs text-gray-500">Mon-Fri, 9 AM - 6 PM IST</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Send us a message</h3>
                <form onSubmit={handleSubmitTicket} className="space-y-3">
                  <input
                    type="text"
                    name="name"
                    value={ticketForm.name}
                    onChange={handleTicketChange}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={ticketForm.email}
                    onChange={handleTicketChange}
                    placeholder="Your Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <select 
                    name="issueType"
                    value={ticketForm.issueType}
                    onChange={handleTicketChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Issue Type</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account Problem">Account Problem</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                  </select>
                  <textarea
                    name="description"
                    value={ticketForm.description}
                    onChange={handleTicketChange}
                    placeholder="Describe your issue..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpSupport;