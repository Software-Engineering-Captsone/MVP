/**
 * Curated fallback list of US universities used when the upstream Hipolabs
 * API is unreachable (it has intermittent 502s, especially from Vercel
 * serverless regions). Shape matches the upstream response so the hook can
 * drop it in transparently.
 *
 * Coverage focus: Power-5 NCAA, Ivy League, top D1 + D2, major state schools,
 * and well-known private institutions — the schools NIL athletes most likely
 * attend. Not exhaustive; the proxy still tries upstream first.
 */
export interface UniversityFallback {
  name: string;
  domains: string[];
  web_pages: string[];
  country: 'United States';
  alpha_two_code: 'US';
  'state-province': string | null;
}

type Entry = [name: string, domain: string, state: string | null];

const ENTRIES: Entry[] = [
  // ── Ivy League ──
  ['Harvard University', 'harvard.edu', 'Massachusetts'],
  ['Yale University', 'yale.edu', 'Connecticut'],
  ['Princeton University', 'princeton.edu', 'New Jersey'],
  ['Columbia University', 'columbia.edu', 'New York'],
  ['University of Pennsylvania', 'upenn.edu', 'Pennsylvania'],
  ['Brown University', 'brown.edu', 'Rhode Island'],
  ['Dartmouth College', 'dartmouth.edu', 'New Hampshire'],
  ['Cornell University', 'cornell.edu', 'New York'],

  // ── SEC ──
  ['University of Alabama', 'ua.edu', 'Alabama'],
  ['Auburn University', 'auburn.edu', 'Alabama'],
  ['University of Arkansas', 'uark.edu', 'Arkansas'],
  ['University of Florida', 'ufl.edu', 'Florida'],
  ['University of Georgia', 'uga.edu', 'Georgia'],
  ['University of Kentucky', 'uky.edu', 'Kentucky'],
  ['Louisiana State University', 'lsu.edu', 'Louisiana'],
  ['University of Mississippi', 'olemiss.edu', 'Mississippi'],
  ['Mississippi State University', 'msstate.edu', 'Mississippi'],
  ['University of Missouri', 'missouri.edu', 'Missouri'],
  ['University of Oklahoma', 'ou.edu', 'Oklahoma'],
  ['University of South Carolina', 'sc.edu', 'South Carolina'],
  ['University of Tennessee', 'utk.edu', 'Tennessee'],
  ['Texas A&M University', 'tamu.edu', 'Texas'],
  ['University of Texas at Austin', 'utexas.edu', 'Texas'],
  ['Vanderbilt University', 'vanderbilt.edu', 'Tennessee'],

  // ── Big Ten ──
  ['University of Illinois Urbana-Champaign', 'illinois.edu', 'Illinois'],
  ['Indiana University Bloomington', 'indiana.edu', 'Indiana'],
  ['University of Iowa', 'uiowa.edu', 'Iowa'],
  ['University of Maryland', 'umd.edu', 'Maryland'],
  ['University of Michigan', 'umich.edu', 'Michigan'],
  ['Michigan State University', 'msu.edu', 'Michigan'],
  ['University of Minnesota', 'umn.edu', 'Minnesota'],
  ['University of Nebraska–Lincoln', 'unl.edu', 'Nebraska'],
  ['Northwestern University', 'northwestern.edu', 'Illinois'],
  ['Ohio State University', 'osu.edu', 'Ohio'],
  ['University of Oregon', 'uoregon.edu', 'Oregon'],
  ['Penn State University', 'psu.edu', 'Pennsylvania'],
  ['Purdue University', 'purdue.edu', 'Indiana'],
  ['Rutgers University', 'rutgers.edu', 'New Jersey'],
  ['UCLA', 'ucla.edu', 'California'],
  ['University of Southern California', 'usc.edu', 'California'],
  ['University of Washington', 'uw.edu', 'Washington'],
  ['University of Wisconsin–Madison', 'wisc.edu', 'Wisconsin'],

  // ── ACC ──
  ['Boston College', 'bc.edu', 'Massachusetts'],
  ['California (Berkeley)', 'berkeley.edu', 'California'],
  ['Clemson University', 'clemson.edu', 'South Carolina'],
  ['Duke University', 'duke.edu', 'North Carolina'],
  ['Florida State University', 'fsu.edu', 'Florida'],
  ['Georgia Tech', 'gatech.edu', 'Georgia'],
  ['University of Louisville', 'louisville.edu', 'Kentucky'],
  ['University of Miami', 'miami.edu', 'Florida'],
  ['University of North Carolina at Chapel Hill', 'unc.edu', 'North Carolina'],
  ['NC State University', 'ncsu.edu', 'North Carolina'],
  ['University of Notre Dame', 'nd.edu', 'Indiana'],
  ['University of Pittsburgh', 'pitt.edu', 'Pennsylvania'],
  ['Stanford University', 'stanford.edu', 'California'],
  ['Syracuse University', 'syr.edu', 'New York'],
  ['University of Virginia', 'virginia.edu', 'Virginia'],
  ['Virginia Tech', 'vt.edu', 'Virginia'],
  ['Wake Forest University', 'wfu.edu', 'North Carolina'],
  ['SMU', 'smu.edu', 'Texas'],

  // ── Big 12 ──
  ['Arizona State University', 'asu.edu', 'Arizona'],
  ['University of Arizona', 'arizona.edu', 'Arizona'],
  ['Baylor University', 'baylor.edu', 'Texas'],
  ['Brigham Young University', 'byu.edu', 'Utah'],
  ['University of Central Florida', 'ucf.edu', 'Florida'],
  ['University of Cincinnati', 'uc.edu', 'Ohio'],
  ['University of Colorado Boulder', 'colorado.edu', 'Colorado'],
  ['University of Houston', 'uh.edu', 'Texas'],
  ['Iowa State University', 'iastate.edu', 'Iowa'],
  ['University of Kansas', 'ku.edu', 'Kansas'],
  ['Kansas State University', 'k-state.edu', 'Kansas'],
  ['Oklahoma State University', 'okstate.edu', 'Oklahoma'],
  ['TCU', 'tcu.edu', 'Texas'],
  ['Texas Tech University', 'ttu.edu', 'Texas'],
  ['University of Utah', 'utah.edu', 'Utah'],
  ['West Virginia University', 'wvu.edu', 'West Virginia'],

  // ── Pac-12 / Mountain West / WCC ──
  ['Oregon State University', 'oregonstate.edu', 'Oregon'],
  ['Washington State University', 'wsu.edu', 'Washington'],
  ['Boise State University', 'boisestate.edu', 'Idaho'],
  ['San Diego State University', 'sdsu.edu', 'California'],
  ['Fresno State University', 'fresnostate.edu', 'California'],
  ['Colorado State University', 'colostate.edu', 'Colorado'],
  ['UNLV', 'unlv.edu', 'Nevada'],
  ['Gonzaga University', 'gonzaga.edu', 'Washington'],
  ['Saint Mary\'s College of California', 'stmarys-ca.edu', 'California'],
  ['Pepperdine University', 'pepperdine.edu', 'California'],
  ['Loyola Marymount University', 'lmu.edu', 'California'],
  ['Santa Clara University', 'scu.edu', 'California'],
  ['University of San Diego', 'sandiego.edu', 'California'],
  ['University of San Francisco', 'usfca.edu', 'California'],

  // ── Big East ──
  ['Butler University', 'butler.edu', 'Indiana'],
  ['Creighton University', 'creighton.edu', 'Nebraska'],
  ['DePaul University', 'depaul.edu', 'Illinois'],
  ['Georgetown University', 'georgetown.edu', 'D.C.'],
  ['Marquette University', 'marquette.edu', 'Wisconsin'],
  ['Providence College', 'providence.edu', 'Rhode Island'],
  ['Seton Hall University', 'shu.edu', 'New Jersey'],
  ['St. John\'s University', 'stjohns.edu', 'New York'],
  ['Villanova University', 'villanova.edu', 'Pennsylvania'],
  ['Xavier University', 'xavier.edu', 'Ohio'],
  ['UConn', 'uconn.edu', 'Connecticut'],

  // ── American Athletic / Sun Belt / MAC / CUSA selections ──
  ['East Carolina University', 'ecu.edu', 'North Carolina'],
  ['University of Memphis', 'memphis.edu', 'Tennessee'],
  ['University of Tulsa', 'utulsa.edu', 'Oklahoma'],
  ['Wichita State University', 'wichita.edu', 'Kansas'],
  ['Tulane University', 'tulane.edu', 'Louisiana'],
  ['UAB', 'uab.edu', 'Alabama'],
  ['University of South Florida', 'usf.edu', 'Florida'],
  ['Florida Atlantic University', 'fau.edu', 'Florida'],
  ['Florida International University', 'fiu.edu', 'Florida'],
  ['Georgia Southern University', 'georgiasouthern.edu', 'Georgia'],
  ['Georgia State University', 'gsu.edu', 'Georgia'],
  ['Appalachian State University', 'appstate.edu', 'North Carolina'],
  ['Coastal Carolina University', 'coastal.edu', 'South Carolina'],
  ['James Madison University', 'jmu.edu', 'Virginia'],
  ['Old Dominion University', 'odu.edu', 'Virginia'],
  ['Marshall University', 'marshall.edu', 'West Virginia'],
  ['Liberty University', 'liberty.edu', 'Virginia'],
  ['Ball State University', 'bsu.edu', 'Indiana'],
  ['Bowling Green State University', 'bgsu.edu', 'Ohio'],
  ['Central Michigan University', 'cmich.edu', 'Michigan'],
  ['Eastern Michigan University', 'emich.edu', 'Michigan'],
  ['Kent State University', 'kent.edu', 'Ohio'],
  ['Miami University (Ohio)', 'miamioh.edu', 'Ohio'],
  ['Northern Illinois University', 'niu.edu', 'Illinois'],
  ['Ohio University', 'ohio.edu', 'Ohio'],
  ['Toledo University', 'utoledo.edu', 'Ohio'],
  ['Western Michigan University', 'wmich.edu', 'Michigan'],

  // ── Top private / national universities ──
  ['MIT', 'mit.edu', 'Massachusetts'],
  ['Caltech', 'caltech.edu', 'California'],
  ['University of Chicago', 'uchicago.edu', 'Illinois'],
  ['Johns Hopkins University', 'jhu.edu', 'Maryland'],
  ['Northeastern University', 'northeastern.edu', 'Massachusetts'],
  ['Boston University', 'bu.edu', 'Massachusetts'],
  ['New York University', 'nyu.edu', 'New York'],
  ['Carnegie Mellon University', 'cmu.edu', 'Pennsylvania'],
  ['Tufts University', 'tufts.edu', 'Massachusetts'],
  ['Emory University', 'emory.edu', 'Georgia'],
  ['Rice University', 'rice.edu', 'Texas'],
  ['Washington University in St. Louis', 'wustl.edu', 'Missouri'],
  ['Vanderbilt University', 'vanderbilt.edu', 'Tennessee'],
  ['University of Rochester', 'rochester.edu', 'New York'],
  ['Lehigh University', 'lehigh.edu', 'Pennsylvania'],
  ['Northeastern University', 'northeastern.edu', 'Massachusetts'],
  ['Case Western Reserve University', 'case.edu', 'Ohio'],
  ['American University', 'american.edu', 'D.C.'],
  ['George Washington University', 'gwu.edu', 'D.C.'],
  ['Howard University', 'howard.edu', 'D.C.'],
  ['Fordham University', 'fordham.edu', 'New York'],
  ['Stevens Institute of Technology', 'stevens.edu', 'New Jersey'],

  // ── UC system ──
  ['UC Davis', 'ucdavis.edu', 'California'],
  ['UC Irvine', 'uci.edu', 'California'],
  ['UC Merced', 'ucmerced.edu', 'California'],
  ['UC Riverside', 'ucr.edu', 'California'],
  ['UC San Diego', 'ucsd.edu', 'California'],
  ['UC Santa Barbara', 'ucsb.edu', 'California'],
  ['UC Santa Cruz', 'ucsc.edu', 'California'],

  // ── Cal State system (selection) ──
  ['Cal Poly San Luis Obispo', 'calpoly.edu', 'California'],
  ['Cal State Long Beach', 'csulb.edu', 'California'],
  ['Cal State Fullerton', 'fullerton.edu', 'California'],
  ['Cal State Northridge', 'csun.edu', 'California'],
  ['San Jose State University', 'sjsu.edu', 'California'],
  ['San Francisco State University', 'sfsu.edu', 'California'],

  // ── SUNY / CUNY ──
  ['Stony Brook University', 'stonybrook.edu', 'New York'],
  ['University at Buffalo', 'buffalo.edu', 'New York'],
  ['Binghamton University', 'binghamton.edu', 'New York'],
  ['University at Albany', 'albany.edu', 'New York'],
  ['Hunter College, CUNY', 'hunter.cuny.edu', 'New York'],
  ['Baruch College, CUNY', 'baruch.cuny.edu', 'New York'],
  ['City College of New York', 'ccny.cuny.edu', 'New York'],

  // ── Other major flagship state schools ──
  ['University of Connecticut', 'uconn.edu', 'Connecticut'],
  ['University of Delaware', 'udel.edu', 'Delaware'],
  ['University of Hawaii at Manoa', 'hawaii.edu', 'Hawaii'],
  ['University of Idaho', 'uidaho.edu', 'Idaho'],
  ['University of Maine', 'maine.edu', 'Maine'],
  ['University of Massachusetts Amherst', 'umass.edu', 'Massachusetts'],
  ['University of Montana', 'umt.edu', 'Montana'],
  ['Montana State University', 'montana.edu', 'Montana'],
  ['University of Nevada, Reno', 'unr.edu', 'Nevada'],
  ['University of New Hampshire', 'unh.edu', 'New Hampshire'],
  ['University of New Mexico', 'unm.edu', 'New Mexico'],
  ['New Mexico State University', 'nmsu.edu', 'New Mexico'],
  ['University of North Dakota', 'und.edu', 'North Dakota'],
  ['North Dakota State University', 'ndsu.edu', 'North Dakota'],
  ['University of Rhode Island', 'uri.edu', 'Rhode Island'],
  ['University of South Dakota', 'usd.edu', 'South Dakota'],
  ['South Dakota State University', 'sdstate.edu', 'South Dakota'],
  ['University of Vermont', 'uvm.edu', 'Vermont'],
  ['University of Wyoming', 'uwyo.edu', 'Wyoming'],
  ['University of Alaska Fairbanks', 'uaf.edu', 'Alaska'],
  ['University of Alaska Anchorage', 'uaa.alaska.edu', 'Alaska'],

  // ── Major North Carolina / Texas / Florida regional ──
  ['University of North Carolina at Charlotte', 'charlotte.edu', 'North Carolina'],
  ['UNC Greensboro', 'uncg.edu', 'North Carolina'],
  ['UNC Wilmington', 'uncw.edu', 'North Carolina'],
  ['North Carolina A&T State University', 'ncat.edu', 'North Carolina'],
  ['UT Dallas', 'utdallas.edu', 'Texas'],
  ['UT Arlington', 'uta.edu', 'Texas'],
  ['UT San Antonio', 'utsa.edu', 'Texas'],
  ['Texas State University', 'txstate.edu', 'Texas'],
  ['Sam Houston State University', 'shsu.edu', 'Texas'],
  ['University of North Texas', 'unt.edu', 'Texas'],
  ['Florida A&M University', 'famu.edu', 'Florida'],
  ['Stetson University', 'stetson.edu', 'Florida'],

  // ── HBCUs (selection) ──
  ['Spelman College', 'spelman.edu', 'Georgia'],
  ['Morehouse College', 'morehouse.edu', 'Georgia'],
  ['Hampton University', 'hamptonu.edu', 'Virginia'],
  ['Tuskegee University', 'tuskegee.edu', 'Alabama'],
  ['Jackson State University', 'jsums.edu', 'Mississippi'],
  ['Norfolk State University', 'nsu.edu', 'Virginia'],
  ['Tennessee State University', 'tnstate.edu', 'Tennessee'],
  ['Prairie View A&M University', 'pvamu.edu', 'Texas'],
  ['Grambling State University', 'gram.edu', 'Louisiana'],
  ['Southern University', 'subr.edu', 'Louisiana'],

  // ── Liberal Arts / NESCAC (NIL-eligible D3 schools that come up) ──
  ['Amherst College', 'amherst.edu', 'Massachusetts'],
  ['Williams College', 'williams.edu', 'Massachusetts'],
  ['Bowdoin College', 'bowdoin.edu', 'Maine'],
  ['Middlebury College', 'middlebury.edu', 'Vermont'],
  ['Wesleyan University', 'wesleyan.edu', 'Connecticut'],
  ['Trinity College', 'trincoll.edu', 'Connecticut'],
  ['Hamilton College', 'hamilton.edu', 'New York'],
  ['Bates College', 'bates.edu', 'Maine'],
  ['Colby College', 'colby.edu', 'Maine'],
  ['Tufts University', 'tufts.edu', 'Massachusetts'],
  ['Pomona College', 'pomona.edu', 'California'],
  ['Claremont McKenna College', 'cmc.edu', 'California'],
  ['Harvey Mudd College', 'hmc.edu', 'California'],
  ['Swarthmore College', 'swarthmore.edu', 'Pennsylvania'],
  ['Haverford College', 'haverford.edu', 'Pennsylvania'],
  ['Bryn Mawr College', 'brynmawr.edu', 'Pennsylvania'],
  ['Wellesley College', 'wellesley.edu', 'Massachusetts'],
  ['Smith College', 'smith.edu', 'Massachusetts'],
  ['Mount Holyoke College', 'mtholyoke.edu', 'Massachusetts'],
  ['Vassar College', 'vassar.edu', 'New York'],
  ['Barnard College', 'barnard.edu', 'New York'],
];

// Deduplicate by lowercased name (since some entries appear in multiple confs).
const seen = new Set<string>();
export const UNIVERSITIES_FALLBACK: UniversityFallback[] = ENTRIES.filter(([name]) => {
  const k = name.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
})
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, domain, state]) => ({
    name,
    domains: [domain],
    web_pages: [`https://${domain}`],
    country: 'United States',
    alpha_two_code: 'US',
    'state-province': state,
  }));
