import { processSahayakQuery } from '../src/lib/kisan/voice.ts';

const mockContext = {
  farmer: {
    id: 'e7099e71-0316-40b1-8337-add01ad98f65',
    name: 'Harshit',
    nameHi: 'हर्षित',
    village: 'Danapur',
    villageHi: 'दानापुर',
    district: 'Patna',
    phone: '7209569335',
    farmerId: 'HR-KRN-2026-5C570',
    crop: 'Wheat',
    cropHi: 'गेहूँ',
    quantityQuintals: 100
  },
  ticket: {
    token: 'KS-4025',
    centreId: 'a1111111-1111-4111-8111-111111111111',
    slotWindow: '11:30 – 12:00',
    farmersAhead: 3,
    etaMinutes: 22,
    status: 'scheduled' as const
  },
  payment: {
    grossAmount: 243000,
    currency: 'INR' as const,
    ratePerQuintal: 2430,
    quintals: 100,
    stage: 'approved' as const,
    expectedCreditIn: 'Within 48 hours of weighing',
    expectedCreditInHi: 'तुलाई के 48 घंटे के भीतर',
    bankMasked: 'PNB ••••4417',
    progressPct: 35
  },
  centres: [
    {
      id: 'a1111111-1111-4111-8111-111111111111',
      code: 'A',
      name: 'Mandi Centre A — Karnal City',
      nameHi: 'मंडी केंद्र A — करनाल शहर',
      distanceKm: 7,
      queueLength: 1,
      predictedWaitMin: 10,
      capacityUsedPct: 34,
      dailyCapacityQuintals: 5000,
      procuredTodayQuintals: 1700,
      activeCounters: 4,
      totalCounters: 6,
      processingRatePerHour: 18,
      farmersToday: 142,
      map: { x: 42, y: 55 },
      recommended: true
    }
  ],
  timeline: [
    { id: 'step-1', label: 'Farmer Registration', labelHi: 'किसान पंजीकरण', state: 'done' as const, detail: 'Verified', detailHi: 'सत्यापित' },
    { id: 'step-2', label: 'Smart Slot Confirmed', labelHi: 'स्मार्ट स्लॉट आवंटित', state: 'done' as const, detail: '11:30 - 12:00', detailHi: '11:30 - 12:00' },
    { id: 'step-3', label: 'Mandi Arrival & Gate Entry', labelHi: 'मंडी आगमन एवं प्रवेश', state: 'active' as const, detail: 'Reach gate', detailHi: 'गेट पर पहुँचें' },
  ]
};

console.log('=== Testing Kisan Setu Sahayak Natural Language Engine ===\n');

const testQueries = [
  'मेरी बारी कब आएगी?',
  'मेरा procurement कहाँ तक पहुँचा?',
  'मेरी payment कब आएगी?',
  'मेरा सेंटर कौन सा है?',
  'आज मुझे कितने बजे जाना है?',
  'मेरा queue खोलो',
  'मेरे लिए सबसे अच्छा slot चुनो',
];

for (const q of testQueries) {
  const res = processSahayakQuery(q, mockContext, 'hi', {});
  console.log(`🗣️ Query: "${q}"`);
  console.log(`🤖 Text Answer: ${res.text}`);
  console.log(`🎙️ Speech: ${res.speechText}`);
  if (res.navigationTarget) console.log(`🧭 Navigation: -> ${res.navigationTarget}`);
  if (res.pendingAction) console.log(`⚠️ Pending Action:`, res.pendingAction);
  console.log('--------------------------------------------------\n');
}
