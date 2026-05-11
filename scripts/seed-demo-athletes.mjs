import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local before running this script.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_PASSWORD = process.env.DEMO_ATHLETE_PASSWORD || 'NilinkDemo2026!';

const athletes = [
  {
    name: 'Maya Thompson',
    email: 'maya.thompson@nilink-demo.test',
    sport: 'Track & Field',
    position: '400m Hurdles',
    school: 'University of Oregon',
    instagramFollowers: 148_000,
    tiktokFollowers: 312_000,
    bio:
      'A disciplined sprinter-hurdler known for explosive finishes and a strong social media presence focused on training routines, nutrition, and student-athlete life. Maya balances elite competition with mentoring young runners in her hometown.',
    currentYear: 'Junior',
    hometown: 'Atlanta, Georgia',
    major: 'Sports Psychology',
    achievements: [
      '3x NCAA All-American',
      'Pac-12 400m Hurdles Champion',
      'U.S. U23 National Team Selection',
      'University Record Holder (400m Hurdles)',
      '2x Academic Honor Roll',
    ],
  },
  {
    name: 'Jason Rivera',
    email: 'jason.rivera@nilink-demo.test',
    sport: 'Basketball',
    position: 'Point Guard',
    school: 'Duke University',
    instagramFollowers: 425_000,
    tiktokFollowers: 690_000,
    bio:
      'A high-IQ point guard with sharp court vision and leadership skills. Jason is recognized for clutch performances, community outreach, and content documenting game prep and campus life.',
    currentYear: 'Sophomore',
    hometown: 'Chicago, Illinois',
    major: 'Business Administration',
    achievements: [
      'ACC Freshman of the Year',
      'NCAA Tournament Elite Eight Appearance',
      '2x ACC Player of the Week',
      'Team Captain as Sophomore',
      'McDonald’s All-American Alumni MVP',
    ],
  },
  {
    name: 'Serena Brooks',
    email: 'serena.brooks@nilink-demo.test',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    school: 'Stanford University',
    instagramFollowers: 202_000,
    tiktokFollowers: 441_000,
    bio:
      'Serena is a dominant outside hitter with exceptional vertical ability and defensive versatility. She advocates for women in sports and frequently posts motivational content.',
    currentYear: 'Senior',
    hometown: 'San Diego, California',
    major: 'Human Biology',
    achievements: [
      'NCAA Championship Winner',
      '4x All-Pac-12 Selection',
      'AVCA First-Team All-American',
      'Stanford Offensive MVP',
      'USA Collegiate National Team Member',
    ],
  },
  {
    name: 'Elijah Carter',
    email: 'elijah.carter@nilink-demo.test',
    sport: 'Football',
    position: 'Wide Receiver',
    school: 'University of Alabama',
    instagramFollowers: 510_000,
    tiktokFollowers: 870_000,
    bio:
      'A dynamic deep-threat receiver with elite speed and charisma. Elijah’s online following grew from highlight catches, fitness content, and fashion collaborations.',
    currentYear: 'Junior',
    hometown: 'Houston, Texas',
    major: 'Communications',
    achievements: [
      'CFP National Champion',
      'SEC Receiving Yards Leader',
      'Biletnikoff Award Finalist',
      '3x SEC Offensive Player of the Week',
      'School Record for Single-Season Touchdowns',
    ],
  },
  {
    name: 'Chloe Bennett',
    email: 'chloe.bennett@nilink-demo.test',
    sport: 'Soccer',
    position: 'Midfielder',
    school: 'UCLA',
    instagramFollowers: 189_000,
    tiktokFollowers: 355_000,
    bio:
      'Chloe is a creative midfielder with exceptional passing range and leadership on and off the field. She promotes mental health awareness for athletes.',
    currentYear: 'Senior',
    hometown: 'Portland, Oregon',
    major: 'Sociology',
    achievements: [
      'NCAA Women’s Soccer Champion',
      '2x First-Team All-American',
      'Pac-12 Midfielder of the Year',
      'U.S. U20 Women’s National Team Captain',
      'UCLA Assist Record Holder',
    ],
  },
  {
    name: 'Noah Patel',
    email: 'noah.patel@nilink-demo.test',
    sport: 'Swimming',
    position: 'Freestyle',
    school: 'University of Texas',
    instagramFollowers: 132_000,
    tiktokFollowers: 278_000,
    bio:
      'A versatile freestyle specialist known for discipline in and out of the pool. Noah shares recovery techniques, race-day strategies, and STEM student-athlete experiences.',
    currentYear: 'Freshman',
    hometown: 'Phoenix, Arizona',
    major: 'Biomedical Engineering',
    achievements: [
      'NCAA Freshman Swimmer of the Year',
      'Big 12 Champion (200m Freestyle)',
      'Junior National Gold Medalist',
      'School Freshman Record Holder',
      'USA Olympic Trials Qualifier',
    ],
  },
  {
    name: 'Isabella Flores',
    email: 'isabella.flores@nilink-demo.test',
    sport: 'Tennis',
    position: 'Singles',
    school: 'University of Miami',
    instagramFollowers: 241_000,
    tiktokFollowers: 501_000,
    bio:
      'Isabella combines aggressive baseline play with academic excellence. She’s known for stylish matchday content and advocacy for Latina athletes.',
    currentYear: 'Sophomore',
    hometown: 'Miami, Florida',
    major: 'International Relations',
    achievements: [
      'ITA Singles Top 10 Ranking',
      'ACC Singles Champion',
      'NCAA Sweet 16 Singles Appearance',
      '2x All-ACC Team',
      'USTA Collegiate Invitational Winner',
    ],
  },
  {
    name: 'Marcus Lee',
    email: 'marcus.lee@nilink-demo.test',
    sport: 'Wrestling',
    position: '165-pound Division',
    school: 'Penn State University',
    instagramFollowers: 96_000,
    tiktokFollowers: 220_000,
    bio:
      'Marcus is a relentless competitor in the 165-pound division, praised for technical precision and motivational content around discipline and resilience.',
    currentYear: 'Senior',
    hometown: 'Columbus, Ohio',
    major: 'Kinesiology',
    achievements: [
      'NCAA National Champion',
      '3x Big Ten Champion',
      'U.S. Open Collegiate Gold Medalist',
      'Penn State Team MVP',
      '120+ Career Wins',
    ],
  },
  {
    name: 'Ava Richardson',
    email: 'ava.richardson@nilink-demo.test',
    sport: 'Gymnastics',
    position: 'All-Around',
    school: 'University of Florida',
    instagramFollowers: 388_000,
    tiktokFollowers: 770_000,
    bio:
      'Ava is an energetic all-around gymnast whose viral routines and behind-the-scenes training clips have made her a fan favorite nationally.',
    currentYear: 'Junior',
    hometown: 'Charlotte, North Carolina',
    major: 'Media Studies',
    achievements: [
      'NCAA All-Around Champion',
      'SEC Gymnast of the Year',
      'Perfect 10 on Floor Exercise',
      '3x First-Team All-American',
      'USA National Team Alternate',
    ],
  },
  {
    name: 'Daniel Kim',
    email: 'daniel.kim@nilink-demo.test',
    sport: 'Golf',
    position: 'Golfer',
    school: 'Arizona State University',
    instagramFollowers: 118_000,
    tiktokFollowers: 260_000,
    bio:
      'Daniel is a composed golfer with a precision short game and a growing audience for golf tutorials, tournament travel, and balancing academics with competition.',
    currentYear: 'Senior',
    hometown: 'Seattle, Washington',
    major: 'Finance',
    achievements: [
      'NCAA Individual Champion',
      'Pac-12 Golfer of the Year',
      'Walker Cup Team Selection',
      '5 Collegiate Tournament Wins',
      'School Record Lowest Scoring Average',
    ],
  },
];

const schoolDomains = {
  'University of Oregon': 'uoregon.edu',
  'Duke University': 'duke.edu',
  'Stanford University': 'stanford.edu',
  'University of Alabama': 'ua.edu',
  UCLA: 'ucla.edu',
  'University of Texas': 'utexas.edu',
  'University of Miami': 'miami.edu',
  'Penn State University': 'psu.edu',
  'University of Florida': 'ufl.edu',
  'Arizona State University': 'asu.edu',
};

const graduationYears = {
  Freshman: 2029,
  Sophomore: 2028,
  Junior: 2027,
  Senior: 2026,
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
}

function splitHometown(hometown) {
  const [city = '', state = ''] = hometown.split(',').map((part) => part.trim());
  return { city, state };
}

function engagementFor(index, platform) {
  const base = platform === 'instagram' ? 4.6 : 6.1;
  return Number((base + (index % 4) * 0.35).toFixed(2));
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function getOrCreateDemoUser(athlete) {
  const existing = await findUserByEmail(athlete.email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: athlete.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: athlete.name,
      role: 'athlete',
      demo_seed: true,
    },
  });

  if (error) throw error;
  return data.user;
}

async function seedAthlete(athlete, index) {
  const user = await getOrCreateDemoUser(athlete);
  const { city, state } = splitHometown(athlete.hometown);
  const domain = schoolDomains[athlete.school] || 'example.edu';
  const handle = slugify(athlete.name);

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: athlete.email,
      full_name: athlete.name,
      role: 'athlete',
      country: 'United States',
      city,
      state,
      hometown: athlete.hometown,
      bio: athlete.bio,
      availability_status: 'available',
      verified: true,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileError) throw profileError;

  const { error: sportError } = await supabase.from('athlete_sports').upsert(
    {
      athlete_id: user.id,
      sport: athlete.sport,
      position: athlete.position,
      is_primary: true,
    },
    { onConflict: 'athlete_id,sport' }
  );
  if (sportError) throw sportError;

  const { error: academicsError } = await supabase.from('athlete_academics').upsert(
    {
      athlete_id: user.id,
      school: athlete.school,
      school_domain: domain,
      school_email: `${handle}@${domain}`,
      school_email_verified: true,
      school_email_verified_at: new Date().toISOString(),
      major: athlete.major,
      current_year: athlete.currentYear,
      graduation_year: graduationYears[athlete.currentYear] || 2027,
      eligibility_status: 'Active',
      eligibility_years: athlete.currentYear === 'Senior' ? 1 : athlete.currentYear === 'Junior' ? 2 : 3,
      id_verified: true,
      nil_disclosure_required: true,
    },
    { onConflict: 'athlete_id' }
  );
  if (academicsError) throw academicsError;

  const { error: socialsError } = await supabase.from('athlete_socials').upsert(
    {
      athlete_id: user.id,
      instagram: `@${handle}`,
      instagram_followers: athlete.instagramFollowers,
      instagram_engagement: engagementFor(index, 'instagram'),
      instagram_avg_likes: Math.round(athlete.instagramFollowers * 0.045),
      tiktok: `@${handle}`,
      tiktok_followers: athlete.tiktokFollowers,
      tiktok_engagement: engagementFor(index, 'tiktok'),
      tiktok_avg_views: Math.round(athlete.tiktokFollowers * 0.62),
      engagement_rate: Number(((engagementFor(index, 'instagram') + engagementFor(index, 'tiktok')) / 2).toFixed(2)),
      posts_per_month: 12 + (index % 5) * 3,
      total_views: Math.round(athlete.tiktokFollowers * 7.5),
      estimated_impressions: Math.round((athlete.instagramFollowers + athlete.tiktokFollowers) * 3.25),
    },
    { onConflict: 'athlete_id' }
  );
  if (socialsError) throw socialsError;

  const { error: deleteAchievementsError } = await supabase
    .from('athlete_achievements')
    .delete()
    .eq('athlete_id', user.id);
  if (deleteAchievementsError) throw deleteAchievementsError;

  const { error: achievementError } = await supabase.from('athlete_achievements').insert(
    athlete.achievements.map((title, displayOrder) => ({
      athlete_id: user.id,
      title,
      year: 2026,
      display_order: displayOrder,
    }))
  );
  if (achievementError) throw achievementError;

  return { id: user.id, email: athlete.email, name: athlete.name };
}

console.log(`Seeding ${athletes.length} demo athletes...`);
console.log(`Demo password: ${DEMO_PASSWORD}`);

const results = [];
for (const [index, athlete] of athletes.entries()) {
  const result = await seedAthlete(athlete, index);
  results.push(result);
  console.log(`✓ ${result.name} (${result.email})`);
}

console.log('\nDone. Demo athlete login emails:');
for (const result of results) {
  console.log(`- ${result.email}`);
}
