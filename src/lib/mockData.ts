/** Athlete portraits and media use Unsplash via `u()` so URLs reliably return images without local assets. */
export const u = (photoId: string, width: string = '800') =>
  `https://images.unsplash.com/${photoId}?w=${width}&q=85&auto=format&fit=crop`;

export interface PlatformMetrics {
  handle: string;
  followers: string;
  postsPerMonth: number;
  engagementRate: string;
}

export interface ContentItem {
  id: string;
  type: 'image' | 'video';
  thumbnailUrl: string;
  views: string;
  caption: string;
  datePosted: string;
  overlayText?: string;
}

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
  bannerImage: string;
  position: string;
  academicYear: string;
  hometown: string;
  major: string;
  heightWeight: string;
  jerseyNumber: string;
  nilScore: number;
  socialHandles: {
    instagram: string;
    tiktok: string;
    facebook: string;
  };
  platformMetrics: {
    instagram: PlatformMetrics;
    tiktok: PlatformMetrics;
    facebook: PlatformMetrics;
  };
  aggregate: {
    totalFollowers: string;
    engagementRate: string;
    totalViews: string;
    monthlyPosts: number;
    estimatedImpressions: string;
  };
  achievements: string[];
  contentItems: ContentItem[];
  openToDeals: boolean;
  compatibilityScore: number;
}

const pm = (
  handle: string,
  followers: string,
  postsPerMonth: number,
  engagementRate: string
): PlatformMetrics => ({ handle, followers, postsPerMonth, engagementRate });

const C = (
  id: string,
  type: 'image' | 'video',
  thumbnailUrl: string,
  views: string,
  caption: string,
  datePosted: string,
  overlayText?: string
): ContentItem => ({ id, type, thumbnailUrl, views, caption, datePosted, overlayText });

export const mockAthletes: Athlete[] = [
  {
    id: '1',
    name: 'Emalee Frost',
    sport: "Women's Volleyball",
    school: 'Hofstra Pride',
    image: u('photo-1612872087720-bb876e2e67d1', '800'),
    verified: true,
    stats: { instagram: '10.1K', tiktok: '2.1K', facebook: '2.1K' },
    bio: "I'm a junior outside hitter for Hofstra, studying psychology with a focus on sports performance. I'm from Long Island, NY, and I've been playing club and school volleyball since middle school. Off the court I love travel photography, volunteering with youth sports camps, and spending time with my golden retriever, Milo. I'm interested in partnerships with brands that value authenticity, wellness, and student-athlete stories.",
    bannerImage: u('photo-1612872087720-bb876e2e67d1', '1400'),
    position: 'Outside Hitter',
    academicYear: 'Junior',
    hometown: 'Hempstead, NY',
    major: 'Psychology (Sports Performance focus)',
    heightWeight: "6'1\" · 172 lb",
    jerseyNumber: '#7',
    nilScore: 89,
    socialHandles: {
      instagram: '@emalee.frost',
      tiktok: '@emaleevb',
      facebook: 'EmaleeFrostAthlete',
    },
    platformMetrics: {
      instagram: pm('@emalee.frost', '10.1K', 14, '6.8%'),
      tiktok: pm('@emaleevb', '2.1K', 10, '9.1%'),
      facebook: pm('EmaleeFrostAthlete', '2.1K', 6, '4.2%'),
    },
    aggregate: {
      totalFollowers: '14.3K',
      engagementRate: '7.4%',
      totalViews: '1.02M',
      monthlyPosts: 30,
      estimatedImpressions: '312K',
    },
    achievements: [
      '2025 All-CAA Honorable Mention',
      'Team captain — 2025 spring campaign',
      "Dean's List — 3 semesters",
      '1,000+ career kills milestone (program record pace)',
      'Volunteer coach — Long Island Volleyball Academy',
    ],
    contentItems: [
      C('e1', 'image', u('photo-1571019613454-1cb2f99b2d8b', '800'), '33K', 'Post-practice recovery routine with the team.', 'Mar 2, 2026'),
      C('e2', 'image', u('photo-1571019614242-c5c5dee9f50b', '800'), '38.6K', 'Lift day — legs and core with our strength coach.', 'Feb 24, 2026'),
      C('e3', 'video', u('photo-1519681393784-d120267933ba', '800'), '37.3K', 'Snow weekend with family in Vermont.', 'Feb 10, 2026', 'THIS SEASON WAS EVERYTHING I HOPED FOR'),
      C('e4', 'image', u('photo-1461896836934-ffe607ba8211', '800'), '21K', 'Game-day fit and locker room vibes.', 'Jan 28, 2026'),
      C('e5', 'video', u('photo-1612872087720-bb876e2e67d1', '800'), '90.5K', 'Highlights from our five-set win vs. rival.', 'Jan 15, 2026', 'WE LEFT IT ALL ON THE COURT'),
      C('e6', 'image', u('photo-1495616811223-4d98c6e9c869', '800'), '18.2K', 'Campus sunset after classes.', 'Dec 8, 2025'),
      C('e7', 'video', u('photo-1488085061387-422e29b40080', '800'), '52K', 'Q&A: balancing travel and midterms.', 'Nov 20, 2025', 'STAYING ON TOP OF SCHOOL ON THE ROAD'),
      C('e8', 'image', u('photo-1526506118085-60ce8714f8c5', '800'), '12.4K', 'Team dinner before conference tournament.', 'Nov 2, 2025'),
    ],
    contentImages: [
      u('photo-1571019613454-1cb2f99b2d8b', '600'),
      u('photo-1571019614242-c5c5dee9f50b', '600'),
      u('photo-1461896836934-ffe607ba8211', '600'),
    ],
    openToDeals: true,
    compatibilityScore: 94,
  },
  {
    id: '2',
    name: 'Mia Galella',
    sport: 'Softball',
    school: 'Boston College Eagles',
    image: u('photo-1566577739112-5180d4bf9390', '800'),
    verified: false,
    stats: { instagram: '14.2K', tiktok: '5.1K', facebook: '3.1K' },
    bio: "Sophomore catcher and corner infielder for Boston College. I'm majoring in marketing and love creating short-form content around training, game prep, and life in the ACC. Open to apparel, nutrition, and lifestyle brands that align with competitive softball.",
    bannerImage: u('photo-1560272564-c83b66b1ad12', '1400'),
    position: 'Catcher / 1B',
    academicYear: 'Sophomore',
    hometown: 'Worcester, MA',
    major: 'Marketing',
    heightWeight: "5'8\" · 155 lb",
    jerseyNumber: '#22',
    nilScore: 76,
    socialHandles: {
      instagram: '@mia.g.softball',
      tiktok: '@miabc',
      facebook: 'MiaGalellaBC',
    },
    platformMetrics: {
      instagram: pm('@mia.g.softball', '14.2K', 18, '5.9%'),
      tiktok: pm('@miabc', '5.1K', 12, '8.2%'),
      facebook: pm('MiaGalellaBC', '3.1K', 5, '3.1%'),
    },
    aggregate: {
      totalFollowers: '22.4K',
      engagementRate: '6.4%',
      totalViews: '580K',
      monthlyPosts: 35,
      estimatedImpressions: '142K',
    },
    achievements: ['2025 ACC All-Freshman Team', 'Started 48 games as a freshman', '2x Student-Athlete Advisory Committee rep'],
    contentItems: [
      C('m1', 'video', u('photo-1518611012118-696072aa579a', '800'), '41K', 'Batting cage progression — week 4.', 'Mar 1, 2026', 'ONE SWING AT A TIME'),
      C('m2', 'image', u('photo-1566577739112-5180d4bf9390', '800'), '19K', 'Doubleheader-ready gear.', 'Feb 18, 2026'),
      C('m3', 'image', u('photo-1488085061387-422e29b40080', '800'), '11K', 'Travel day to Clemson.', 'Feb 4, 2026'),
      C('m4', 'video', u('photo-1576678927484-cc907957088c', '800'), '62K', 'Behind the plate mic’d up.', 'Jan 12, 2026', 'CALLING THE GAME'),
    ],
    contentImages: [u('photo-1566577739112-5180d4bf9390', '600'), u('photo-1488085061387-422e29b40080', '600')],
    openToDeals: true,
    compatibilityScore: 81,
  },
  {
    id: '3',
    name: 'Kyson Brown',
    sport: 'Football',
    school: 'Arizona State Sun Devils',
    image: u('photo-1595435934249-5df7ed86e1c0', '800'),
    verified: true,
    stats: { instagram: '25.6K', tiktok: '12.4K', facebook: '8.2K' },
    bio: "Junior running back — I run with patience and burst, and I'm building a personal brand around resilience and faith. Finance major; long-term I'm interested in sports business and investing. Looking for national and regional NIL partners in athletics, automotive, and tech.",
    bannerImage: u('photo-1595435934249-5df7ed86e1c0', '1400'),
    position: 'Running Back',
    academicYear: 'Junior',
    hometown: 'Phoenix, AZ',
    major: 'Finance',
    heightWeight: "5'11\" · 205 lb",
    jerseyNumber: '#28',
    nilScore: 91,
    socialHandles: {
      instagram: '@kyson.runs',
      tiktok: '@kyson28',
      facebook: 'KysonBrownASU',
    },
    platformMetrics: {
      instagram: pm('@kyson.runs', '25.6K', 16, '7.1%'),
      tiktok: pm('@kyson28', '12.4K', 20, '10.4%'),
      facebook: pm('KysonBrownASU', '8.2K', 4, '2.8%'),
    },
    aggregate: {
      totalFollowers: '46.2K',
      engagementRate: '8.2%',
      totalViews: '2.1M',
      monthlyPosts: 40,
      estimatedImpressions: '510K',
    },
    achievements: ['2025 All-Pac-12 honorable mention', 'Team rushing leader', 'Sun Devil Service Award — community hours'],
    contentItems: [
      C('k1', 'video', u('photo-1595435934249-5df7ed86e1c0', '800'), '120K', 'Film room: reading linebackers.', 'Mar 5, 2026', 'PATIENCE THEN EXPLODE'),
      C('k2', 'image', u('photo-1517836357463-d25dfeac3438', '800'), '34K', 'Weight room — lower body day.', 'Feb 20, 2026'),
      C('k3', 'video', u('photo-1571019613454-1cb2f99b2d8b', '800'), '88K', 'Highlights vs. Utah.', 'Nov 16, 2025', 'CAREER HIGH YARDS'),
      C('k4', 'image', u('photo-1521412644187-c49fa049e84d', '800'), '22K', 'Post-game with family.', 'Nov 10, 2025'),
    ],
    contentImages: [u('photo-1517836357463-d25dfeac3438', '600'), u('photo-1521412644187-c49fa049e84d', '600')],
    openToDeals: true,
    compatibilityScore: 88,
  },
  {
    id: '4',
    name: 'Jordan Austin',
    sport: 'Baseball',
    school: 'Missouri Western State University',
    image: u('photo-1560272564-c83b66b1ad12', '800'),
    verified: false,
    stats: { instagram: '8.5K', tiktok: '1.2K', facebook: '1.5K' },
    bio: "Senior RHP focused on command and late-inning situations. Business administration major. I document my throwing program, recovery, and small-school grind for followers who want honest athlete content.",
    bannerImage: u('photo-1566577739112-5180d4bf9390', '1400'),
    position: 'Pitcher (RHP)',
    academicYear: 'Senior',
    hometown: 'St. Joseph, MO',
    major: 'Business Administration',
    heightWeight: "6'3\" · 195 lb",
    jerseyNumber: '#14',
    nilScore: 72,
    socialHandles: {
      instagram: '@jordan.austin14',
      tiktok: '@jordyonthemound',
      facebook: 'JordanAustinMWSU',
    },
    platformMetrics: {
      instagram: pm('@jordan.austin14', '8.5K', 10, '5.2%'),
      tiktok: pm('@jordyonthemound', '1.2K', 6, '7.8%'),
      facebook: pm('JordanAustinMWSU', '1.5K', 2, '2.0%'),
    },
    aggregate: {
      totalFollowers: '11.2K',
      engagementRate: '5.5%',
      totalViews: '240K',
      monthlyPosts: 18,
      estimatedImpressions: '68K',
    },
    achievements: ['Career ERA under 3.50 in conference play', '2024 MIAA Pitcher of the Week (×2)', 'Academic honor roll'],
    contentItems: [
      C('j1', 'image', u('photo-1560272564-c83b66b1ad12', '800'), '9K', 'Bullpen — slider feel day.', 'Mar 4, 2026'),
      C('j2', 'video', u('photo-1518611012118-696072aa579a', '800'), '15K', 'Strikeout reel from last start.', 'Feb 26, 2026', 'COMMAND IN THE CLUTCH'),
      C('j3', 'image', u('photo-1540747913346-19e32dc3e97e', '800'), '6K', 'Road trip to conference rival.', 'Apr 1, 2025'),
    ],
    contentImages: [u('photo-1560272564-c83b66b1ad12', '600'), u('photo-1540747913346-19e32dc3e97e', '600')],
    openToDeals: true,
    compatibilityScore: 77,
  },
  {
    id: '5',
    name: 'Aaliyah Turner',
    sport: 'Basketball',
    school: 'Texas Athletics',
    image: u('photo-1546519638-68e109498ffc', '800'),
    verified: true,
    stats: { instagram: '45.1K', tiktok: '22.3K', facebook: '10.5K' },
    bio: "Starting point guard — I lead with pace, defense, and communication. Communications major; I enjoy storytelling through video and podcasts. Excited about fashion, beauty, and sports drink partnerships that fit my on-court energy.",
    bannerImage: u('photo-1546519638-68e109498ffc', '1400'),
    position: 'Point Guard',
    academicYear: 'Senior',
    hometown: 'Dallas, TX',
    major: 'Communication & Media',
    heightWeight: "5'9\" · 150 lb",
    jerseyNumber: '#3',
    nilScore: 94,
    socialHandles: {
      instagram: '@aaliyahhandles',
      tiktok: '@aaliyah3',
      facebook: 'AaliyahTurnerTexas',
    },
    platformMetrics: {
      instagram: pm('@aaliyahhandles', '45.1K', 22, '8.9%'),
      tiktok: pm('@aaliyah3', '22.3K', 28, '11.2%'),
      facebook: pm('AaliyahTurnerTexas', '10.5K', 8, '3.6%'),
    },
    aggregate: {
      totalFollowers: '77.9K',
      engagementRate: '9.5%',
      totalViews: '4.5M',
      monthlyPosts: 58,
      estimatedImpressions: '920K',
    },
    achievements: ['2025 All-Big 12 First Team', '1,000 career points', 'Captain — 2025–26'],
    contentItems: [
      C('a1', 'video', u('photo-1519861531473-9200262188bf', '800'), '210K', 'Full court press breakdown.', 'Mar 6, 2026', 'DEFENSE TRAVELS'),
      C('a2', 'image', u('photo-1546519638-68e109498ffc', '800'), '67K', 'Game-day arrival fit.', 'Mar 1, 2026'),
      C('a3', 'video', u('photo-1571019613454-1cb2f99b2d8b', '800'), '156K', 'Assist highlights — February.', 'Feb 14, 2026', 'FINDING SHOOTERS'),
      C('a4', 'image', u('photo-1518611012118-696072aa579a', '800'), '44K', 'Recovery pool session.', 'Jan 22, 2026'),
    ],
    contentImages: [u('photo-1546519638-68e109498ffc', '600'), u('photo-1519861531473-9200262188bf', '600')],
    openToDeals: true,
    compatibilityScore: 92,
  },
  {
    id: '6',
    name: 'Dante Holloway',
    sport: 'Track & Field',
    school: 'Oregon Ducks',
    image: u('photo-1552674605-db6ffd4facb5', '800'),
    verified: true,
    stats: { instagram: '18.9K', tiktok: '6.7K', facebook: '4.3K' },
    bio: "Sprinter (100m / 200m) — chasing PRs and relay medals. Human physiology major. Content focuses on training blocks, sleep, and nutrition for speed.",
    bannerImage: u('photo-1461896836934-ffe607ba8211', '1400'),
    position: 'Sprints',
    academicYear: 'Sophomore',
    hometown: 'Eugene, OR',
    major: 'Human Physiology',
    heightWeight: "6'0\" · 175 lb",
    jerseyNumber: '—',
    nilScore: 85,
    socialHandles: {
      instagram: '@dante.fast',
      tiktok: '@dantesprints',
      facebook: 'DanteHollowayUO',
    },
    platformMetrics: {
      instagram: pm('@dante.fast', '18.9K', 12, '6.3%'),
      tiktok: pm('@dantesprints', '6.7K', 15, '9.0%'),
      facebook: pm('DanteHollowayUO', '4.3K', 3, '2.4%'),
    },
    aggregate: {
      totalFollowers: '29.9K',
      engagementRate: '7.1%',
      totalViews: '890K',
      monthlyPosts: 30,
      estimatedImpressions: '198K',
    },
    achievements: ['2025 Pac-12 relay finalist', 'Indoor 200m PR — 20.92', 'UO track & field scholar-athlete'],
    contentItems: [
      C('d1', 'video', u('photo-1461896836934-ffe607ba8211', '800'), '72K', 'Block starts — technical cues.', 'Feb 27, 2026', 'EXPLODE OUT THE BLOCKS'),
      C('d2', 'image', u('photo-1571019613454-1cb2f99b2d8b', '800'), '14K', 'Lift — posterior chain.', 'Feb 10, 2026'),
      C('d3', 'image', u('photo-1552674605-db6ffd4facb5', '800'), '21K', 'Meet day in Hayward.', 'May 18, 2025'),
    ],
    contentImages: [u('photo-1461896836934-ffe607ba8211', '600'), u('photo-1552674605-db6ffd4facb5', '600')],
    openToDeals: true,
    compatibilityScore: 84,
  },
  {
    id: '7',
    name: 'Jaxon Steele',
    sport: 'Wrestling',
    school: 'Penn State',
    image: u('photo-1583454110551-21f2fa2afe61', '800'),
    verified: false,
    stats: { instagram: '12.4K', tiktok: '3.2K', facebook: '2.1K' },
    bio: "Redshirt freshman at 165 lb — obsessed with hand-fighting and conditioning. Supply chain major. Looking for regional NIL deals with food, recovery, and training brands.",
    bannerImage: u('photo-1583454110551-21f2fa2afe61', '1400'),
    position: '165 lb',
    academicYear: 'Redshirt Freshman',
    hometown: 'Harrisburg, PA',
    major: 'Supply Chain Management',
    heightWeight: "5'10\" · 163 lb",
    jerseyNumber: '—',
    nilScore: 78,
    socialHandles: {
      instagram: '@jaxon.steele.psu',
      tiktok: '@jaxonrolls',
      facebook: 'JaxonSteeleWrestling',
    },
    platformMetrics: {
      instagram: pm('@jaxon.steele.psu', '12.4K', 9, '5.8%'),
      tiktok: pm('@jaxonrolls', '3.2K', 8, '8.1%'),
      facebook: pm('JaxonSteeleWrestling', '2.1K', 2, '1.9%'),
    },
    aggregate: {
      totalFollowers: '17.7K',
      engagementRate: '6.0%',
      totalViews: '410K',
      monthlyPosts: 19,
      estimatedImpressions: '95K',
    },
    achievements: ['2024 PA state champion', 'Academic Big Ten honoree', 'RTC training invite'],
    contentItems: [
      C('jx1', 'video', u('photo-1583454110551-21f2fa2afe61', '800'), '48K', 'Drill: collar ties and snaps.', 'Mar 3, 2026', 'HAND FIGHT EVERY POSITION'),
      C('jx2', 'image', u('photo-1571019614242-c5c5dee9f50b', '800'), '11K', 'Weight cut — hydration focus.', 'Feb 15, 2026'),
    ],
    contentImages: [u('photo-1583454110551-21f2fa2afe61', '600'), u('photo-1571019614242-c5c5dee9f50b', '600')],
    openToDeals: true,
    compatibilityScore: 79,
  },
  {
    id: '8',
    name: 'Sienna Brooks',
    sport: 'Gymnastics',
    school: 'UCLA Bruins',
    image: u('photo-1518611012118-696072aa579a', '800'),
    verified: true,
    stats: { instagram: '88.2K', tiktok: '45.1K', facebook: '12.8K' },
    bio: "All-around competitor — floor and beam are my signatures. Cognitive science major. I create high-energy reels and behind-the-scenes meet content for a global gym fan audience.",
    bannerImage: u('photo-1566577739112-5180d4bf9390', '1400'),
    position: 'All-Around',
    academicYear: 'Junior',
    hometown: 'Los Angeles, CA',
    major: 'Cognitive Science',
    heightWeight: "5'3\" · 115 lb",
    jerseyNumber: '—',
    nilScore: 96,
    socialHandles: {
      instagram: '@sienna.brooks.gym',
      tiktok: '@siennafloor',
      facebook: 'SiennaBrooksUCLA',
    },
    platformMetrics: {
      instagram: pm('@sienna.brooks.gym', '88.2K', 25, '10.1%'),
      tiktok: pm('@siennafloor', '45.1K', 35, '12.8%'),
      facebook: pm('SiennaBrooksUCLA', '12.8K', 6, '3.2%'),
    },
    aggregate: {
      totalFollowers: '146.1K',
      engagementRate: '10.8%',
      totalViews: '8.2M',
      monthlyPosts: 66,
      estimatedImpressions: '1.4M',
    },
    achievements: ['2025 NCAA Regional qualifier', 'Perfect 10 on floor (meet record)', 'Pac-12 Scholar-Athlete of the Year nominee'],
    contentItems: [
      C('s1', 'video', u('photo-1566577739112-5180d4bf9390', '800'), '402K', 'Floor routine — full video.', 'Mar 7, 2026', 'THIS ROUTINE MEANS EVERYTHING'),
      C('s2', 'image', u('photo-1518611012118-696072aa579a', '800'), '98K', 'Beam warmup flow.', 'Feb 22, 2026'),
      C('s3', 'video', u('photo-1571019613454-1cb2f99b2d8b', '800'), '256K', 'Meet week vlog.', 'Jan 30, 2026', 'WEEK IN MY LIFE'),
    ],
    contentImages: [u('photo-1566577739112-5180d4bf9390', '600'), u('photo-1518611012118-696072aa579a', '600')],
    openToDeals: true,
    compatibilityScore: 95,
  },
  {
    id: '9',
    name: 'Malik Jefferson',
    sport: 'Football',
    school: 'Alabama Crimson Tide',
    image: u('photo-1551698618-1dfe5d97d256', '800'),
    verified: true,
    stats: { instagram: '102K', tiktok: '55K', facebook: '25K' },
    bio: "Linebacker — run fits, coverage, and special teams. Building a platform around leadership and film study. Business management major with an interest in NIL education for younger athletes.",
    bannerImage: u('photo-1595435934249-5df7ed86e1c0', '1400'),
    position: 'Linebacker',
    academicYear: 'Senior',
    hometown: 'Birmingham, AL',
    major: 'Business Management',
    heightWeight: "6'2\" · 230 lb",
    jerseyNumber: '#15',
    nilScore: 93,
    socialHandles: {
      instagram: '@malik.j.lb',
      tiktok: '@malikfilmroom',
      facebook: 'MalikJeffersonBama',
    },
    platformMetrics: {
      instagram: pm('@malik.j.lb', '102K', 20, '6.5%'),
      tiktok: pm('@malikfilmroom', '55K', 24, '8.8%'),
      facebook: pm('MalikJeffersonBama', '25K', 10, '2.9%'),
    },
    aggregate: {
      totalFollowers: '182K',
      engagementRate: '7.8%',
      totalViews: '12M',
      monthlyPosts: 54,
      estimatedImpressions: '2.1M',
    },
    achievements: ['2024 SEC Defensive Player of the Week', 'Team tackles leader', 'SEC community service team'],
    contentItems: [
      C('mj1', 'video', u('photo-1595435934249-5df7ed86e1c0', '800'), '340K', 'Film study: disguise and drop.', 'Mar 8, 2026', 'READ THE QB\'S EYES'),
      C('mj2', 'image', u('photo-1517836357463-d25dfeac3438', '800'), '89K', 'Night practice under the lights.', 'Feb 28, 2026'),
      C('mj3', 'video', u('photo-1521412644187-c49fa049e84d', '800'), '512K', 'Mic’d up at practice.', 'Jan 18, 2026', 'LEADERSHIP IS LOUD'),
    ],
    contentImages: [u('photo-1517836357463-d25dfeac3438', '600'), u('photo-1521412644187-c49fa049e84d', '600')],
    openToDeals: true,
    compatibilityScore: 90,
  },
];

export function getAthleteById(id: string): Athlete | undefined {
  return mockAthletes.find((a) => a.id === id);
}

export interface Brand {
  id: string;
  name: string;
  industry: string;
  location: string;
  image: string;
  verified: boolean;
  stats: {
    instagram: string;
    tiktok: string;
    twitter: string;
  };
  bio?: string;
  contentImages?: string[];
}

export const mockBrands: Brand[] = [
  {
    id: 'b1',
    name: 'PowerFuel Energy',
    industry: 'Sports Nutrition',
    location: 'Austin, TX',
    image: u('photo-1512621776951-a57141f2eefd'),
    verified: true,
    stats: { instagram: '125K', tiktok: '45K', twitter: '12K' },
    bio: 'Fueling the next generation of athletes with clean, powerful energy solutions.',
    contentImages: [
      u('photo-1517836357463-d25dfeac3438', '600'),
      u('photo-1571019613454-1cb2f99b2d8b', '600'),
      u('photo-1544367567-0f2fcb009e0b', '600'),
    ],
  },
  {
    id: 'b2',
    name: 'Velocity Athletics',
    industry: 'Apparel',
    location: 'Portland, OR',
    image: u('photo-1441986300917-64674bd600d8'),
    verified: true,
    stats: { instagram: '890K', tiktok: '2.1M', twitter: '150K' },
    bio: 'High-performance athletic wear designed for peak performance and recovery.',
  },
  {
    id: 'b3',
    name: 'Peak Recovery',
    industry: 'Fitness Tech',
    location: 'Denver, CO',
    image: u('photo-1434494878577-86c23bcb06b9'),
    verified: true,
    stats: { instagram: '54K', tiktok: '12K', twitter: '5K' },
    bio: 'Pioneering recovery technology for professional and amateur athletes alike.',
  },
  {
    id: 'b4',
    name: 'Nexus Hydration',
    industry: 'Beverages',
    location: 'Miami, FL',
    image: u('photo-1548839140-29a749e1cf4d'),
    verified: false,
    stats: { instagram: '22K', tiktok: '8K', twitter: '2K' },
    bio: 'Electrolyte-rich hydration solutions formulated for endurance sports.',
  },
  {
    id: 'b5',
    name: 'AeroKnit Shoes',
    industry: 'Footwear',
    location: 'Brooklyn, NY',
    image: u('photo-1542291026-7eec264c27ff'),
    verified: true,
    stats: { instagram: '320K', tiktok: '150K', twitter: '85K' },
    bio: 'Revolutionary lightweight footwear built for speed and agility.',
  },
  {
    id: 'b6',
    name: 'IronGrip Equipment',
    industry: 'Fitness Equipment',
    location: 'Chicago, IL',
    image: u('photo-1583454110551-21f2fa2afe61'),
    verified: true,
    stats: { instagram: '112K', tiktok: '34K', twitter: '18K' },
    bio: 'Professional-grade strength training equipment for serious athletes.',
  },
  {
    id: 'b7',
    name: 'Titan Supplements',
    industry: 'Sports Nutrition',
    location: 'Los Angeles, CA',
    image: u('photo-1584308666744-24d5c474f2ae'),
    verified: true,
    stats: { instagram: '430K', tiktok: '120K', twitter: '45K' },
    bio: 'Premium supplements formulated for titans of the industry.',
  },
  {
    id: 'b8',
    name: 'AquaFlow',
    industry: 'Beverages',
    location: 'Seattle, WA',
    image: u('photo-1559827260-dc66d52bef19'),
    verified: false,
    stats: { instagram: '15K', tiktok: '2K', twitter: '1K' },
    bio: 'Pure alkaline water sourced from pristine natural springs.',
  },
  {
    id: 'b9',
    name: 'Zenith Apparel',
    industry: 'Apparel',
    location: 'New York, NY',
    image: u('photo-1460353581641-37baddab0fa2'),
    verified: true,
    stats: { instagram: '1.2M', tiktok: '3.4M', twitter: '200K' },
    bio: 'Setting the standard for modern athletic fashion and lifestyle.',
  },
  {
    id: 'b10',
    name: 'CoreMotion',
    industry: 'Fitness Tech',
    location: 'Salt Lake City, UT',
    image: u('photo-1579586337278-3befd40fd17a'),
    verified: true,
    stats: { instagram: '78K', tiktok: '15K', twitter: '8K' },
    bio: 'Wearables that track your movement, heart rate, and potential.',
  },
  {
    id: 'b11',
    name: 'Elevate Tech',
    industry: 'Fitness Tech',
    location: 'Austin, TX',
    image: u('photo-1576678927484-cc907957088c'),
    verified: false,
    stats: { instagram: '5K', tiktok: '1K', twitter: '500' },
    bio: 'Smart gym equipment that brings the studio to your home.',
  },
  {
    id: 'b12',
    name: 'PureStrength',
    industry: 'Fitness Equipment',
    location: 'Columbus, OH',
    image: u('photo-1517836357463-d25dfeac3438'),
    verified: true,
    stats: { instagram: '400K', tiktok: '80K', twitter: '25K' },
    bio: 'Built tough for the rigorous demands of powerlifters and bodybuilders.',
  },
];

/** Maps deal/inbox labels that are not exact `mockBrands.name` values to a canonical brand id. */
const BRAND_LABEL_TO_ID: Record<string, string> = {
  'PowerFuel Energy': 'b1',
  'Campus Threads': 'b2',
  'TechGear Pro': 'b10',
  'FitLife Nutrition': 'b7',
  'Local Auto Dealership': 'b8',
  'Study App Co': 'b11',
};

export function getBrandImageByName(label: string): string {
  const byAlias = BRAND_LABEL_TO_ID[label];
  if (byAlias) {
    const b = mockBrands.find((x) => x.id === byAlias);
    if (b) return b.image;
  }
  const exact = mockBrands.find((b) => b.name === label);
  return exact?.image ?? mockBrands[0].image;
}

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

/** Athlete inbox: conversations with brands (mirror of legacy Messaging mock). */
export interface BrandInboxThread {
  id: number;
  brandId: string;
  brandName: string;
  industry: string;
  image: string;
  lastMessage: string;
  lastMessageTime: string;
  online: boolean;
  unread: boolean;
  unreadCount: number;
  verified: boolean;
  messages: ChatMessage[];
}

export const mockAthleteBrandThreads: BrandInboxThread[] = [
  {
    id: 1,
    brandId: 'b1',
    brandName: 'PowerFuel Energy',
    industry: 'Sports Nutrition',
    image: mockBrands.find((b) => b.id === 'b1')!.image,
    lastMessage: 'Looking forward to seeing the content!',
    lastMessageTime: '2m ago',
    online: true,
    unread: true,
    unreadCount: 2,
    verified: true,
    messages: [
      { id: 'a1', sender: 'brand', type: 'text', content: "Hi! We'd love to discuss the campaign details.", timestamp: '10:30 AM' },
      { id: 'a2', sender: 'athlete', type: 'text', content: "Hey! I'm excited to work with you guys. What do you have in mind?", timestamp: '10:35 AM' },
      {
        id: 'a3',
        sender: 'brand',
        type: 'text',
        content: "We'd like 3 Instagram posts featuring our new energy drink. Can you share your content calendar?",
        timestamp: '10:40 AM',
      },
      {
        id: 'a4',
        sender: 'athlete',
        type: 'text',
        content: "Sure! I'll send it over by end of day. I have some great ideas for the basketball court shots.",
        timestamp: '10:42 AM',
      },
      { id: 'a5', sender: 'brand', type: 'text', content: 'Looking forward to seeing the content!', timestamp: '10:45 AM' },
    ],
  },
  {
    id: 2,
    brandId: 'b2',
    brandName: 'Velocity Athletics',
    industry: 'Apparel',
    image: mockBrands.find((b) => b.id === 'b2')!.image,
    lastMessage: 'The photoshoot is scheduled for next week',
    lastMessageTime: '1h ago',
    online: false,
    unread: false,
    unreadCount: 0,
    verified: true,
    messages: [
      { id: 'b1', sender: 'brand', type: 'text', content: 'Hi, thanks for accepting our partnership!', timestamp: 'Yesterday' },
      { id: 'b2', sender: 'athlete', type: 'text', content: 'Happy to be on board! When do we start?', timestamp: 'Yesterday' },
      { id: 'b3', sender: 'brand', type: 'text', content: 'The photoshoot is scheduled for next week', timestamp: '9:00 AM' },
    ],
  },
  {
    id: 3,
    brandId: 'b3',
    brandName: 'Peak Recovery',
    industry: 'Fitness Tech',
    image: mockBrands.find((b) => b.id === 'b3')!.image,
    lastMessage: 'Can you make it to the event on Saturday?',
    lastMessageTime: '3h ago',
    online: true,
    unread: true,
    unreadCount: 1,
    verified: true,
    messages: [
      {
        id: 'c1',
        sender: 'brand',
        type: 'text',
        content: "We're launching a new product line and would love you to be involved.",
        timestamp: '11:00 AM',
      },
      { id: 'c2', sender: 'athlete', type: 'text', content: "That sounds great! What's the timeline?", timestamp: '11:15 AM' },
      { id: 'c3', sender: 'brand', type: 'text', content: 'Can you make it to the event on Saturday?', timestamp: '11:30 AM' },
    ],
  },
  {
    id: 4,
    brandId: 'b7',
    brandName: 'Titan Supplements',
    industry: 'Sports Nutrition',
    image: mockBrands.find((b) => b.id === 'b7')!.image,
    lastMessage: 'Great working with you!',
    lastMessageTime: 'Yesterday',
    online: false,
    unread: false,
    unreadCount: 0,
    verified: true,
    messages: [
      { id: 'd1', sender: 'brand', type: 'text', content: 'The campaign was a hit! Here are the final numbers.', timestamp: 'Yesterday' },
      { id: 'd2', sender: 'athlete', type: 'text', content: 'Great working with you!', timestamp: 'Yesterday' },
    ],
  },
];
