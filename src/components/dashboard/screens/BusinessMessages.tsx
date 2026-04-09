'use client';

import { useState } from 'react';
import { Search, Send, User, Trash2, Plus } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

const FootballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
    <path d="M8 8l8 8" />
    <path d="M11 9l2 2" />
    <path d="M9 11l2 2" />
    <path d="M13 11l2 2" />
  </svg>
);

const BaseballIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2A10 10 0 0 1 12 22" />
    <path d="M12 2A10 10 0 0 0 12 22" />
    <path d="M8 5a8 8 0 0 0 0 14" />
    <path d="M16 5a8 8 0 0 1 0 14" />
  </svg>
);

import { Conversation, mockConversations, mockAthletes } from '@/lib/mockData';

const sports = ['Football', 'Baseball', 'Softball', 'Cheerleading', 'Dance', 'Basketball', 'Beach Volleyball'];

export function BusinessMessages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [showUnread, setShowUnread] = useState(false);

  const filteredConversations = mockConversations.filter(c => {
    const athlete = mockAthletes.find(a => a.id === c.athleteId);
    
    const matchesSearch = c.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
                          
    const matchesSport = activeSport && athlete ? athlete.sport === activeSport : true;
    const matchesUnread = showUnread ? c.unread : true;
    
    return matchesSearch && matchesSport && matchesUnread;
  });

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden text-[#1C1C1E]">
      {/* Top Filter Bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Athletes..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] text-white rounded-full text-sm font-medium hover:bg-[#2D2D2F] transition-colors shrink-0">
          All Filters
        </button>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 pb-1">
          {sports.map(sport => {
            const isActive = activeSport === sport;
            return (
              <button
                key={sport}
                onClick={() => setActiveSport(isActive ? null : sport)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive 
                    ? 'border-[#1C1C1E] bg-[#1C1C1E] text-white' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {sport === 'Football' && <FootballIcon className="w-4 h-4" />}
                {(sport === 'Baseball' || sport === 'Softball') && <BaseballIcon className="w-4 h-4" />}
                {sport !== 'Football' && sport !== 'Baseball' && sport !== 'Softball' && (
                  <div className="w-4 h-4 rounded-full border border-current opacity-50 flex items-center justify-center text-[8px]">✦</div>
                )}
                {sport}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-4 lg:p-6 gap-6">
        {/* Left Column wrapper */}
        <div className={`w-full lg:w-[320px] flex-col shrink-0 h-full ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <h2 className="font-bold flex items-center gap-2 text-lg">
              Inbox <span className="text-gray-400 font-normal text-sm">{filteredConversations.length} Chats</span>
            </h2>
            <button 
              onClick={() => setShowUnread(!showUnread)}
              className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors border ${showUnread ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Unread <span className="text-[10px] ml-1 text-gray-400">▼</span>
            </button>
          </div>
          
          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                  No matching conversations
                </div>
              ) : filteredConversations.map(conv => (
                <div 
                  key={conv.id} 
                  onClick={() => setSelectedChat(conv.id)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat === conv.id ? 'bg-gray-50' : ''}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full border border-gray-100 p-0.5 relative">
                      <img src={conv.image} alt={conv.athleteName} className="w-full h-full rounded-full object-cover" />
                      {conv.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-sm truncate">{conv.athleteName}</h3>
                      {conv.verified && <VerifiedBadge className="w-4 h-4 text-blue-500 shrink-0" />}
                    </div>
                    <p className={`text-[13px] truncate ${conv.unread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column wrapper */}
        <div className={`flex-1 flex-col h-full ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
          <div className="mb-3 px-1 flex items-center gap-3 shrink-0">
            {/* Mobile Back Button to Return to List */}
            {selectedChat && (
              <button 
                onClick={() => setSelectedChat(null)}
                className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 flex items-center gap-1"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            <h2 className="font-bold text-lg">Chat</h2>
          </div>

          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col relative w-full h-full">
            {/* STICKY HEADER - ALWAYS PRESENT */}
            <div className="h-14 bg-[#1C1C1E] text-white flex items-center justify-between px-4 shrink-0 w-full">
              {(() => {
                const activeConversation = selectedChat ? mockConversations.find(c => c.id === selectedChat) : null;
                if (activeConversation) {
                  return (
                    <>
                      <div className="flex items-center gap-2">
                         <img src={activeConversation.image} className="w-8 h-8 rounded-full object-cover" />
                         <span className="font-bold text-[15px]">{activeConversation.athleteName}</span>
                         {activeConversation.verified && <VerifiedBadge />}
                      </div>
                      <Trash2 className="w-5 h-5 cursor-pointer text-gray-400 hover:text-white transition-colors" />
                    </>
                  );
                }
                return <div className="w-full flex"></div>;
              })()}
            </div>
            
            <div className="flex-1 flex flex-col relative overflow-hidden bg-white w-full h-full">
               {selectedChat ? (() => {
                  const activeConversation = mockConversations.find(c => c.id === selectedChat);
                  if (!activeConversation) return null;
                  
                  return (
                     <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pb-24">
                        <div className="text-center">
                           <span className="text-xs font-bold text-gray-900">Today</span>
                        </div>
                        
                        {activeConversation.messages.map(msg => {
                          if (msg.sender === 'athlete') {
                            return (
                              <div key={msg.id} className="flex items-start gap-3">
                                 <img src={activeConversation.image} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                                 <div className="bg-gray-100 text-gray-800 text-[13px] px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-md shadow-sm">
                                    {msg.content}
                                 </div>
                              </div>
                            );
                          } else {
                            if (msg.type === 'deal_offer' && msg.dealTerms) {
                              return (
                                <div key={msg.id} className="flex justify-end">
                                   <div className="bg-[#2D2D2F] text-white text-[13px] px-5 py-4 rounded-2xl rounded-tr-sm max-w-[340px] leading-relaxed shadow-sm">
                                      <p className="mb-3 font-medium">{msg.dealTerms.duration}:</p>
                                      <ul className="space-y-1.5 text-gray-300 mb-5 ml-1">
                                        {msg.dealTerms.deliverables.map((item, i) => (
                                          <li key={i}>{item}</li>
                                        ))}
                                      </ul>
                                      <p className="text-gray-300 mt-2">Compensation: <span className="text-white font-medium">{msg.dealTerms.compensation}</span></p>
                                   </div>
                                </div>
                              );
                            }
                            return (
                              <div key={msg.id} className="flex justify-end">
                                 <div className="bg-[#2D2D2F] text-white text-[13px] px-4 py-3 rounded-2xl rounded-tr-sm max-w-md leading-relaxed shadow-sm">
                                    {msg.content}
                                 </div>
                              </div>
                            );
                          }
                        })}
                     </div>
                  );
               })() : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3 pb-24">
                     <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center">
                       <User className="w-8 h-8 text-gray-400" />
                     </div>
                     <span className="text-sm font-medium">Select a Chat</span>
                  </div>
               )}
               
               {/* Input area fixed slightly above bottom */}
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-50 w-full shrink-0 z-10">
                  <div className="border border-gray-200 rounded-xl bg-white flex items-center px-4 py-3 shadow-sm w-full">
                    <Plus className="text-gray-400 w-5 h-5 shrink-0 cursor-pointer hover:text-gray-600" />
                    <input type="text" placeholder="Send a message" className="flex-1 bg-transparent pl-3 outline-none text-[14px] text-gray-800 placeholder-gray-400" />
                    <button className="w-8 h-8 bg-[#1C1C1E] rounded-lg flex items-center justify-center text-white hover:bg-black transition-colors shrink-0">
                      <Send className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
