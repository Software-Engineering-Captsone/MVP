import { Search, Send, Paperclip, MoreVertical } from "lucide-react";
import { useState } from "react";

export function Messaging() {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [messageInput, setMessageInput] = useState("");

  const conversations = [
    {
      id: 1,
      company: "PowerFuel Energy",
      logo: "PF",
      lastMessage: "Great! Looking forward to seeing the content.",
      timestamp: "2:30 PM",
      unread: 0,
    },
    {
      id: 2,
      company: "Campus Threads",
      logo: "CT",
      lastMessage: "When can you schedule the photoshoot?",
      timestamp: "11:45 AM",
      unread: 2,
    },
    {
      id: 3,
      company: "FitLife Nutrition",
      logo: "FL",
      lastMessage: "We'd love to work with you on this campaign.",
      timestamp: "Yesterday",
      unread: 1,
    },
    {
      id: 4,
      company: "TechGear Pro",
      logo: "TG",
      lastMessage: "The event details are attached.",
      timestamp: "Yesterday",
      unread: 0,
    },
    {
      id: 5,
      company: "Study Buddy App",
      logo: "SB",
      lastMessage: "Thanks for your interest in the ambassador role!",
      timestamp: "Feb 20",
      unread: 1,
    },
    {
      id: 6,
      company: "Local Auto Dealership",
      logo: "AW",
      lastMessage: "Payment has been processed.",
      timestamp: "Feb 18",
      unread: 0,
    },
  ];

  const messages = {
    1: [
      {
        id: 1,
        sender: "them",
        text: "Hi Marcus! We're excited to have you on board for our social media campaign.",
        timestamp: "10:15 AM",
      },
      {
        id: 2,
        sender: "me",
        text: "Thanks! I'm really excited about this partnership. What are the next steps?",
        timestamp: "10:20 AM",
      },
      {
        id: 3,
        sender: "them",
        text: "We'll send over the content guidelines and product samples by Friday. You'll have creative freedom while hitting our key messaging points.",
        timestamp: "10:25 AM",
      },
      {
        id: 4,
        sender: "me",
        text: "Perfect! I'll start brainstorming some content ideas. Should I send drafts for approval first?",
        timestamp: "2:15 PM",
      },
      {
        id: 5,
        sender: "them",
        text: "Great! Looking forward to seeing the content.",
        timestamp: "2:30 PM",
      },
    ],
    2: [
      {
        id: 1,
        sender: "them",
        text: "Hey Marcus! We love your style and think you'd be perfect for our spring collection.",
        timestamp: "Yesterday",
      },
      {
        id: 2,
        sender: "me",
        text: "Thank you! I'd love to learn more about the opportunity.",
        timestamp: "Yesterday",
      },
      {
        id: 3,
        sender: "them",
        text: "When can you schedule the photoshoot?",
        timestamp: "11:45 AM",
      },
    ],
  };

  const currentConversation = conversations.find((c) => c.id === selectedConversation);
  const currentMessages = messages[selectedConversation as keyof typeof messages] || [];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In a real app, this would send the message
      setMessageInput("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white">
      {/* Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <h2
            className="text-3xl mb-4 tracking-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
          >
            MESSAGES
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-sm text-gray-900"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                selectedConversation === conv.id ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                >
                  {conv.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold truncate text-gray-900">{conv.company}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {conv.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ml-2"
                        style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                      >
                        {conv.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        {currentConversation && (
          <>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                >
                  {currentConversation.logo}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900">{currentConversation.company}</h2>
                  <p className="text-sm text-gray-600">Active Partnership</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md ${
                      message.sender === "me"
                        ? "bg-[#6CC3DA] text-white"
                        : "bg-white border border-gray-200"
                    } rounded-lg px-4 py-3 shadow-sm`}
                  >
                    <p className={`text-sm leading-relaxed ${message.sender === "me" ? "text-white" : "text-gray-900"}`}>{message.text}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.sender === "me" ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <button className="p-3 hover:bg-gray-100 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors resize-none text-gray-900"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}