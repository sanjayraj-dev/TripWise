import type { Sql } from "@/lib/db";

export const BOARD_USER_ID = "tripwise-board";

function shift(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type SeedActivity = {
  title: string;
  day: number;
  start: string;
  end: string;
  description: string;
};

type SeedStop = {
  city: string;
  country: string;
  start: number;
  end: number;
  notes: string;
  stay?: {
    propertyName: string;
    address: string;
    checkIn: number;
    checkOut: number;
    bookingRef: string;
    contact: string;
  };
  activities: SeedActivity[];
};

type SeedTrip = {
  title: string;
  summary: string;
  start: number;
  end: number;
  budget: number;
  currency: string;
  cover: string;
  maxCompanions: number;
  destinations: SeedStop[];
  expenses: { category: string; amount: number; day: number; note: string; city: string }[];
  notes: { title: string; body: string }[];
  packing: { name: string; packed: boolean; slot: string }[];
};

const SEED: SeedTrip[] = [
  {
    title: "Kyoto Spring",
    summary:
      "Cherry-blossom week through Fushimi Inari, Arashiyama, and quiet temple gardens. Slow mornings, night walks, and a shared kaiseki dinner.",
    start: 14,
    end: 21,
    budget: 185000,
    currency: "INR",
    cover: "/covers/kyoto.jpg",
    maxCompanions: 6,
    destinations: [
      {
        city: "Kyoto",
        country: "Japan",
        start: 14,
        end: 19,
        notes: "Base in Gion. Walk before 8am to beat the crowds.",
        stay: {
          propertyName: "Gion House Inn",
          address: "Higashiyama, Kyoto",
          checkIn: 14,
          checkOut: 19,
          bookingRef: "GH-4418",
          contact: "+81 75 000 4418",
        },
        activities: [
          {
            title: "Fushimi Inari at dawn",
            day: 15,
            start: "06:00",
            end: "09:00",
            description: "Climb the torii tunnel before tour groups arrive.",
          },
          {
            title: "Arashiyama bamboo & river",
            day: 16,
            start: "09:30",
            end: "14:00",
            description: "Bamboo grove, then lunch by the Hozu river.",
          },
          {
            title: "Kaiseki dinner",
            day: 17,
            start: "18:30",
            end: "21:00",
            description: "Shared reservation — 6 seats. Dietary notes in the trip notes.",
          },
        ],
      },
      {
        city: "Nara",
        country: "Japan",
        start: 19,
        end: 21,
        notes: "Day trip plus one night. Feed deer only the crackers sold on site.",
        stay: {
          propertyName: "Nara Park Lodge",
          address: "Noborioji, Nara",
          checkIn: 19,
          checkOut: 21,
          bookingRef: "NPL-19",
          contact: "+81 742 000 119",
        },
        activities: [
          {
            title: "Todai-ji & park walk",
            day: 20,
            start: "09:00",
            end: "13:00",
            description: "Great Buddha hall, then picnic in the park.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Transport", amount: 42000, day: 14, note: "Flights split later", city: "Kyoto" },
      { category: "Lodging", amount: 38000, day: 14, note: "Gion inn deposit", city: "Kyoto" },
      { category: "Food", amount: 9000, day: 17, note: "Kaiseki deposit", city: "Kyoto" },
    ],
    notes: [
      {
        title: "Group pact",
        body: "No suitcase larger than a carry-on. Split dinners equally. Quiet hours after 22:00 in the inn.",
      },
    ],
    packing: [
      { name: "Passport", packed: true, slot: "documents" },
      { name: "JR Pass printout", packed: false, slot: "documents" },
      { name: "Light rain jacket", packed: false, slot: "clothes" },
      { name: "Comfortable walking shoes", packed: true, slot: "gear" },
    ],
  },
  {
    title: "Himalayan High Road",
    summary:
      "Manali to Leh in a shared tempo. High passes, monastery mornings, and one rest day for altitude. Need 2 more drivers comfortable with mountain roads.",
    start: 6,
    end: 18,
    budget: 92000,
    currency: "INR",
    cover: "/covers/himalaya.jpg",
    maxCompanions: 5,
    destinations: [
      {
        city: "Manali",
        country: "India",
        start: 6,
        end: 8,
        notes: "Acclimatise. Buy snacks for the long drive.",
        stay: {
          propertyName: "Pine Rest Homestay",
          address: "Old Manali",
          checkIn: 6,
          checkOut: 8,
          bookingRef: "PR-662",
          contact: "+91 98000 00062",
        },
        activities: [
          {
            title: "Old Manali walk",
            day: 7,
            start: "16:00",
            end: "18:30",
            description: "Easy walk, tea, early night.",
          },
        ],
      },
      {
        city: "Leh",
        country: "India",
        start: 10,
        end: 18,
        notes: "No exertion on the first full day. Diamox discussion in notes.",
        stay: {
          propertyName: "Changspa Courtyard",
          address: "Changspa, Leh",
          checkIn: 10,
          checkOut: 18,
          bookingRef: "CC-110",
          contact: "+91 94190 00110",
        },
        activities: [
          {
            title: "Rest & market",
            day: 11,
            start: "10:00",
            end: "13:00",
            description: "Hydrate. Short market loop only.",
          },
          {
            title: "Pangong day",
            day: 14,
            start: "05:00",
            end: "20:00",
            description: "Shared Innova. Leave extra layers in the car.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Transport", amount: 18000, day: 6, note: "Tempo Traveller share", city: "Manali" },
      { category: "Lodging", amount: 14000, day: 10, note: "Leh courtyard 8 nights", city: "Leh" },
      { category: "Fees", amount: 4000, day: 8, note: "Inner line permits", city: "Leh" },
    ],
    notes: [
      {
        title: "Altitude",
        body: "Drink 4 litres a day. No alcohol until day 4 in Leh. If headache + nausea, skip Pangong.",
      },
    ],
    packing: [
      { name: "Down jacket", packed: true, slot: "clothes" },
      { name: "Diamox", packed: false, slot: "health" },
      { name: "Sunscreen SPF 50", packed: false, slot: "health" },
      { name: "Power bank", packed: true, slot: "gear" },
    ],
  },
  {
    title: "Lisbon & Porto",
    summary:
      "Trams, miradouros, and a slow train north. Two apartments, one shared grocery budget, evenings on rooftops. Join if you like walking cities more than beach clubs.",
    start: -2,
    end: 8,
    budget: 2100,
    currency: "EUR",
    cover: "/covers/lisbon.jpg",
    maxCompanions: 4,
    destinations: [
      {
        city: "Lisbon",
        country: "Portugal",
        start: -2,
        end: 4,
        notes: "Alfama base. 72h Viva Viagem on the first morning.",
        stay: {
          propertyName: "Alfama Lookout Flat",
          address: "Rua das Escolas Gerais, Lisbon",
          checkIn: -2,
          checkOut: 4,
          bookingRef: "ALF-204",
          contact: "+351 21 000 0204",
        },
        activities: [
          {
            title: "Tram 28 + miradouros",
            day: -1,
            start: "09:00",
            end: "13:00",
            description: "Ride early, walk downhill through Alfama.",
          },
          {
            title: "Belém pastry run",
            day: 1,
            start: "08:30",
            end: "12:00",
            description: "Pastéis, Jerónimos exterior, waterfront.",
          },
        ],
      },
      {
        city: "Porto",
        country: "Portugal",
        start: 4,
        end: 8,
        notes: "Cross the river for sunset. Book the cellar tour together.",
        stay: {
          propertyName: "Ribeira Studio",
          address: "Cais da Ribeira, Porto",
          checkIn: 4,
          checkOut: 8,
          bookingRef: "RIB-88",
          contact: "+351 22 000 0088",
        },
        activities: [
          {
            title: "Port cellar tour",
            day: 5,
            start: "16:00",
            end: "18:00",
            description: "Vila Nova de Gaia. 4 tickets held until Friday.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Lodging", amount: 640, day: -2, note: "Lisbon flat split 4 ways", city: "Lisbon" },
      { category: "Transport", amount: 180, day: 4, note: "Train to Porto", city: "Porto" },
      { category: "Food", amount: 95, day: 0, note: "Shared grocery haul", city: "Lisbon" },
    ],
    notes: [
      {
        title: "House rules",
        body: "Shoes off in both flats. Quiet after 23:00. Split groceries in the expense tab the same night.",
      },
    ],
    packing: [
      { name: "EU adapter", packed: true, slot: "gear" },
      { name: "Light sweater", packed: true, slot: "clothes" },
      { name: "Travel insurance card", packed: false, slot: "documents" },
    ],
  },
  {
    title: "Kerala Backwaters",
    summary:
      "A houseboat from Alleppey plus two nights in Fort Kochi. Vegetarian kitchen, sunset deck, and a spice-market morning. Two bunks still open.",
    start: 28,
    end: 35,
    budget: 64000,
    currency: "INR",
    cover: "/covers/kerala.jpg",
    maxCompanions: 6,
    destinations: [
      {
        city: "Alappuzha",
        country: "India",
        start: 28,
        end: 31,
        notes: "Houseboat sleeps 6. Mosquito coils already on board.",
        stay: {
          propertyName: "Meera Houseboat",
          address: "Finishing Point, Alappuzha",
          checkIn: 28,
          checkOut: 31,
          bookingRef: "MHB-28",
          contact: "+91 98470 00028",
        },
        activities: [
          {
            title: "Cruise & village canal",
            day: 29,
            start: "07:00",
            end: "18:00",
            description: "Slow cruise, lunch on deck, village stop.",
          },
        ],
      },
      {
        city: "Kochi",
        country: "India",
        start: 31,
        end: 35,
        notes: "Stay inside the Fort. Chinese fishing nets at dusk.",
        stay: {
          propertyName: "Jew Town Heritage Stay",
          address: "Mattancherry, Kochi",
          checkIn: 31,
          checkOut: 35,
          bookingRef: "JT-311",
          contact: "+91 484 000 0311",
        },
        activities: [
          {
            title: "Fort Kochi walk",
            day: 32,
            start: "17:00",
            end: "20:00",
            description: "Nets, Santa Cruz, dinner on the parade ground.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Lodging", amount: 24000, day: 28, note: "Houseboat 3N", city: "Alappuzha" },
      { category: "Food", amount: 4500, day: 29, note: "Onboard meals", city: "Alappuzha" },
    ],
    notes: [
      {
        title: "What to leave behind",
        body: "No hard suitcases on the boat. Soft bags only. Bring reef-safe sunscreen.",
      },
    ],
    packing: [
      { name: "Soft duffel", packed: false, slot: "gear" },
      { name: "Cotton shirts x4", packed: false, slot: "clothes" },
      { name: "Mosquito repellent", packed: true, slot: "health" },
    ],
  },
  {
    title: "Iceland Ring",
    summary:
      "A clockwise loop from Reykjavík: south coast waterfalls, glacier lagoon, then the north. One 9-seater still has 3 empty seats. Winter tyres already booked.",
    start: 42,
    end: 54,
    budget: 3200,
    currency: "EUR",
    cover: "/covers/iceland.jpg",
    maxCompanions: 6,
    destinations: [
      {
        city: "Reykjavík",
        country: "Iceland",
        start: 42,
        end: 44,
        notes: "Collect the car at KEF. Grocery run at Bónus before leaving town.",
        stay: {
          propertyName: "Harbour Loft",
          address: "Grandagarður, Reykjavík",
          checkIn: 42,
          checkOut: 44,
          bookingRef: "HL-42",
          contact: "+354 555 0042",
        },
        activities: [
          {
            title: "City walk & groceries",
            day: 43,
            start: "11:00",
            end: "16:00",
            description: "Hallgrímskirkja, then a big shop for the ring.",
          },
        ],
      },
      {
        city: "Vík",
        country: "Iceland",
        start: 44,
        end: 47,
        notes: "Black sand, basalt stacks, and Skógafoss on the way in.",
        stay: {
          propertyName: "South Coast Cabin",
          address: "Vík í Mýrdal",
          checkIn: 44,
          checkOut: 47,
          bookingRef: "SCC-44",
          contact: "+354 555 0044",
        },
        activities: [
          {
            title: "Reynisfjara & Dyrhólaey",
            day: 45,
            start: "09:00",
            end: "14:00",
            description: "Stay well back from sneaker waves.",
          },
        ],
      },
      {
        city: "Jökulsárlón",
        country: "Iceland",
        start: 47,
        end: 49,
        notes: "Lagoon and diamond beach. Ice never as close as it looks.",
        stay: {
          propertyName: "Glacier View Guesthouse",
          address: "Höfn road, Jökulsárlón",
          checkIn: 47,
          checkOut: 49,
          bookingRef: "GV-47",
          contact: "+354 555 0047",
        },
        activities: [
          {
            title: "Lagoon walk",
            day: 48,
            start: "10:00",
            end: "13:00",
            description: "No boat this season — shore walk only.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Transport", amount: 980, day: 42, note: "9-seater 12 days", city: "Reykjavík" },
      { category: "Lodging", amount: 720, day: 42, note: "First three stays deposit", city: "Reykjavík" },
      { category: "Fees", amount: 140, day: 42, note: "Fuel first tank", city: "Reykjavík" },
    ],
    notes: [
      {
        title: "Driving",
        body: "No off-road. Headlights always on. Check road.is every morning before leaving.",
      },
    ],
    packing: [
      { name: "Waterproof shell", packed: false, slot: "clothes" },
      { name: "Microspikes", packed: false, slot: "gear" },
      { name: "International permit", packed: true, slot: "documents" },
    ],
  },
  {
    title: "Bali Slow Week",
    summary:
      "Ubud mornings, a temple day, and two nights by the rice terraces. Yoga optional, coffee non-negotiable. Looking for two more people who want quiet, not clubs.",
    start: 21,
    end: 28,
    budget: 78000,
    currency: "INR",
    cover: "/covers/bali.jpg",
    maxCompanions: 4,
    destinations: [
      {
        city: "Ubud",
        country: "Indonesia",
        start: 21,
        end: 28,
        notes: "Scooters only if you already ride. Otherwise Grab.",
        stay: {
          propertyName: "Campuhan Ridge Villa",
          address: "Sayan, Ubud",
          checkIn: 21,
          checkOut: 28,
          bookingRef: "CRV-21",
          contact: "+62 361 000 021",
        },
        activities: [
          {
            title: "Ridge walk at sunrise",
            day: 22,
            start: "06:00",
            end: "08:00",
            description: "Campuhan ridge, then coffee in town.",
          },
          {
            title: "Tirta Empul",
            day: 24,
            start: "08:00",
            end: "12:00",
            description: "Sarong provided. Bring a change of clothes.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Lodging", amount: 32000, day: 21, note: "Villa 7N split 4", city: "Ubud" },
      { category: "Activities", amount: 6000, day: 24, note: "Temple car + offering", city: "Ubud" },
    ],
    notes: [
      {
        title: "Respect",
        body: "Cover shoulders at temples. Ask before photographing ceremonies. Cash for offerings.",
      },
    ],
    packing: [
      { name: "Sarong", packed: false, slot: "clothes" },
      { name: "Reef-safe sunscreen", packed: false, slot: "health" },
      { name: "Light scarf", packed: true, slot: "clothes" },
    ],
  },
  {
    title: "New York Autumn",
    summary:
      "A long weekend of parks, museums, and one Broadway matinee. Apartment in the East Village. One couch and one floor mattress still free.",
    start: 10,
    end: 14,
    budget: 2400,
    currency: "USD",
    cover: "/covers/nyc.jpg",
    maxCompanions: 4,
    destinations: [
      {
        city: "New York",
        country: "United States",
        start: 10,
        end: 14,
        notes: "Met Friday morning. Walk the park Saturday. Show Sunday 15:00.",
        stay: {
          propertyName: "East Village Walk-up",
          address: "St Marks Place, Manhattan",
          checkIn: 10,
          checkOut: 14,
          bookingRef: "EV-1014",
          contact: "+1 212 000 1014",
        },
        activities: [
          {
            title: "The Met",
            day: 11,
            start: "10:00",
            end: "14:00",
            description: "Pay-what-you-wish with NY ID; others buy timed tickets.",
          },
          {
            title: "Central Park loop",
            day: 12,
            start: "09:00",
            end: "13:00",
            description: "South to north, picnic if dry.",
          },
          {
            title: "Broadway matinee",
            day: 13,
            start: "15:00",
            end: "18:00",
            description: "Four tickets held in the notes.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Lodging", amount: 980, day: 10, note: "Apartment 4N", city: "New York" },
      { category: "Activities", amount: 360, day: 13, note: "Theatre tickets", city: "New York" },
      { category: "Transport", amount: 132, day: 10, note: "AirTrain + MetroCards", city: "New York" },
    ],
    notes: [
      {
        title: "Tickets",
        body: "Broadway seats are row L. Screenshot in the packing slot for documents. MetroCards on the fridge.",
      },
    ],
    packing: [
      { name: "Warm coat", packed: false, slot: "clothes" },
      { name: "MetroCard", packed: false, slot: "documents" },
      { name: "Show tickets", packed: true, slot: "documents" },
    ],
  },
  {
    title: "Rajasthan Fort Circuit",
    summary:
      "Jaipur, Jodhpur, Jaisalmer — forts at blue hour, one desert camp, shared thali rule. Looking for two more people for the Tempo. Last year's crew said yes in spirit only.",
    start: -18,
    end: -8,
    budget: 54000,
    currency: "INR",
    cover: "/covers/rajasthan.jpg",
    maxCompanions: 6,
    destinations: [
      {
        city: "Jaipur",
        country: "India",
        start: -18,
        end: -15,
        notes: "Pink city walking day, then Amber at sunset.",
        stay: {
          propertyName: "Haveli Courtyard",
          address: "Bani Park, Jaipur",
          checkIn: -18,
          checkOut: -15,
          bookingRef: "HC-18",
          contact: "+91 141 000 0018",
        },
        activities: [
          {
            title: "Amber Fort at dusk",
            day: -17,
            start: "16:00",
            end: "19:00",
            description: "Skip the elephant. Walk or jeep up.",
          },
        ],
      },
      {
        city: "Jaisalmer",
        country: "India",
        start: -12,
        end: -8,
        notes: "Desert camp one night, fort the rest.",
        stay: {
          propertyName: "Fort View Camp",
          address: "Sam dunes road, Jaisalmer",
          checkIn: -12,
          checkOut: -8,
          bookingRef: "FVC-12",
          contact: "+91 2992 000012",
        },
        activities: [
          {
            title: "Sunset dunes",
            day: -11,
            start: "16:30",
            end: "19:30",
            description: "Camel optional. Photos from the ridge are better.",
          },
        ],
      },
    ],
    expenses: [
      { category: "Transport", amount: 16000, day: -18, note: "Tempo 10 days", city: "Jaipur" },
      { category: "Lodging", amount: 12000, day: -12, note: "Camp + haveli", city: "Jaisalmer" },
      { category: "Food", amount: 3800, day: -16, note: "Shared thalis", city: "Jaipur" },
    ],
    notes: [
      {
        title: "What we learned",
        body: "Carry a scarf for the dunes. Bargain the jeep, not the camp. Photograph forts from outside the ticket line first.",
      },
    ],
    packing: [
      { name: "Scarf", packed: true, slot: "clothes" },
      { name: "Power bank", packed: true, slot: "gear" },
      { name: "ORS sachets", packed: true, slot: "health" },
    ],
  },
];

export async function ensureBoardSeeded(sql: Sql) {
  const existing = await sql<{ id: number }>`
    select id from trips where user_id = ${BOARD_USER_ID} limit 1
  `;
  if (existing.length) return;

  await sql`
    insert into profiles (user_id, full_name, is_admin, is_active)
    values (${BOARD_USER_ID}, ${"TripWise Board"}, ${false}, ${true})
    on conflict (user_id) do nothing
  `;

  for (const trip of SEED) {
    const inserted = await sql<{ id: number }>`
      insert into trips (
        user_id, title, start_date, end_date, budget, currency,
        visibility, summary, max_companions, cover
      )
      values (
        ${BOARD_USER_ID},
        ${trip.title},
        ${shift(trip.start)},
        ${shift(trip.end)},
        ${trip.budget},
        ${trip.currency},
        ${"open"},
        ${trip.summary},
        ${trip.maxCompanions},
        ${trip.cover}
      )
      returning id
    `;
    const tripId = Number(inserted[0]?.id);
    if (!tripId) continue;

    await sql`
      insert into trip_members (trip_id, user_id, role)
      values (${tripId}, ${BOARD_USER_ID}, ${"owner"})
      on conflict do nothing
    `;

    const stopIds = new Map<string, number>();
    for (const stop of trip.destinations) {
      const stopRow = await sql<{ id: number }>`
        insert into trip_stops (trip_id, city, country, start_date, end_date, notes)
        values (
          ${tripId},
          ${stop.city},
          ${stop.country},
          ${shift(stop.start)},
          ${shift(stop.end)},
          ${stop.notes}
        )
        returning id
      `;
      const stopId = Number(stopRow[0]?.id);
      stopIds.set(stop.city, stopId);
      if (!stopId) continue;

      if (stop.stay) {
        await sql`
          insert into accommodations (
            trip_stop_id, property_name, address, check_in, check_out, booking_ref, contact
          )
          values (
            ${stopId},
            ${stop.stay.propertyName},
            ${stop.stay.address},
            ${shift(stop.stay.checkIn)},
            ${shift(stop.stay.checkOut)},
            ${stop.stay.bookingRef},
            ${stop.stay.contact}
          )
        `;
      }

      for (const act of stop.activities) {
        await sql`
          insert into itinerary_activities (
            trip_stop_id, title, activity_date, start_time, end_time, description
          )
          values (
            ${stopId},
            ${act.title},
            ${shift(act.day)},
            ${act.start},
            ${act.end},
            ${act.description}
          )
        `;
      }
    }

    for (const exp of trip.expenses) {
      const stopId = stopIds.get(exp.city) ?? null;
      await sql`
        insert into expenses (trip_id, trip_stop_id, category, amount, spent_on, note)
        values (${tripId}, ${stopId}, ${exp.category}, ${exp.amount}, ${shift(exp.day)}, ${exp.note})
      `;
    }

    for (const note of trip.notes) {
      await sql`
        insert into notes (trip_id, title, body)
        values (${tripId}, ${note.title}, ${note.body})
      `;
    }

    for (const item of trip.packing) {
      await sql`
        insert into packing_items (trip_id, name, packed, slot)
        values (${tripId}, ${item.name}, ${item.packed}, ${item.slot})
      `;
    }
  }
}
