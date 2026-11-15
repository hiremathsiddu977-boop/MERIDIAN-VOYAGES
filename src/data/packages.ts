import santoriniImg from '../assets/images/pkg_santorini_caldera_1794754249979.jpg';
import kyotoImg from '../assets/images/pkg_kyoto_sanctuary_1794754249087.jpg';
import swissAlpsImg from '../assets/images/pkg_swiss_alps_1794754250871.jpg';
import baliImg from '../assets/images/pkg_bali_cliffside_1794754250805.jpg';
import icelandImg from '../assets/images/pkg_iceland_aurora_1794754251070.jpg';
import amalfiImg from '../assets/images/pkg_amalfi_coast_1794754251768.jpg';

import santoriniCatamaranImg from '../assets/images/day_santorini_catamaran_1794758295098.jpg';
import santoriniVineyardImg from '../assets/images/day_santorini_vineyard_1794758296246.jpg';
import santoriniTrailImg from '../assets/images/day_santorini_trail_1794758296465.jpg';

import kyotoBambooImg from '../assets/images/day_kyoto_bamboo_1794758296653.jpg';
import kyotoTeahouseImg from '../assets/images/day_kyoto_teahouse_1794758297597.jpg';
import kyotoOnsenImg from '../assets/images/day_kyoto_onsen_1794758297609.jpg';

import swissStMoritzImg from '../assets/images/day_swiss_stmoritz_1794758298585.jpg';
import swissGornergratImg from '../assets/images/day_swiss_gornergrat_1794758299726.jpg';
import swissChaletSpaImg from '../assets/images/day_swiss_chalet_spa_1794758299213.jpg';

import baliTerracesImg from '../assets/images/day_bali_terraces_1794758299763.jpg';
import baliBaturImg from '../assets/images/day_bali_batur_1794758300500.jpg';
import baliUluwatuImg from '../assets/images/day_bali_uluwatu_1794758300651.jpg';

import icelandLagoonImg from '../assets/images/day_iceland_lagoon_1794758301291.jpg';
import icelandGullfossImg from '../assets/images/day_iceland_gullfoss_1794758301081.jpg';
import icelandIcecaveImg from '../assets/images/day_iceland_icecave_1794758301658.jpg';

import amalfiCapriImg from '../assets/images/day_amalfi_capri_1794758302079.jpg';
import amalfiRavelloImg from '../assets/images/day_amalfi_ravello_1794758302497.jpg';
import amalfiNeranoImg from '../assets/images/day_amalfi_nerano_1794758303745.jpg';

export type Region =
  | 'Europe'
  | 'Asia'
  | 'Nordics'
  | 'Americas'
  | 'Africa & Middle East'
  | 'Oceania';

export const AVAILABLE_REGIONS: Region[] = [
  'Europe',
  'Asia',
  'Nordics',
  'Americas',
  'Africa & Middle East',
  'Oceania',
];

export interface ItineraryDay {
  day: string;
  title: string;
  detail: string;
  image?: string;
}

export interface TravelPackage {
  id?: number;
  isCustom?: boolean;
  slug: string;
  title: string;
  location: string;
  country: string;
  region: Region;
  days: number;
  nights: number;
  maxGuests: number;
  basePrice: number;
  privateUpgrade: number;
  season: string;
  rating: string;
  summary: string;
  image: string;
  highlights: string[];
  included: string[];
  departures: string[];
  itinerary: ItineraryDay[];
}

export const TRAVEL_PACKAGES: TravelPackage[] = [
  {
    slug: 'santorini-caldera-escape',
    title: 'Santorini Caldera Escape',
    location: 'Oia & Imerovigli',
    country: 'Greece',
    region: 'Europe',
    days: 6,
    nights: 5,
    maxGuests: 8,
    basePrice: 2890,
    privateUpgrade: 740,
    season: 'May – October',
    rating: '4.9',
    summary: 'Cliffside infinity suites in Oia with private sunset catamaran sailing across volcanic hot springs.',
    image: santoriniImg,
    highlights: [
      'Private sunset catamaran charter across the caldera and Red Beach',
      'Volcanic vineyard tasting hosted by a third-generation winemaker',
      'Cliffside plunge-pool suites reserved exclusively in quiet Oia',
      'Dedicated port and airport chauffeur transfers'
    ],
    included: [
      '5 nights cliffside boutique suite with caldera views',
      'Daily Aegean terrace breakfast and two sommelier dinners',
      'Private half-day Lagoon 450 catamaran charter',
      '24/7 local host & private island transfers'
    ],
    departures: ['May 14, 2027', 'Jun 18, 2027', 'Sep 10, 2027', 'Oct 08, 2027'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Arrival in Oia',
        detail: 'Private transfer from Thira Airport to your caldera suite, followed by welcome sunset aperitifs.',
        image: santoriniImg,
      },
      {
        day: 'Day 02',
        title: 'Volcanic Coastline Sail',
        detail: 'Full afternoon aboard a private catamaran stopping at White Beach, Nea Kameni springs, and Thirassia.',
        image: santoriniCatamaranImg,
      },
      {
        day: 'Day 03',
        title: 'Ancient Akrotiri & Vineyards',
        detail: 'Guided morning visit to Akrotiri ruins and afternoon Assyrtiko tasting at a cliffside estate.',
        image: santoriniVineyardImg,
      },
      {
        day: 'Day 04',
        title: 'Pyrgos & Cliff Trail',
        detail: 'Leisurely morning walk from Fira to Oia along the rim with reserved lunch overlooking Skaros Rock.',
        image: santoriniTrailImg,
      },
      {
        day: 'Day 05',
        title: 'Aegean Leisure & Farewell',
        detail: 'Unscheduled day by your plunge pool and final multi-course cliffside dinner at dusk.',
        image: santoriniImg,
      },
      {
        day: 'Day 06',
        title: 'Departure',
        detail: 'Private chauffeur transfer to Thira Airport or ferry port.',
        image: santoriniTrailImg,
      }
    ]
  },
  {
    slug: 'kyoto-autumn-sanctuary',
    title: 'Kyoto Autumn Sanctuary',
    location: 'Arashiyama & Higashiyama',
    country: 'Japan',
    region: 'Asia',
    days: 7,
    nights: 6,
    maxGuests: 6,
    basePrice: 3650,
    privateUpgrade: 920,
    season: 'October – December',
    rating: '5.0',
    summary: 'Early-access temple gardens, private cedar ryokan baths, and kaiseki dining framed by crimson maples.',
    image: kyotoImg,
    highlights: [
      'Before-hours entry to tranquil mossy Zen gardens in Arashiyama',
      'Private tea ceremony inside a 17th-century Machiya townhouse',
      'Two nights in a cedar onsen ryokan with mineral spring baths',
      'Green-car Shinkansen rail passes and Kyoto station escort'
    ],
    included: [
      '6 nights across luxury Higashiyama hotel and traditional ryokan',
      'Daily breakfast and three seasonal multi-course kaiseki dinners',
      'Private cultural historian for three full days',
      'Airport rail transfers and luggage forwarding service'
    ],
    departures: ['Oct 22, 2027', 'Nov 05, 2027', 'Nov 19, 2027', 'Dec 03, 2027'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Kyoto Welcome',
        detail: 'Station meet-and-greet and evening lantern stroll through Gion backstreets.',
        image: kyotoImg,
      },
      {
        day: 'Day 02',
        title: 'Dawn in Arashiyama',
        detail: 'Sunrise bamboo grove walk before crowds arrive, followed by Tenryu-ji gardens.',
        image: kyotoBambooImg,
      },
      {
        day: 'Day 03',
        title: 'Craft & Tea Ceremony',
        detail: 'Private Uji matcha whisking session and ceramic studio visit in Kiyomizu.',
        image: kyotoTeahouseImg,
      },
      {
        day: 'Day 04',
        title: 'Northern Mountain Temples',
        detail: 'Autumn foliage circuit through Kurama and Kifune with riverside kaiseki lunch.',
        image: kyotoImg,
      },
      {
        day: 'Day 05',
        title: 'Onsen Ryokan Retreat',
        detail: 'Check into your private open-air cedar bath suite with evening seasonal banquet.',
        image: kyotoOnsenImg,
      },
      {
        day: 'Day 06',
        title: 'Nara Excursion',
        detail: 'Morning express train to Todai-ji and Kasuga Taisha lantern paths.',
        image: kyotoBambooImg,
      },
      {
        day: 'Day 07',
        title: 'Departure',
        detail: 'Seamless luggage dispatch and Shinkansen transfer to Tokyo or Kansai Airport.',
        image: kyotoTeahouseImg,
      }
    ]
  },
  {
    slug: 'swiss-alps-glacier-express',
    title: 'Swiss Alps Glacier Express',
    location: 'Zermatt & St. Moritz',
    country: 'Switzerland',
    region: 'Europe',
    days: 5,
    nights: 4,
    maxGuests: 10,
    basePrice: 3420,
    privateUpgrade: 850,
    season: 'Year-Round',
    rating: '4.9',
    summary: 'First-class panoramic rail crossing 291 bridges into car-free Zermatt beneath the Matterhorn.',
    image: swissAlpsImg,
    highlights: [
      'Excellence Class panoramic seats aboard the Glacier Express',
      'Sunrise Gornergrat cogwheel climb facing the Matterhorn peak',
      'Ski-in alpine chalet suites with cedar spa and glacier views',
      'Curated Swiss fondue and Valais wine pairing evening'
    ],
    included: [
      '4 nights in 5-star alpine lodges in Zermatt and St. Moritz',
      'First-class Swiss Travel Pass and reserved Glacier Express seats',
      'Gornergrat mountain railway excursion tickets',
      'Daily alpine breakfast and five-course train dining'
    ],
    departures: ['Jun 12, 2027', 'Jul 24, 2027', 'Sep 18, 2027', 'Dec 11, 2027'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Zurich to St. Moritz',
        detail: 'Scenic lakeside rail transfer into the Engadin valley and spa check-in.',
        image: swissStMoritzImg,
      },
      {
        day: 'Day 02',
        title: 'Glacier Express Crossing',
        detail: 'Eight-hour panoramic journey across the Landwasser Viaduct and Oberalp Pass into Zermatt.',
        image: swissAlpsImg,
      },
      {
        day: 'Day 03',
        title: 'Matterhorn Sunrise',
        detail: 'Morning Gornergrat ridge ascent to 3,089m with guided alpine ridge walk.',
        image: swissGornergratImg,
      },
      {
        day: 'Day 04',
        title: 'Alpine Village & Spa',
        detail: 'Optional glacier paradise cable car or afternoon thermal wellness overlooking the valley.',
        image: swissChaletSpaImg,
      },
      {
        day: 'Day 05',
        title: 'Return Transfer',
        detail: 'Direct rail transfer back to Zurich or Geneva Airport.',
        image: swissStMoritzImg,
      }
    ]
  },
  {
    slug: 'bali-ubud-cliffside-retreat',
    title: 'Bali Ubud Cliffside Retreat',
    location: 'Ubud & Uluwatu',
    country: 'Indonesia',
    region: 'Asia',
    days: 7,
    nights: 6,
    maxGuests: 8,
    basePrice: 2480,
    privateUpgrade: 620,
    season: 'April – October',
    rating: '4.9',
    summary: 'Cantilevered bamboo jungle villas above the Ayung River paired with Uluwatu coastal cliff sunsets.',
    image: baliImg,
    highlights: [
      'Private infinity-edge bamboo villa overlooking emerald river gorges',
      'Guided dawn hike across Mount Batur volcanic ridge',
      'Traditional Balinese sound-healing and riverside spa ritual',
      'Clifftop seafood grill above Uluwatu surf breaks'
    ],
    included: [
      '4 nights Ubud canyon villa and 2 nights Uluwatu oceanfront suite',
      'Private air-conditioned SUV with English-speaking driver all week',
      'Daily tropical breakfast and two signature spa treatments',
      'VIP fast-track arrival at Denpasar Airport'
    ],
    departures: ['May 08, 2027', 'Jun 26, 2027', 'Aug 14, 2027', 'Sep 25, 2027'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Arrival in Ubud',
        detail: 'Fast-track airport welcome and scenic drive to your Ayung gorge villa.',
        image: baliImg,
      },
      {
        day: 'Day 02',
        title: 'Tegalalang & Water Temples',
        detail: 'Sunrise rice terrace walk and private purification blessing at Tirta Empul.',
        image: baliTerracesImg,
      },
      {
        day: 'Day 03',
        title: 'Mount Batur Ridge',
        detail: 'Early morning guided volcanic summit breakfast above the clouds.',
        image: baliBaturImg,
      },
      {
        day: 'Day 04',
        title: 'Jungle Spa & Culinary Class',
        detail: 'Organic garden foraging and Balinese spice kitchen workshop.',
        image: baliImg,
      },
      {
        day: 'Day 05',
        title: 'Transfer to Uluwatu Cliffs',
        detail: 'Southward coastal transfer with sunset Kecak fire dance viewing.',
        image: baliUluwatuImg,
      },
      {
        day: 'Day 06',
        title: 'Indian Ocean Cove',
        detail: 'Private beach club cabana and farewell cliffside dinner.',
        image: baliUluwatuImg,
      },
      {
        day: 'Day 07',
        title: 'Departure',
        detail: 'Private chauffeur drop-off at Ngurah Rai International Airport.',
        image: baliTerracesImg,
      }
    ]
  },
  {
    slug: 'iceland-northern-lights-fjord',
    title: 'Iceland Northern Lights Fjord',
    location: 'Snæfellsnes & South Coast',
    country: 'Iceland',
    region: 'Nordics',
    days: 6,
    nights: 5,
    maxGuests: 8,
    basePrice: 3790,
    privateUpgrade: 890,
    season: 'September – March',
    rating: '5.0',
    summary: 'Glass-roofed fjord cabins beneath dancing emerald auroras, black-sand beaches, and geothermal lagoons.',
    image: icelandImg,
    highlights: [
      'Private aurora-chasing super-jeep expedition with astrophotographer',
      'Reserved geothermal lagoon entry away from main tourist hours',
      'Guided blue-ice glacier cave walk in Vatnajökull National Park',
      'Design-forward glass cabins facing Kirkjufell mountain'
    ],
    included: [
      '5 nights Nordic design lodges and glass-roof aurora cabins',
      'Modified 4x4 expedition vehicle and specialist driver-guide',
      'Geothermal lagoon admission and glacier crampon gear',
      'Daily Nordic breakfast and farm-to-table lamb & arctic char dinners'
    ],
    departures: ['Oct 15, 2027', 'Nov 12, 2027', 'Jan 21, 2028', 'Feb 18, 2028'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Reykjavík & Geothermal Soak',
        detail: 'Direct arrival soak in steaming mineral waters before checking into coastal suites.',
        image: icelandLagoonImg,
      },
      {
        day: 'Day 02',
        title: 'Snæfellsnes & Kirkjufell',
        detail: 'Drive past lava fields to Kirkjufellsfoss waterfall with evening aurora watch.',
        image: icelandImg,
      },
      {
        day: 'Day 03',
        title: 'Golden Circle & Geysers',
        detail: 'Gullfoss cascade, Thingvellir tectonic rift, and private greenhouse lunch.',
        image: icelandGullfossImg,
      },
      {
        day: 'Day 04',
        title: 'Black Sand & Ice Caves',
        detail: 'Walk Reynisfjara basalt columns and step inside crystalline glacial ice chambers.',
        image: icelandIcecaveImg,
      },
      {
        day: 'Day 05',
        title: 'Fjord Aurora Hunt',
        detail: 'Night super-jeep outing tracking clear dark-sky corridors for northern lights.',
        image: icelandImg,
      },
      {
        day: 'Day 06',
        title: 'Keflavík Departure',
        detail: 'Morning coastal drive back to Keflavík International Airport.',
        image: icelandLagoonImg,
      }
    ]
  },
  {
    slug: 'amalfi-coast-private-charter',
    title: 'Amalfi Coast Private Charter',
    location: 'Positano & Ravello',
    country: 'Italy',
    region: 'Europe',
    days: 5,
    nights: 4,
    maxGuests: 6,
    basePrice: 3240,
    privateUpgrade: 790,
    season: 'May – October',
    rating: '4.9',
    summary: 'Wooden Riva boat cruising from Positano to Capri paired with lemon-grove terraces in Ravello.',
    image: amalfiImg,
    highlights: [
      'Full-day classic Riva Aquarama yacht charter to Capri and Nerano',
      'Private cliffside villa terraces above Positano bay',
      'Ravello Villa Cimbrone gardens and cliff-edge tasting menu',
      'Chauffeured Mercedes V-Class along the Amalfi coastal drive'
    ],
    included: [
      '4 nights in historic Positano cliffside suites',
      'Full-day skippered wooden speedboat charter with fuel included',
      'Naples airport or rail private chauffeur transfers',
      'Daily coastal terrace breakfast and Ravello tasting dinner'
    ],
    departures: ['May 21, 2027', 'Jun 25, 2027', 'Jul 16, 2027', 'Sep 03, 2027'],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Naples to Positano',
        detail: 'Private coastal transfer with sunset aperitivo overlooking Spiaggia Grande.',
        image: amalfiImg,
      },
      {
        day: 'Day 02',
        title: 'Capri by Riva Boat',
        detail: 'Cruise past Faraglioni sea stacks with swimming stops in hidden turquoise coves.',
        image: amalfiCapriImg,
      },
      {
        day: 'Day 03',
        title: 'Ravello Heights',
        detail: 'Morning walk through lemon groves and Villa Cimbrone terrace views.',
        image: amalfiRavelloImg,
      },
      {
        day: 'Day 04',
        title: 'Amalfi & Coastal Caves',
        detail: 'Free morning for coastal boutiques and evening seaside dinner in Nerano.',
        image: amalfiNeranoImg,
      },
      {
        day: 'Day 05',
        title: 'Departure',
        detail: 'Chauffeured return to Naples Centrale station or international airport.',
        image: amalfiImg,
      }
    ]
  }
];
