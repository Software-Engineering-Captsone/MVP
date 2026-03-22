export interface Athlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  image: string;
  verified: boolean;
  stats: {
    instagram: string;
    tiktok: string;
    facebook: string;
  };
  bio?: string;
  contentImages?: string[];
  teamLogo?: string;
}

export const mockAthletes: Athlete[] = [
  {
    id: '1',
    name: 'Emalee Frost',
    sport: "Women's Volleyball",
    school: 'Hofstra Pride',
    // Switching to a more appropriate image if possible, choosing Athlete5 for girl
    image: '/athletes_images/Athlete5.jpeg',
    verified: true,
    stats: { instagram: '10.1K', tiktok: '2.1K', facebook: '2.1K' },
    bio: "I'm a dedicated student-athlete on the Hofstra Pride women's volleyball team, focused on competing at a high level while staying strong academically. I bring energy, discipline, and a team-first mindset to everything I do on and off the court.",
    teamLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Hofstra_Pride_logo.svg/1200px-Hofstra_Pride_logo.svg.png',
    contentImages: [
      '/athletes_images/Athlete1.jpg',
      '/athletes_images/Athlete2.jpg',
      '/athletes_images/Athlete3.jpeg'
    ]
  },
  {
    id: '2',
    name: 'Mia Galella',
    sport: 'Softball',
    school: 'Boston College Eagles',
    image: '/athletes_images/Athlete14.jpg', // girl
    verified: false,
    stats: { instagram: '14.2K', tiktok: '5.1K', facebook: '3.1K' },
    bio: "Passionate about softball and pushing my limits on the field. I love sharing my athletic journey with my followers."
  },
  {
    id: '3',
    name: 'Kyson Brown',
    sport: 'Football',
    school: 'Arizona State Sun Devils',
    image: '/athletes_images/Athlete6.jpg', // boy
    verified: true,
    stats: { instagram: '25.6K', tiktok: '12.4K', facebook: '8.2K' },
    bio: "Starting running back for Arizona State. Combining speed and power on the field, and a strong work ethic in the classroom."
  },
  {
    id: '4',
    name: 'Jordan Austin',
    sport: 'Baseball',
    school: 'Missouri Western State University',
    image: '/athletes_images/Athlete4.jpg', // boy
    verified: false,
    stats: { instagram: '8.5K', tiktok: '1.2K', facebook: '1.5K' },
    bio: "Pitcher for MWSU. Focused on perfecting my craft and building a strong community around college sports."
  },
  {
    id: '5',
    name: 'Aaliyah Turner',
    sport: 'Basketball',
    school: 'Texas Athletics',
    image: '/athletes_images/Athlete11.jpg', // girl
    verified: true,
    stats: { instagram: '45.1K', tiktok: '22.3K', facebook: '10.5K' },
    bio: "Point guard passionate about teamwork and leadership. Always bringing my best game."
  },
  {
    id: '6',
    name: 'Dante Holloway',
    sport: 'Track & Field',
    school: 'Oregon Ducks',
    image: '/athletes_images/Athlete12.jpg', // boy
    verified: true,
    stats: { instagram: '18.9K', tiktok: '6.7K', facebook: '4.3K' },
    bio: "Sprinter representing the Oregon Ducks. Pushing boundaries and setting new records."
  },
  {
    id: '7',
    name: 'Jaxon Steele',
    sport: 'Wrestling',
    school: 'Penn State',
    image: '/athletes_images/Athlete16.jpeg', // boy
    verified: false,
    stats: { instagram: '12.4K', tiktok: '3.2K', facebook: '2.1K' },
    bio: "Dedicated wrestler for Penn State. Discipline and determination define my athletic journey."
  },
  {
    id: '8',
    name: 'Sienna Brooks',
    sport: 'Gymnastics',
    school: 'UCLA Bruins',
    image: '/athletes_images/Athlete8.jpg', // girl
    verified: true,
    stats: { instagram: '88.2K', tiktok: '45.1K', facebook: '12.8K' },
    bio: "UCLA Gymnast. Finding balance, strength, and grace in every routine."
  },
  {
    id: '9',
    name: 'Malik Jefferson',
    sport: 'Football',
    school: 'Alabama Crimson Tide',
    image: '/athletes_images/Athlete10.jpg', // boy
    verified: true,
    stats: { instagram: '102K', tiktok: '55K', facebook: '25K' },
    bio: "Linebacker for Alabama. Bringing intensity and passion to every game."
  }
];

export type MessageType = 'text' | 'deal_offer';

export interface ChatMessage {
  id: string;
  sender: 'athlete' | 'brand';
  type: MessageType;
  content: string;
  timestamp: string;
  dealTerms?: {
    duration: string;
    deliverables: string[];
    compensation: string;
  };
}

export interface Conversation {
  id: number;
  athleteId: string;
  athleteName: string;
  image: string;
  lastMessage: string;
  online: boolean;
  unread: boolean;
  verified: boolean;
  messages: ChatMessage[];
}

// Generating conversations dynamically from mockAthletes
export const mockConversations: Conversation[] = mockAthletes.map((athlete, index) => {
  const defaultMessages = [
    "I see. Would I be able to do 2 posts...",
    "I am available for a call in like 6 min...",
    "I am available for a call in like 2 min...",
    "I'm so excited to work with you guys!"
  ];
  const lastMsgText = defaultMessages[index % defaultMessages.length];

  let messages: ChatMessage[] = [];

  // Emalee Frost gets the special deal negotiation history from the mockups
  if (athlete.name === 'Emalee Frost') {
    messages = [
      { id: 'm1', sender: 'athlete', type: 'text', content: "I'm open to opportunities", timestamp: '10:00 AM' },
      { id: 'm2', sender: 'brand', type: 'text', content: `Hi ${athlete.name.split(' ')[0]}, we came across your highlights and recent performance metrics. We're interested in a potential NIL partnership. Are you open to brand collaborations this spring?`, timestamp: '10:15 AM' },
      { id: 'm3', sender: 'athlete', type: 'text', content: "Yes, I'm open to opportunities. Can you share more details?", timestamp: '10:20 AM' },
      { 
        id: 'm4', 
        sender: 'brand', 
        type: 'deal_offer', 
        content: "Here is our initial proposal.", 
        timestamp: '11:00 AM',
        dealTerms: {
          duration: '3-month agreement',
          deliverables: [
            '- 2 Instagram posts/month',
            '- 1 short-form video (Reels/TikTok)/month',
            '- Product Integration (pre-workout line)'
          ],
          compensation: '$2,500 + product package'
        }
      },
      { id: 'm5', sender: 'athlete', type: 'text', content: "Understood. Would there be flexibility on content timing around my season schedule?", timestamp: '11:30 AM' }
    ];
  } else {
    // Generate a generic greeting history for the rest
    messages = [
      { id: 'm1', sender: 'brand', type: 'text', content: `Hey ${athlete.name.split(' ')[0]}, we'd love to partner with you this season!`, timestamp: 'Yesterday' },
      { id: 'm2', sender: 'athlete', type: 'text', content: lastMsgText, timestamp: 'Today' }
    ];
  }
  
  return {
    id: index + 1,
    athleteId: athlete.id,
    athleteName: athlete.name,
    image: athlete.image,
    lastMessage: athlete.name === 'Emalee Frost' ? "Understood. Would there be flexibility on content timing around my season schedule?" : lastMsgText,
    online: index % 2 === 0,
    unread: index % 3 === 0,
    verified: athlete.verified,
    messages: messages
  };
});
