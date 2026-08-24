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
  ticket: null,
  payment: null,
  centres: [],
  timeline: []
};

console.log('=== Testing Invalid / Out-of-Scope Queries ===\n');

const invalidQueries = [
  'कल का मौसम कैसा रहेगा?',
  'who is the prime minister?',
  'tell me a joke',
  'cricket score kya hai'
];

for (const q of invalidQueries) {
  const res = processSahayakQuery(q, mockContext, 'hi', {});
  console.log(`🗣️ Query: "${q}"`);
  console.log(`🤖 Answer:\n${res.text}`);
  console.log(`🎙️ Speech: ${res.speechText}`);
  console.log('--------------------------------------------------\n');
}
