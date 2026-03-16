'use client';

import { useState } from 'react';
import { Search, Send, Paperclip, Image as ImageIcon, Phone, Video, MoreVertical, CheckCheck } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  initials: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
  messages: Message[];
}

export function Messaging() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [messageInput, setMessageInput] = useState('');

  const conversations: Conversation[] = [
    {
      id: 1, name: 'PowerFuel Energy', role: 'Brand Partner', initials: 'PF',
      lastMessage: 'Looking forward to seeing the content!', lastMessageTime: '2m ago',
      unreadCount: 2, online: true,
      messages: [
        { id: 1, text: "Hi Marcus! We'd love to discuss the campaign details.", sender: 'other', timestamp: '10:30 AM', read: true },
        { id: 2, text: "Hey! I'm excited to work with you guys. What do you have in mind?", sender: 'me', timestamp: '10:35 AM', read: true },
        { id: 3, text: "We'd like 3 Instagram posts featuring our new energy drink. Can you share your content calendar?", sender: 'other', timestamp: '10:40 AM', read: true },
        { id: 4, text: "Sure! I'll send it over by end of day. I have some great ideas for the basketball court shots.", sender: 'me', timestamp: '10:42 AM', read: true },
        { id: 5, text: 'Looking forward to seeing the content!', sender: 'other', timestamp: '10:45 AM', read: false },
      ],
    },
    {
      id: 2, name: 'Campus Threads', role: 'Apparel Brand', initials: 'CT',
      lastMessage: 'The photoshoot is scheduled for next week', lastMessageTime: '1h ago',
      unreadCount: 0, online: false,
      messages: [
        { id: 1, text: 'Hi Marcus, thanks for accepting our partnership!', sender: 'other', timestamp: 'Yesterday', read: true },
        { id: 2, text: 'Happy to be on board! When do we start?', sender: 'me', timestamp: 'Yesterday', read: true },
        { id: 3, text: 'The photoshoot is scheduled for next week', sender: 'other', timestamp: '9:00 AM', read: true },
      ],
    },
    {
      id: 3, name: 'TechGear Pro', role: 'Sports Tech', initials: 'TG',
      lastMessage: 'Can you make it to the event on Saturday?', lastMessageTime: '3h ago',
      unreadCount: 1, online: true,
      messages: [
        { id: 1, text: "We're launching a new product line and would love you to be involved.", sender: 'other', timestamp: '11:00 AM', read: true },
        { id: 2, text: "That sounds great! What's the timeline?", sender: 'me', timestamp: '11:15 AM', read: true },
        { id: 3, text: 'Can you make it to the event on Saturday?', sender: 'other', timestamp: '11:30 AM', read: false },
      ],
    },
    {
      id: 4, name: 'FitLife Nutrition', role: 'Health & Wellness', initials: 'FL',
      lastMessage: 'Great working with you!', lastMessageTime: 'Yesterday',
      unreadCount: 0, online: false,
      messages: [
        { id: 1, text: "The campaign was a hit! Here are the final numbers.", sender: 'other', timestamp: 'Yesterday', read: true },
        { id: 2, text: 'Great working with you!', sender: 'me', timestamp: 'Yesterday', read: true },
      ],
    },
  ];

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      console.log('Sending message:', messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-96 bg-white flex flex-col" style={{ borderRight: '1px solid #B4E2ED' }}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-4xl mb-4 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}>
            MESSAGES
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedConversation === conv.id ? 'bg-[#EFFAFC]' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white font-bold">
                    {conv.initials}
                  </div>
                  {conv.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{conv.name}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{conv.role}</p>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#6CC3DA' }}>
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white font-bold">
                  {activeConversation.initials}
                </div>
                {activeConversation.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h2 className="text-2xl tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#6CC3DA' }}>
                  {activeConversation.name.toUpperCase()}
                </h2>
                <p className="text-sm text-gray-600">
                  {activeConversation.role} • {activeConversation.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Phone className="w-5 h-5 text-gray-600" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Video className="w-5 h-5 text-gray-600" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-gray-600" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4 bg-gray-50">
            {activeConversation.messages.map(message => (
              <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'me'
                    ? 'bg-[#6CC3DA] text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm">{message.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs ${message.sender === 'me' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp}
                    </span>
                    {message.sender === 'me' && (
                      <CheckCheck className={`w-4 h-4 ${message.read ? 'text-blue-100' : 'text-blue-200'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border-t border-gray-200 p-6">
            <div className="flex items-end gap-3">
              <button className="p-3 hover:bg-gray-100 rounded-lg transition-colors"><Paperclip className="w-5 h-5 text-gray-600" /></button>
              <button className="p-3 hover:bg-gray-100 rounded-lg transition-colors"><ImageIcon className="w-5 h-5 text-gray-600" /></button>
              <div className="flex-1">
                <textarea
                  value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={handleKeyPress}
                  placeholder="Type a message..." rows={1}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] resize-none text-gray-900"
                />
              </div>
              <button
                onClick={handleSendMessage} disabled={!messageInput.trim()}
                className="p-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#6CC3DA' }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}
