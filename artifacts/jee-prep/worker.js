/**
 * Cloudflare Worker for StudE & OM Network (PW, JEE, YouTube & AI Engine)
 * Complete edge implementation with 100% parity with server.js:
 * - Physics Wallah API (Catalog, Metadata, Chapters, Teacher profiles, Syllabus & Full Schedules)
 * - YouTube Playlist & Single Video Parser (Full support for modern lockupViewModel & classic playlistVideoRenderer)
 * - YouTube Search Engine (Channel RSS + Search Scraping)
 * - AI Web Scraper & YouTube Transcript Engine (Invidious, youtube-transcript.ai, JSON-LD)
 * - DuckDuckGo Web Search with OpenGraph Thumbnails
 * - Universal CORS Proxy & Media Streaming
 */

// ─── CORS HEADERS ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Cache-Control",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  "Access-Control-Max-Age": "86400",
};

// ─── CONSTANTS & CONFIGURATION ────────────────────────────────────────────────
const PW_DETAILS_ORIGIN = "https://vidcloud.eu.org";
const PW_OFFICIAL_API = "https://api.penpencil.co";
const PW_CATALOG_URL = "https://studystark.github.io/batches/batches.json";

const POPULAR_PW_BATCHES = [
  {
    batch_id: "698ad3519549b300a5e1cc6a",
    name: "Arjuna JEE 2027",
    byName: "For Class 11 IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "11",
    language: "Hinglish",
    photo: "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bb464a1b-1525-48df-8c4e-a7e607038bf2.jpeg"
  },
  {
    batch_id: "664cb3d34b4c100018eb7814",
    name: "Lakshya JEE 2026",
    byName: "For Class 12 IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "12",
    language: "Hinglish"
  },
  {
    batch_id: "660144f808baec001824efec",
    name: "Prayas JEE 2025 / 2026",
    byName: "For Dropper / Repeater IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "13",
    language: "Hinglish"
  },
  {
    batch_id: "664ca7bc354afd415fa0808a",
    name: "Arjuna NEET 2027",
    byName: "For Class 11 NEET Aspirants",
    exam: "NEET",
    class: "11",
    language: "Hinglish"
  },
  {
    batch_id: "664cb4325a74070018d9db90",
    name: "Lakshya NEET 2026",
    byName: "For Class 12 NEET Aspirants",
    exam: "NEET",
    class: "12",
    language: "Hinglish"
  },
  {
    batch_id: "6630f9a2dbb730001859cff2",
    name: "Yakeen NEET 2025 / 2026",
    byName: "For Dropper / Repeater NEET Aspirants",
    exam: "NEET",
    class: "13",
    language: "Hinglish"
  },
  {
    batch_id: "6a6992d0cfd4382606180b15",
    name: "NSEA 2026",
    byName: "Targeted Batch for NSEA 2026 Aspirants",
    exam: "OLYMPIAD",
    class: "12",
    language: "Hinglish"
  }
];


const PRECACHED_BATCH_METADATA = {"698ad3519549b300a5e1cc6a": {"batchId": "698ad3519549b300a5e1cc6a", "name": "Arjuna JEE 2027", "class": "11", "exam": "IIT-JEE", "byName": "For IIT-JEE Aspirants", "description": "01. Live Lectures by 2 Set of Faculties & Class Notes Will be provided. 02. NCERT Punch Videos & DPPs Discussion by Batch Faculty 03. Digital Preparation Handwritten Notes B) Chapt", "previewImage": {"_id": "6a670042354afd415fa080cb", "name": "file.jpeg", "baseUrl": "https://static.pw.live/", "key": "5eb393ee95fab7468a79d189/ADMIN/bb464a1b-1525-48df-8c4e-a7e607038bf7.jpeg"}, "subjects": [{"id": "69b5698ee506a608ee297ed1", "subjectId": "688ddb35f8357d2e5d75a168", "name": "Physics By Rajwant Singh Sir", "faculty": "Rajwant Singh Sir", "teachers": [{"_id": "60ae11b68fc1580018961da2", "firstName": "Rajwant", "lastName": "Singh Sir", "name": "Rajwant Singh Sir", "qualification": "Integrated M.Sc (Eng. Physics), IIT(ISM) Dhanbad", "experience": "11 Years", "featuredLine": "Toh kaise ho mere antar pantar?", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/a8a8837e-fa4d-4355-bbd5-214512154c23.png", "introVideoThumbnail": "https://static.pw.live/69a0a6a117f7539aaaa1d208", "subject": "Physics"}], "lectureCount": 121, "tagCount": 34, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bba2bcac-60a8-4fa4-88a8-509d7e095d8d.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3361", "rawId": "69b571ed5582e24e8c2c3361", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd659", "rawId": "69b5720d995ec8a0398cd659", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 18, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c3", "rawId": "69b5723a961c2d315a5f40c3", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c340e", "rawId": "69b572595582e24e8c2c340e", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ce8611e6bfb514a81a787e", "rawId": "69ce8611e6bfb514a81a787e", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02a", "rawId": "69ddedcc91fe5021c8acb02a", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 95, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fdae221b62d49748115741", "rawId": "69fdae221b62d49748115741", "title": "Parakram Solution By Rajwant Sir", "videoCount": 6, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a086d9c25b555a2e1bb3146", "rawId": "6a086d9c25b555a2e1bb3146", "title": "Quick Revision By Rajwant Sir", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a184f79ba71700b4536c8d0", "rawId": "6a184f79ba71700b4536c8d0", "title": "Mission 11th Comeback", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26c3583c0ee5ef0a798c59", "rawId": "6a26c3583c0ee5ef0a798c59", "title": "Extra Books By Rajwant Sir || Only PDF", "videoCount": 0, "notesCount": 22, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3d38b919a5322dac482492", "rawId": "6a3d38b919a5322dac482492", "title": "Summary Lecture By Rajwant Sir", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869763", "rawId": "69dc843271d06abbf3869763", "title": "Units and Measurement", "videoCount": 13, "notesCount": 24, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69f8b42d721c63d92d47ce87", "rawId": "69f8b42d721c63d92d47ce87", "title": "Parakram Assignment By Rajwant Sir || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869765", "rawId": "69dc843271d06abbf3869765", "title": "Mathematical Tools", "videoCount": 11, "notesCount": 22, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda1", "rawId": "69ea2e2d5f0e7bca9203cda1", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e6", "rawId": "69fc8dc04ada9d82ba4574e6", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd4", "rawId": "6a1affc93ea033f60ab1ebd4", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869767", "rawId": "69dc843271d06abbf3869767", "title": "Motion in a Straight Line", "videoCount": 19, "notesCount": 32, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2782", "rawId": "69f894bbba91836416be2782", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3c02abcb13043ba047b2c9", "rawId": "6a3c02abcb13043ba047b2c9", "title": "Homework Discussion", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869769", "rawId": "69dc843271d06abbf3869769", "title": "Motion in a Plane", "videoCount": 17, "notesCount": 31, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976b", "rawId": "69dc843271d06abbf386976b", "title": "Laws of Motion", "videoCount": 21, "notesCount": 48, "dppCount": 14, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976d", "rawId": "69dc843271d06abbf386976d", "title": "Circular Motion", "videoCount": 8, "notesCount": 21, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6aae86484f23a868b80e0d2a", "rawId": "6aae86484f23a868b80e0d2a", "title": "60 Minute NCERT", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976f", "rawId": "69dc843271d06abbf386976f", "title": "Work, Energy and Power", "videoCount": 7, "notesCount": 16, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869771", "rawId": "69dc843271d06abbf3869771", "title": "Centre of Mass & System of Particles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869773", "rawId": "69dc843271d06abbf3869773", "title": "Rotational Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869775", "rawId": "69dc843271d06abbf3869775", "title": "Gravitation", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a940a3c4001a4ad6df097fd", "rawId": "6a940a3c4001a4ad6df097fd", "title": "Kinetic Theory & Thermodynamics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869777", "rawId": "69dc843271d06abbf3869777", "title": "Mechanical Properties of Solids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869779", "rawId": "69dc843271d06abbf3869779", "title": "Mechanical Properties of Fluids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977b", "rawId": "69dc843271d06abbf386977b", "title": "Thermal Properties of Matter", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977f", "rawId": "69dc843271d06abbf386977f", "title": "Simple Harmonic Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869781", "rawId": "69dc843271d06abbf3869781", "title": "Waves", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569aeeffdf9567d75f816", "subjectId": "688ddb6fa4bed5089e148757", "name": "Physical Chemistry By Rahul Dudi Sir", "faculty": "Rahul Dudi Sir", "teachers": [{"_id": "62dfedb7479b3a001295c283", "firstName": "Rahul", "lastName": "Dudi Sir", "name": "Rahul Dudi Sir", "qualification": "B.Tech from NIT Jaipur", "experience": "13 Years", "featuredLine": "Dada, Haan na bolna padega", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c4994a81-8d4e-4225-826d-72339ab3610e.png", "introVideoThumbnail": "https://static.pw.live/69a0a4c374c6f567176ec713", "subject": "Chemistry"}], "lectureCount": 85, "tagCount": 19, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/9668a57a-4b92-438e-b3fc-eb2572d05bc0.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3362", "rawId": "69b571ed5582e24e8c2c3362", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65a", "rawId": "69b5720d995ec8a0398cd65a", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c4", "rawId": "69b5723a961c2d315a5f40c4", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c340f", "rawId": "69b572595582e24e8c2c340f", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02b", "rawId": "69ddedcc91fe5021c8acb02b", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 50, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fb42218de365a490798628", "rawId": "69fb42218de365a490798628", "title": "Homework Discussion", "videoCount": 15, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a16dc6d981ebbb7c4a5dc48", "rawId": "6a16dc6d981ebbb7c4a5dc48", "title": "Mission 11th Comeback", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3cdefb751076ac17bfa781", "rawId": "6a3cdefb751076ac17bfa781", "title": "Revision", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869783", "rawId": "69dc843271d06abbf3869783", "title": "Mole Concept", "videoCount": 31, "notesCount": 48, "dppCount": 17, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869785", "rawId": "69dc843271d06abbf3869785", "title": "Structure of Atom", "videoCount": 18, "notesCount": 28, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda2", "rawId": "69ea2e2d5f0e7bca9203cda2", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e7", "rawId": "69fc8dc04ada9d82ba4574e7", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd5", "rawId": "6a1affc93ea033f60ab1ebd5", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869787", "rawId": "69dc843271d06abbf3869787", "title": "State of matter", "videoCount": 5, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2783", "rawId": "69f894bbba91836416be2783", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869789", "rawId": "69dc843271d06abbf3869789", "title": "Thermodynamics", "videoCount": 7, "notesCount": 17, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978b", "rawId": "69dc843271d06abbf386978b", "title": "Redox Reaction", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978d", "rawId": "69dc843271d06abbf386978d", "title": "Chemical Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978f", "rawId": "69dc843271d06abbf386978f", "title": "Ionic Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569cab32b3601588a690b", "subjectId": "681cb395f9a9aca4a4b4891a", "name": "Inorganic Chemistry By Kunwar Om Pandey Sir", "faculty": "Kunwar Om Pandey Sir", "teachers": [{"_id": "63689057ef30b800110f8705", "firstName": "Kunwar Om", "lastName": "Pandey Sir", "name": "Kunwar Om Pandey Sir", "qualification": "M.Sc. - IIT Delhi", "experience": "11 Years", "featuredLine": "Hello UQTs", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/ecc5f817-8b53-4e59-b58c-979c473e2315.png", "introVideoThumbnail": "https://static.pw.live/69a0b5312daadfa8201f4128", "subject": "Inorganic Chemistry"}], "lectureCount": 49, "tagCount": 16, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0a9d5bdd-84b1-4964-ba97-0fd593e24cd3.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3363", "rawId": "69b571ed5582e24e8c2c3363", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65b", "rawId": "69b5720d995ec8a0398cd65b", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c5", "rawId": "69b5723a961c2d315a5f40c5", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3410", "rawId": "69b572595582e24e8c2c3410", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3392fb911e3f8197168d24", "rawId": "6a3392fb911e3f8197168d24", "title": "EaJEE Notes for IOC || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a33b2fbf2c9003d9a651f93", "rawId": "6a33b2fbf2c9003d9a651f93", "title": "Kattar Advanced EaJEE Batch", "videoCount": 5, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869791", "rawId": "69dc843271d06abbf3869791", "title": "Periodic Table", "videoCount": 14, "notesCount": 23, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869793", "rawId": "69dc843271d06abbf3869793", "title": "Chemical Bonding", "videoCount": 26, "notesCount": 47, "dppCount": 14, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02c", "rawId": "69ddedcc91fe5021c8acb02c", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 40, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda3", "rawId": "69ea2e2d5f0e7bca9203cda3", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e8", "rawId": "69fc8dc04ada9d82ba4574e8", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd6", "rawId": "6a1affc93ea033f60ab1ebd6", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869795", "rawId": "69dc843271d06abbf3869795", "title": "P-block Elements (Group 13 and 14)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69f894bbba91836416be2784", "rawId": "69f894bbba91836416be2784", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869797", "rawId": "69dc843271d06abbf3869797", "title": "S-block Element", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869799", "rawId": "69dc843271d06abbf3869799", "title": "Hydrogen and its Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569e8cd9eea58b9fe60da", "subjectId": "688ddbdc510064d4022855c9", "name": "Maths By Sachin Jakhar Sir", "faculty": "Sachin Jakhar Sir", "teachers": [{"_id": "60879b8eeb913f00448eeda8", "firstName": "Sachin", "lastName": "Jakhar Sir", "name": "Sachin Jakhar Sir", "qualification": "B.Tech, NIT-KURUKSHETRA", "experience": "13 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7ecbae73-2fda-4189-8f39-c8f71dff1110.png", "introVideoThumbnail": "https://static.pw.live/69a0a64589933c416221f9b2", "subject": "Mathematics"}], "lectureCount": 112, "tagCount": 34, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0fe1276d-853a-4816-912f-dd491976d805.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3364", "rawId": "69b571ed5582e24e8c2c3364", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 34, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65c", "rawId": "69b5720d995ec8a0398cd65c", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c6", "rawId": "69b5723a961c2d315a5f40c6", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3411", "rawId": "69b572595582e24e8c2c3411", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d39608eb6fb0cf65a653d9", "rawId": "69d39608eb6fb0cf65a653d9", "title": "Bridge Course Lectures", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02d", "rawId": "69ddedcc91fe5021c8acb02d", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 94, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d55cbfeb453284b098637", "rawId": "6a0d55cbfeb453284b098637", "title": "DIBY By Sachin Sir || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d85d9a52ade8f4ea05efa", "rawId": "6a0d85d9a52ade8f4ea05efa", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 12, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a16672b7b672dc71005c50c", "rawId": "6a16672b7b672dc71005c50c", "title": "Mission 11th Comeback", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26e1688a70b6caef00abb1", "rawId": "6a26e1688a70b6caef00abb1", "title": "DIBY Discussion By Sachin Sir", "videoCount": 7, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979b", "rawId": "69dc843271d06abbf386979b", "title": "Set Theory", "videoCount": 8, "notesCount": 15, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979d", "rawId": "69dc843271d06abbf386979d", "title": "Basic Mathematics", "videoCount": 21, "notesCount": 40, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2785", "rawId": "69f894bbba91836416be2785", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e9", "rawId": "69fc8dc04ada9d82ba4574e9", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 13, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979f", "rawId": "69dc843271d06abbf386979f", "title": "Quadratic Equations", "videoCount": 14, "notesCount": 25, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda4", "rawId": "69ea2e2d5f0e7bca9203cda4", "title": "NCERT Discussion", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a1", "rawId": "69dc843271d06abbf38697a1", "title": "Sequence and Series", "videoCount": 12, "notesCount": 23, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a3", "rawId": "69dc843271d06abbf38697a3", "title": "Trigonometric Functions", "videoCount": 13, "notesCount": 30, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a5", "rawId": "69dc843271d06abbf38697a5", "title": "Trigonometric  Equation", "videoCount": 7, "notesCount": 15, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a7", "rawId": "69dc843271d06abbf38697a7", "title": "Relations and Functions", "videoCount": 5, "notesCount": 15, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a9", "rawId": "69dc843271d06abbf38697a9", "title": "Permutations and Combinations", "videoCount": 11, "notesCount": 32, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ab", "rawId": "69dc843271d06abbf38697ab", "title": "Binomial theorem", "videoCount": 4, "notesCount": 8, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ad", "rawId": "69dc843271d06abbf38697ad", "title": "Straight Lines", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697af", "rawId": "69dc843271d06abbf38697af", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b1", "rawId": "69dc843271d06abbf38697b1", "title": "Conic Sections:Parabola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b3", "rawId": "69dc843271d06abbf38697b3", "title": "Conic Sections:Ellipse", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b5", "rawId": "69dc843271d06abbf38697b5", "title": "Conic Sections:Hyperbola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b7", "rawId": "69dc843271d06abbf38697b7", "title": "Complex Number", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b9", "rawId": "69dc843271d06abbf38697b9", "title": "Limits and Derivatives", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bb", "rawId": "69dc843271d06abbf38697bb", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bd", "rawId": "69dc843271d06abbf38697bd", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bf", "rawId": "69dc843271d06abbf38697bf", "title": "Introduction to Three Dimensional Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c1", "rawId": "69dc843271d06abbf38697c1", "title": "Linear Inequalities", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c3", "rawId": "69dc843271d06abbf38697c3", "title": "Solution of Triangle", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b56a34e90793e4f312def2", "subjectId": "688ddaa9f06be6d3ed36ad34", "name": "Inorganic Chemistry By Amitabh Sharma Sir", "faculty": "Amitabh Sharma Sir", "teachers": [{"_id": "6116629e0de07a0018a82f52", "firstName": "Amitabh", "lastName": "Sharma Sir", "name": "Amitabh Sharma Sir", "qualification": "M.Sc. from Kota University", "experience": "20 Years", "featuredLine": "In place of Terminator", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0a398e4a-cbe6-4c10-9cb2-6cd6a5c8d891.png", "introVideoThumbnail": "https://static.pw.live/69a0a8e959e2bca14359bcf2", "subject": "Inorganic Chemistry"}], "lectureCount": 80, "tagCount": 17, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/fa5606a8-b247-4a8f-9f51-b5f90bf74793.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3365", "rawId": "69b571ed5582e24e8c2c3365", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65d", "rawId": "69b5720d995ec8a0398cd65d", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c7", "rawId": "69b5723a961c2d315a5f40c7", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3412", "rawId": "69b572595582e24e8c2c3412", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869792", "rawId": "69dc843271d06abbf3869792", "title": "Periodic Table", "videoCount": 15, "notesCount": 25, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02e", "rawId": "69ddedcc91fe5021c8acb02e", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 39, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869794", "rawId": "69dc843271d06abbf3869794", "title": "Chemical Bonding", "videoCount": 25, "notesCount": 51, "dppCount": 17, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda5", "rawId": "69ea2e2d5f0e7bca9203cda5", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ea", "rawId": "69fc8dc04ada9d82ba4574ea", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd7", "rawId": "6a1affc93ea033f60ab1ebd7", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a33e4e9833ef5655460ae26", "rawId": "6a33e4e9833ef5655460ae26", "title": "TFT || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a36ad486feb86ff4e6533c0", "rawId": "6a36ad486feb86ff4e6533c0", "title": "Cadbury Shot Challenge || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869796", "rawId": "69dc843271d06abbf3869796", "title": "P-block Elements (Group 13 and 14)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69f894bbba91836416be2786", "rawId": "69f894bbba91836416be2786", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869798", "rawId": "69dc843271d06abbf3869798", "title": "S-block Element", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a33f714318f8e6801ed2c4b", "rawId": "6a33f714318f8e6801ed2c4b", "title": "CBD || Only Video", "videoCount": 36, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979a", "rawId": "69dc843271d06abbf386979a", "title": "Hydrogen and its Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b57278504f6b8cced25f84", "subjectId": "69b572011258ab0500483d04", "name": "Organic Chemistry by Ashutosh Gautam Sir", "faculty": "Ashutosh Gautam Sir", "teachers": [{"_id": "6401eed92f8f890018cb9f45", "firstName": "Ashutosh", "lastName": "Gautam Sir", "name": "Ashutosh Gautam Sir", "qualification": "M.Sc chemistry", "experience": "", "featuredLine": "", "imageUrl": "https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/6d43e0ff-3120-4bfd-8313-8060a026cbd3.png", "introVideoThumbnail": "", "subject": "Organic Chemistry"}], "lectureCount": 0, "tagCount": 10, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/f4b4c506-c043-4a56-87f5-63ed586ad978.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286362", "rawId": "69b573702550c4b1f7286362", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680564", "rawId": "6a940a3b06bbf08826680564", "title": "Some Basic principles and Technique IUPAC Naming", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b573de995ec8a0398cdb72", "rawId": "69b573de995ec8a0398cdb72", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680565", "rawId": "6a940a3b06bbf08826680565", "title": "Some Basic principles and Techniques GOC", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b573f04a3a45b506c5cf70", "rawId": "69b573f04a3a45b506c5cf70", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680566", "rawId": "6a940a3b06bbf08826680566", "title": "Some Basic principles and Techniques Isomerism", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5740ca83ba35254bbc222", "rawId": "69b5740ca83ba35254bbc222", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc813a5172d97c563ddde8", "rawId": "69dc813a5172d97c563ddde8", "title": "Hydrocarbon", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddea", "rawId": "69dc813a5172d97c563dddea", "title": "Purification and Analysis of Organic Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddec", "rawId": "69dc813a5172d97c563dddec", "title": "Environmental Chemistry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b5729d45cca26612727f1a", "subjectId": "69b572321258ab0500483ec4", "name": "Maths by Amarnath Anand Sir (Anna Sir)", "faculty": "Amarnath Anand Sir", "teachers": [{"_id": "69b825790d2994f171399dc8", "firstName": "Amarnath", "lastName": "Anand Sir", "name": "Amarnath Anand Sir", "qualification": "B.Tech from IIT Delhi", "experience": "21 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/540cf01e-f91a-4408-bf53-931b70fe8270.png", "introVideoThumbnail": "https://static.pw.live/6a0d464c9c341af80151a5e0", "subject": "Mathematics"}], "lectureCount": 181, "tagCount": 31, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/a9d323ab-b31e-413b-933f-9369a465db58.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286363", "rawId": "69b573702550c4b1f7286363", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 34, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb73", "rawId": "69b573de995ec8a0398cdb73", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf71", "rawId": "69b573f04a3a45b506c5cf71", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc223", "rawId": "69b5740ca83ba35254bbc223", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d85d9a52ade8f4ea05efb", "rawId": "6a0d85d9a52ade8f4ea05efb", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 12, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979c", "rawId": "69dc843271d06abbf386979c", "title": "Sets", "videoCount": 13, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979e", "rawId": "69dc843271d06abbf386979e", "title": "Basic Mathematics", "videoCount": 40, "notesCount": 60, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb030", "rawId": "69ddedcc91fe5021c8acb030", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 93, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ec", "rawId": "69fc8dc04ada9d82ba4574ec", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 13, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a0", "rawId": "69dc843271d06abbf38697a0", "title": "Quadratic Equations", "videoCount": 20, "notesCount": 30, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2788", "rawId": "69f894bbba91836416be2788", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a2", "rawId": "69dc843271d06abbf38697a2", "title": "Sequence and Series", "videoCount": 21, "notesCount": 31, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda7", "rawId": "69ea2e2d5f0e7bca9203cda7", "title": "NCERT Discussion", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a4", "rawId": "69dc843271d06abbf38697a4", "title": "Trigonometric Functions", "videoCount": 25, "notesCount": 39, "dppCount": 12, "isStarted": true, "lectures": []}, {"id": "6a6dc5efbb39334e3c3c4f84", "rawId": "6a6dc5efbb39334e3c3c4f84", "title": "Interaction Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a6", "rawId": "69dc843271d06abbf38697a6", "title": "Trigonometric  Equation", "videoCount": 10, "notesCount": 16, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a8", "rawId": "69dc843271d06abbf38697a8", "title": "Relation and Function", "videoCount": 7, "notesCount": 17, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697aa", "rawId": "69dc843271d06abbf38697aa", "title": "Permutations and Combinations", "videoCount": 20, "notesCount": 37, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ac", "rawId": "69dc843271d06abbf38697ac", "title": "Binomial theorem", "videoCount": 16, "notesCount": 24, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ae", "rawId": "69dc843271d06abbf38697ae", "title": "Straight Lines", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b0", "rawId": "69dc843271d06abbf38697b0", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b2", "rawId": "69dc843271d06abbf38697b2", "title": "Conic Sections:Parabola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b4", "rawId": "69dc843271d06abbf38697b4", "title": "Conic Sections:Ellipse", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b6", "rawId": "69dc843271d06abbf38697b6", "title": "Conic Sections:Hyperbola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b8", "rawId": "69dc843271d06abbf38697b8", "title": "Complex Number", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697ba", "rawId": "69dc843271d06abbf38697ba", "title": "Limits and Derivatives", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bc", "rawId": "69dc843271d06abbf38697bc", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697be", "rawId": "69dc843271d06abbf38697be", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c0", "rawId": "69dc843271d06abbf38697c0", "title": "Introduction to Three Dimensional Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c2", "rawId": "69dc843271d06abbf38697c2", "title": "Linear Inequalities", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c4", "rawId": "69dc843271d06abbf38697c4", "title": "Solution of Triangle", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b572d3c9a2b804fd67bbc5", "subjectId": "69b571cc519486b6249f8cc3", "name": "Physical Chemistry by Vijay kumar Tripathi Sir (VKT Sir)", "faculty": "Vijay Kumar Tripathi Sir", "teachers": [{"_id": "68b835d22c41161529275f46", "firstName": "Vijay", "lastName": "Kumar Tripathi Sir", "name": "Vijay Kumar Tripathi Sir", "qualification": "B.Tech from IIT BHU", "experience": "", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7b0810c2-b23a-463f-b8cc-3d22cdfc1cce.png", "introVideoThumbnail": "", "subject": "Physical Chemistry"}], "lectureCount": 56, "tagCount": 17, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/735a87b1-0891-446c-9d42-31cfa64dea03.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286364", "rawId": "69b573702550c4b1f7286364", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb74", "rawId": "69b573de995ec8a0398cdb74", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf72", "rawId": "69b573f04a3a45b506c5cf72", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc224", "rawId": "69b5740ca83ba35254bbc224", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869784", "rawId": "69dc843271d06abbf3869784", "title": "Mole Concept", "videoCount": 20, "notesCount": 39, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869786", "rawId": "69dc843271d06abbf3869786", "title": "Structure of Atom", "videoCount": 17, "notesCount": 33, "dppCount": 16, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb031", "rawId": "69ddedcc91fe5021c8acb031", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 49, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda8", "rawId": "69ea2e2d5f0e7bca9203cda8", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ed", "rawId": "69fc8dc04ada9d82ba4574ed", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd9", "rawId": "6a1affc93ea033f60ab1ebd9", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869788", "rawId": "69dc843271d06abbf3869788", "title": "State of matter", "videoCount": 10, "notesCount": 23, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2789", "rawId": "69f894bbba91836416be2789", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978a", "rawId": "69dc843271d06abbf386978a", "title": "Thermodynamics", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1591079986c702f25cfe20", "rawId": "6a1591079986c702f25cfe20", "title": "Practice Sheet", "videoCount": 0, "notesCount": 1, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978c", "rawId": "69dc843271d06abbf386978c", "title": "Redox Reaction", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978e", "rawId": "69dc843271d06abbf386978e", "title": "Chemical Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869790", "rawId": "69dc843271d06abbf3869790", "title": "Ionic Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b572f65582e24e8c2c361e", "subjectId": "69b57196551c493bc059da1f", "name": "Physics by Varun Chauhan sir", "faculty": "Varun Chauhan Sir", "teachers": [{"_id": "64366780e524540018eb7bfa", "firstName": "Varun", "lastName": "Chauhan Sir", "name": "Varun Chauhan Sir", "qualification": "B.Tech", "experience": "", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/deed3f9e-6911-4893-b3f3-9e51c0bbcefa.png", "introVideoThumbnail": "", "subject": "Physics"}], "lectureCount": 97, "tagCount": 25, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/278d2bff-8f35-4dc4-bc45-45d21a33ed9a.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286365", "rawId": "69b573702550c4b1f7286365", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb75", "rawId": "69b573de995ec8a0398cdb75", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 18, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf73", "rawId": "69b573f04a3a45b506c5cf73", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc225", "rawId": "69b5740ca83ba35254bbc225", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869764", "rawId": "69dc843271d06abbf3869764", "title": "Units and Measurements", "videoCount": 11, "notesCount": 21, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869766", "rawId": "69dc843271d06abbf3869766", "title": "Mathematical Tools", "videoCount": 11, "notesCount": 19, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb032", "rawId": "69ddedcc91fe5021c8acb032", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 88, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda9", "rawId": "69ea2e2d5f0e7bca9203cda9", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ee", "rawId": "69fc8dc04ada9d82ba4574ee", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebda", "rawId": "6a1affc93ea033f60ab1ebda", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869768", "rawId": "69dc843271d06abbf3869768", "title": "Motion in a Straight Line", "videoCount": 16, "notesCount": 29, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be278a", "rawId": "69f894bbba91836416be278a", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976a", "rawId": "69dc843271d06abbf386976a", "title": "Motion in a Plane", "videoCount": 15, "notesCount": 26, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976c", "rawId": "69dc843271d06abbf386976c", "title": "Laws of Motion + Friction", "videoCount": 17, "notesCount": 34, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976e", "rawId": "69dc843271d06abbf386976e", "title": "Circular Motion", "videoCount": 7, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869770", "rawId": "69dc843271d06abbf3869770", "title": "Work, Energy and Power", "videoCount": 11, "notesCount": 25, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869772", "rawId": "69dc843271d06abbf3869772", "title": "Centre of Mass and System of Particles", "videoCount": 3, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869774", "rawId": "69dc843271d06abbf3869774", "title": "Rotational Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869776", "rawId": "69dc843271d06abbf3869776", "title": "Gravitation", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a940a3eba8d1ec44e9b3c05", "rawId": "6a940a3eba8d1ec44e9b3c05", "title": "Kinetic Theory & Thermodynamics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869778", "rawId": "69dc843271d06abbf3869778", "title": "Mechanical Properties of Solids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977a", "rawId": "69dc843271d06abbf386977a", "title": "Mechanical Properties of Fluids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977c", "rawId": "69dc843271d06abbf386977c", "title": "Thermal Properties of Matter", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869780", "rawId": "69dc843271d06abbf3869780", "title": "Simple Harmonic Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869782", "rawId": "69dc843271d06abbf3869782", "title": "Waves", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b5746d613c5163ab7a709e", "subjectId": "681cb1cb7d61cac0dde80663", "name": "Organic Chemistry By Pankaj Sijariya Sir", "faculty": "Pankaj Sijariya Sir", "teachers": [{"_id": "609e9ff6ef20f40011aa0dd1", "firstName": "Pankaj", "lastName": "Sijariya Sir", "name": "Pankaj Sijariya Sir", "qualification": "B.Tech from HBTI Kanpur in Electronic Engineering ", "experience": "17 Years", "featuredLine": "Toh main ye rishta pakka samjhu", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c4de34da-84f8-4a89-960a-dbdec7122b07.png", "introVideoThumbnail": "https://static.pw.live/69a0aaa259e2bca14359bdb6", "subject": "Organic Chemistry"}], "lectureCount": 1, "tagCount": 11, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/9e9f7821-f65e-48d6-8d42-064f3c9cf75f.pdf", "schedules": [], "chapters": [{"id": "69b576f42b780dc1da4fe2fb", "rawId": "69b576f42b780dc1da4fe2fb", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3c", "rawId": "6a940a3e729613806f4bec3c", "title": "Some Basic principles and Technique IUPAC Naming", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b57707a83ba35254bbc9c3", "rawId": "69b57707a83ba35254bbc9c3", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3d", "rawId": "6a940a3e729613806f4bec3d", "title": "Some Basic principles and Techniques GOC", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5771b45cca26612729665", "rawId": "69b5771b45cca26612729665", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3e", "rawId": "6a940a3e729613806f4bec3e", "title": "Some Basic principles and Techniques Isomerism", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5772ee90793e4f3130d8a", "rawId": "69b5772ee90793e4f3130d8a", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d523ceadefb7e5260d07a4", "rawId": "69d523ceadefb7e5260d07a4", "title": "Bridge Course Lectures", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc813a5172d97c563ddde9", "rawId": "69dc813a5172d97c563ddde9", "title": "Hydrocarbon", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddeb", "rawId": "69dc813a5172d97c563dddeb", "title": "Purification and Analysis of Organic Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563ddded", "rawId": "69dc813a5172d97c563ddded", "title": "Environmental Chemistry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "6a6b44faf834f38ed6f9120d", "subjectId": "688dd9660fb5f084935d611f", "name": "Physics By Saleem Ahmad Sir", "faculty": "Saleem Ahmad Sir", "teachers": [{"_id": "62ebffe15957260018f68abb", "firstName": "Saleem", "lastName": "Ahmad Sir", "name": "Saleem Ahmad Sir", "qualification": "B.Tech from NIT Trichy (Electronics And Communication)", "experience": "13 Years", "featuredLine": "Kaddu gang", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/60062667-872c-4451-b40a-36cc36e1b7b3.png", "introVideoThumbnail": "https://static.pw.live/69a0a45089933c416221f969", "subject": "Physics"}], "lectureCount": 242, "tagCount": 32, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/051da37d-1e8f-46ad-b833-85670162acb7.pdf", "schedules": [], "chapters": [{"id": "6a6b464726b614560bcecdc1", "rawId": "6a6b464726b614560bcecdc1", "title": "Interaction Session || Only Video", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b464bc3d57b41a8d37ff2", "rawId": "6a6b464bc3d57b41a8d37ff2", "title": "Summary Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b465326b614560bced6f7", "rawId": "6a6b465326b614560bced6f7", "title": "Revision Question Practice", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4630ce4ac4e9ab51eecb", "rawId": "6a6b4630ce4ac4e9ab51eecb", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4630ce4ac4e9ab51eed0", "rawId": "6a6b4630ce4ac4e9ab51eed0", "title": "Formula Sheet || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b47b06f3a898b0ae5ee6b", "rawId": "6a6b47b06f3a898b0ae5ee6b", "title": "Practice Sheet (JEE Main) - Manthan || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4631ce4ac4e9ab51eed5", "rawId": "6a6b4631ce4ac4e9ab51eed5", "title": "NCERT Discussion", "videoCount": 17, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b462cce4ac4e9ab51eebe", "rawId": "6a6b462cce4ac4e9ab51eebe", "title": "KPP PDF By Saleem Sir", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b462fce4ac4e9ab51eec6", "rawId": "6a6b462fce4ac4e9ab51eec6", "title": "KPP Solution By Saleem Sir", "videoCount": 19, "notesCount": 20, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b467d26b614560bcefa26", "rawId": "6a6b467d26b614560bcefa26", "title": "SKC by Saleem Sir || Only PDF", "videoCount": 0, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b46a426b614560bcf1942", "rawId": "6a6b46a426b614560bcf1942", "title": "HCV || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b46df26b614560bcf4ae8", "rawId": "6a6b46df26b614560bcf4ae8", "title": "Revison Section || Only PDF", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b475026b614560bcfaafd", "rawId": "6a6b475026b614560bcfaafd", "title": "Revision Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b461cce4ac4e9ab51ee98", "rawId": "6a6b461cce4ac4e9ab51ee98", "title": "Ch 01: Units and Dimension", "videoCount": 11, "notesCount": 18, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a6b462bce4ac4e9ab51eeb9", "rawId": "6a6b462bce4ac4e9ab51eeb9", "title": "Ch 02 : Basic Maths", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4634ce4ac4e9ab51eedd", "rawId": "6a6b4634ce4ac4e9ab51eedd", "title": "Ch 03 : Vectors", "videoCount": 14, "notesCount": 15, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a6b464ac3d57b41a8d37fec", "rawId": "6a6b464ac3d57b41a8d37fec", "title": "Ch 04 : Motion in a Straight Line", "videoCount": 17, "notesCount": 20, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a6b466726b614560bcee7ce", "rawId": "6a6b466726b614560bcee7ce", "title": "Ch 05 : Errors and Measurements", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b466d26b614560bceed48", "rawId": "6a6b466d26b614560bceed48", "title": "Ch 06 : Motion in a Plane", "videoCount": 16, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a6b468e26b614560bcf0836", "rawId": "6a6b468e26b614560bcf0836", "title": "Ch 07 : Laws of Motion", "videoCount": 15, "notesCount": 17, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a6b46b026b614560bcf23c3", "rawId": "6a6b46b026b614560bcf23c3", "title": "Ch 08 : Circular Motion", "videoCount": 6, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a6b46bd26b614560bcf2e71", "rawId": "6a6b46bd26b614560bcf2e71", "title": "Ch 09 : Work, Power, Energy", "videoCount": 14, "notesCount": 16, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a6b46d926b614560bcf457d", "rawId": "6a6b46d926b614560bcf457d", "title": "Ch 10 : Centre of Mass", "videoCount": 16, "notesCount": 23, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a6b46f426b614560bcf5b26", "rawId": "6a6b46f426b614560bcf5b26", "title": "Ch 11 : Thermal Properties of Matter", "videoCount": 12, "notesCount": 14, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b46fc26b614560bcf621e", "rawId": "6a6b46fc26b614560bcf621e", "title": "Ch 12 : Mechanical Properties of Solids", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b471826b614560bcf7aa4", "rawId": "6a6b471826b614560bcf7aa4", "title": "Ch 13 : Rotational Motion", "videoCount": 25, "notesCount": 29, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a6b473e26b614560bcf9bce", "rawId": "6a6b473e26b614560bcf9bce", "title": "Ch 14 : KTG and Thermodynamics", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b474fc3d57b41a8d38098", "rawId": "6a6b474fc3d57b41a8d38098", "title": "Ch 15 : Oscillations", "videoCount": 10, "notesCount": 15, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a6b4769c3d57b41a8d382d2", "rawId": "6a6b4769c3d57b41a8d382d2", "title": "Ch 16 : Waves", "videoCount": 13, "notesCount": 13, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b4780c3d57b41a8d382fe", "rawId": "6a6b4780c3d57b41a8d382fe", "title": "Ch 17 : Mechanical Properties of Fluids", "videoCount": 13, "notesCount": 15, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b479ec3d57b41a8d38381", "rawId": "6a6b479ec3d57b41a8d38381", "title": "Ch 18 : Gravitation", "videoCount": 5, "notesCount": 7, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a6b47c16f3a898b0ae5ee8b", "rawId": "6a6b47c16f3a898b0ae5ee8b", "title": "Must Do Questions", "videoCount": 0, "notesCount": 19, "dppCount": 19, "isStarted": true, "lectures": []}]}]}, "698d72dce4f3563f53f3c719": {"batchId": "698d72dce4f3563f53f3c719", "name": "Arjuna JEE 2027 + Uday 2027", "class": "11", "exam": "IIT-JEE", "byName": "For 11th Board & IIT-JEE", "description": "Special Features Of Arjuna JEE Class Notes Will be provided. 02. NCERT Punch Videos & DPPs Discussion by Batch Faculty. 03. Digital Preparation Handwritten Notes B) Chapterwise PYQ", "previewImage": {"_id": "6a670b974a674869a337776b", "name": "file.jpeg", "baseUrl": "https://static.pw.live/", "key": "5eb393ee95fab7468a79d189/ADMIN/ff071648-e128-4aec-81e8-c73672fa3dbe.jpeg"}, "subjects": [{"id": "69b5698ee506a608ee297ed1", "subjectId": "688ddb35f8357d2e5d75a168", "name": "Physics By Rajwant Singh Sir", "faculty": "Rajwant Singh Sir", "teachers": [{"_id": "60ae11b68fc1580018961da2", "firstName": "Rajwant", "lastName": "Singh Sir", "name": "Rajwant Singh Sir", "qualification": "Integrated M.Sc (Eng. Physics), IIT(ISM) Dhanbad", "experience": "11 Years", "featuredLine": "Toh kaise ho mere antar pantar?", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/a8a8837e-fa4d-4355-bbd5-214512154c23.png", "introVideoThumbnail": "https://static.pw.live/69a0a6a117f7539aaaa1d208", "subject": "Physics"}], "lectureCount": 121, "tagCount": 34, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bba2bcac-60a8-4fa4-88a8-509d7e095d8d.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3361", "rawId": "69b571ed5582e24e8c2c3361", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd659", "rawId": "69b5720d995ec8a0398cd659", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 18, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c3", "rawId": "69b5723a961c2d315a5f40c3", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c340e", "rawId": "69b572595582e24e8c2c340e", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ce8611e6bfb514a81a787e", "rawId": "69ce8611e6bfb514a81a787e", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02a", "rawId": "69ddedcc91fe5021c8acb02a", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 95, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fdae221b62d49748115741", "rawId": "69fdae221b62d49748115741", "title": "Parakram Solution By Rajwant Sir", "videoCount": 6, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a086d9c25b555a2e1bb3146", "rawId": "6a086d9c25b555a2e1bb3146", "title": "Quick Revision By Rajwant Sir", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a184f79ba71700b4536c8d0", "rawId": "6a184f79ba71700b4536c8d0", "title": "Mission 11th Comeback", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26c3583c0ee5ef0a798c59", "rawId": "6a26c3583c0ee5ef0a798c59", "title": "Extra Books By Rajwant Sir || Only PDF", "videoCount": 0, "notesCount": 22, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3d38b919a5322dac482492", "rawId": "6a3d38b919a5322dac482492", "title": "Summary Lecture By Rajwant Sir", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869763", "rawId": "69dc843271d06abbf3869763", "title": "Units and Measurement", "videoCount": 13, "notesCount": 24, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69f8b42d721c63d92d47ce87", "rawId": "69f8b42d721c63d92d47ce87", "title": "Parakram Assignment By Rajwant Sir || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869765", "rawId": "69dc843271d06abbf3869765", "title": "Mathematical Tools", "videoCount": 11, "notesCount": 22, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda1", "rawId": "69ea2e2d5f0e7bca9203cda1", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e6", "rawId": "69fc8dc04ada9d82ba4574e6", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd4", "rawId": "6a1affc93ea033f60ab1ebd4", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869767", "rawId": "69dc843271d06abbf3869767", "title": "Motion in a Straight Line", "videoCount": 19, "notesCount": 32, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2782", "rawId": "69f894bbba91836416be2782", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3c02abcb13043ba047b2c9", "rawId": "6a3c02abcb13043ba047b2c9", "title": "Homework Discussion", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869769", "rawId": "69dc843271d06abbf3869769", "title": "Motion in a Plane", "videoCount": 17, "notesCount": 31, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976b", "rawId": "69dc843271d06abbf386976b", "title": "Laws of Motion", "videoCount": 21, "notesCount": 48, "dppCount": 14, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976d", "rawId": "69dc843271d06abbf386976d", "title": "Circular Motion", "videoCount": 8, "notesCount": 21, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6aae86484f23a868b80e0d2a", "rawId": "6aae86484f23a868b80e0d2a", "title": "60 Minute NCERT", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976f", "rawId": "69dc843271d06abbf386976f", "title": "Work, Energy and Power", "videoCount": 7, "notesCount": 16, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869771", "rawId": "69dc843271d06abbf3869771", "title": "Centre of Mass & System of Particles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869773", "rawId": "69dc843271d06abbf3869773", "title": "Rotational Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869775", "rawId": "69dc843271d06abbf3869775", "title": "Gravitation", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a940a3c4001a4ad6df097fd", "rawId": "6a940a3c4001a4ad6df097fd", "title": "Kinetic Theory & Thermodynamics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869777", "rawId": "69dc843271d06abbf3869777", "title": "Mechanical Properties of Solids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869779", "rawId": "69dc843271d06abbf3869779", "title": "Mechanical Properties of Fluids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977b", "rawId": "69dc843271d06abbf386977b", "title": "Thermal Properties of Matter", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977f", "rawId": "69dc843271d06abbf386977f", "title": "Simple Harmonic Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869781", "rawId": "69dc843271d06abbf3869781", "title": "Waves", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569aeeffdf9567d75f816", "subjectId": "688ddb6fa4bed5089e148757", "name": "Physical Chemistry By Rahul Dudi Sir", "faculty": "Rahul Dudi Sir", "teachers": [{"_id": "62dfedb7479b3a001295c283", "firstName": "Rahul", "lastName": "Dudi Sir", "name": "Rahul Dudi Sir", "qualification": "B.Tech from NIT Jaipur", "experience": "13 Years", "featuredLine": "Dada, Haan na bolna padega", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c4994a81-8d4e-4225-826d-72339ab3610e.png", "introVideoThumbnail": "https://static.pw.live/69a0a4c374c6f567176ec713", "subject": "Chemistry"}], "lectureCount": 85, "tagCount": 19, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/9668a57a-4b92-438e-b3fc-eb2572d05bc0.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3362", "rawId": "69b571ed5582e24e8c2c3362", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65a", "rawId": "69b5720d995ec8a0398cd65a", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c4", "rawId": "69b5723a961c2d315a5f40c4", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c340f", "rawId": "69b572595582e24e8c2c340f", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02b", "rawId": "69ddedcc91fe5021c8acb02b", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 50, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fb42218de365a490798628", "rawId": "69fb42218de365a490798628", "title": "Homework Discussion", "videoCount": 15, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a16dc6d981ebbb7c4a5dc48", "rawId": "6a16dc6d981ebbb7c4a5dc48", "title": "Mission 11th Comeback", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3cdefb751076ac17bfa781", "rawId": "6a3cdefb751076ac17bfa781", "title": "Revision", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869783", "rawId": "69dc843271d06abbf3869783", "title": "Mole Concept", "videoCount": 31, "notesCount": 48, "dppCount": 17, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869785", "rawId": "69dc843271d06abbf3869785", "title": "Structure of Atom", "videoCount": 18, "notesCount": 28, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda2", "rawId": "69ea2e2d5f0e7bca9203cda2", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e7", "rawId": "69fc8dc04ada9d82ba4574e7", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd5", "rawId": "6a1affc93ea033f60ab1ebd5", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869787", "rawId": "69dc843271d06abbf3869787", "title": "State of matter", "videoCount": 5, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2783", "rawId": "69f894bbba91836416be2783", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869789", "rawId": "69dc843271d06abbf3869789", "title": "Thermodynamics", "videoCount": 7, "notesCount": 17, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978b", "rawId": "69dc843271d06abbf386978b", "title": "Redox Reaction", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978d", "rawId": "69dc843271d06abbf386978d", "title": "Chemical Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978f", "rawId": "69dc843271d06abbf386978f", "title": "Ionic Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569cab32b3601588a690b", "subjectId": "681cb395f9a9aca4a4b4891a", "name": "Inorganic Chemistry By Kunwar Om Pandey Sir", "faculty": "Kunwar Om Pandey Sir", "teachers": [{"_id": "63689057ef30b800110f8705", "firstName": "Kunwar Om", "lastName": "Pandey Sir", "name": "Kunwar Om Pandey Sir", "qualification": "M.Sc. - IIT Delhi", "experience": "11 Years", "featuredLine": "Hello UQTs", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/ecc5f817-8b53-4e59-b58c-979c473e2315.png", "introVideoThumbnail": "https://static.pw.live/69a0b5312daadfa8201f4128", "subject": "Inorganic Chemistry"}], "lectureCount": 49, "tagCount": 16, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0a9d5bdd-84b1-4964-ba97-0fd593e24cd3.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3363", "rawId": "69b571ed5582e24e8c2c3363", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65b", "rawId": "69b5720d995ec8a0398cd65b", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c5", "rawId": "69b5723a961c2d315a5f40c5", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3410", "rawId": "69b572595582e24e8c2c3410", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a3392fb911e3f8197168d24", "rawId": "6a3392fb911e3f8197168d24", "title": "EaJEE Notes for IOC || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a33b2fbf2c9003d9a651f93", "rawId": "6a33b2fbf2c9003d9a651f93", "title": "Kattar Advanced EaJEE Batch", "videoCount": 5, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869791", "rawId": "69dc843271d06abbf3869791", "title": "Periodic Table", "videoCount": 14, "notesCount": 23, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869793", "rawId": "69dc843271d06abbf3869793", "title": "Chemical Bonding", "videoCount": 26, "notesCount": 47, "dppCount": 14, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02c", "rawId": "69ddedcc91fe5021c8acb02c", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 40, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda3", "rawId": "69ea2e2d5f0e7bca9203cda3", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e8", "rawId": "69fc8dc04ada9d82ba4574e8", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd6", "rawId": "6a1affc93ea033f60ab1ebd6", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869795", "rawId": "69dc843271d06abbf3869795", "title": "P-block Elements (Group 13 and 14)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69f894bbba91836416be2784", "rawId": "69f894bbba91836416be2784", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869797", "rawId": "69dc843271d06abbf3869797", "title": "S-block Element", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869799", "rawId": "69dc843271d06abbf3869799", "title": "Hydrogen and its Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b569e8cd9eea58b9fe60da", "subjectId": "688ddbdc510064d4022855c9", "name": "Maths By Sachin Jakhar Sir", "faculty": "Sachin Jakhar Sir", "teachers": [{"_id": "60879b8eeb913f00448eeda8", "firstName": "Sachin", "lastName": "Jakhar Sir", "name": "Sachin Jakhar Sir", "qualification": "B.Tech, NIT-KURUKSHETRA", "experience": "13 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7ecbae73-2fda-4189-8f39-c8f71dff1110.png", "introVideoThumbnail": "https://static.pw.live/69a0a64589933c416221f9b2", "subject": "Mathematics"}], "lectureCount": 112, "tagCount": 34, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0fe1276d-853a-4816-912f-dd491976d805.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3364", "rawId": "69b571ed5582e24e8c2c3364", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 34, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65c", "rawId": "69b5720d995ec8a0398cd65c", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c6", "rawId": "69b5723a961c2d315a5f40c6", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3411", "rawId": "69b572595582e24e8c2c3411", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d39608eb6fb0cf65a653d9", "rawId": "69d39608eb6fb0cf65a653d9", "title": "Bridge Course Lectures", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02d", "rawId": "69ddedcc91fe5021c8acb02d", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 94, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d55cbfeb453284b098637", "rawId": "6a0d55cbfeb453284b098637", "title": "DIBY By Sachin Sir || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d85d9a52ade8f4ea05efa", "rawId": "6a0d85d9a52ade8f4ea05efa", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 12, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a16672b7b672dc71005c50c", "rawId": "6a16672b7b672dc71005c50c", "title": "Mission 11th Comeback", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26e1688a70b6caef00abb1", "rawId": "6a26e1688a70b6caef00abb1", "title": "DIBY Discussion By Sachin Sir", "videoCount": 7, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979b", "rawId": "69dc843271d06abbf386979b", "title": "Set Theory", "videoCount": 8, "notesCount": 15, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979d", "rawId": "69dc843271d06abbf386979d", "title": "Basic Mathematics", "videoCount": 21, "notesCount": 40, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2785", "rawId": "69f894bbba91836416be2785", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574e9", "rawId": "69fc8dc04ada9d82ba4574e9", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 13, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979f", "rawId": "69dc843271d06abbf386979f", "title": "Quadratic Equations", "videoCount": 14, "notesCount": 25, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda4", "rawId": "69ea2e2d5f0e7bca9203cda4", "title": "NCERT Discussion", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a1", "rawId": "69dc843271d06abbf38697a1", "title": "Sequence and Series", "videoCount": 12, "notesCount": 23, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a3", "rawId": "69dc843271d06abbf38697a3", "title": "Trigonometric Functions", "videoCount": 13, "notesCount": 30, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a5", "rawId": "69dc843271d06abbf38697a5", "title": "Trigonometric  Equation", "videoCount": 7, "notesCount": 15, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a7", "rawId": "69dc843271d06abbf38697a7", "title": "Relations and Functions", "videoCount": 5, "notesCount": 15, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a9", "rawId": "69dc843271d06abbf38697a9", "title": "Permutations and Combinations", "videoCount": 11, "notesCount": 32, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ab", "rawId": "69dc843271d06abbf38697ab", "title": "Binomial theorem", "videoCount": 4, "notesCount": 8, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ad", "rawId": "69dc843271d06abbf38697ad", "title": "Straight Lines", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697af", "rawId": "69dc843271d06abbf38697af", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b1", "rawId": "69dc843271d06abbf38697b1", "title": "Conic Sections:Parabola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b3", "rawId": "69dc843271d06abbf38697b3", "title": "Conic Sections:Ellipse", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b5", "rawId": "69dc843271d06abbf38697b5", "title": "Conic Sections:Hyperbola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b7", "rawId": "69dc843271d06abbf38697b7", "title": "Complex Number", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b9", "rawId": "69dc843271d06abbf38697b9", "title": "Limits and Derivatives", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bb", "rawId": "69dc843271d06abbf38697bb", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bd", "rawId": "69dc843271d06abbf38697bd", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bf", "rawId": "69dc843271d06abbf38697bf", "title": "Introduction to Three Dimensional Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c1", "rawId": "69dc843271d06abbf38697c1", "title": "Linear Inequalities", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c3", "rawId": "69dc843271d06abbf38697c3", "title": "Solution of Triangle", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b56a34e90793e4f312def2", "subjectId": "688ddaa9f06be6d3ed36ad34", "name": "Inorganic Chemistry By Amitabh Sharma Sir", "faculty": "Amitabh Sharma Sir", "teachers": [{"_id": "6116629e0de07a0018a82f52", "firstName": "Amitabh", "lastName": "Sharma Sir", "name": "Amitabh Sharma Sir", "qualification": "M.Sc. from Kota University", "experience": "20 Years", "featuredLine": "In place of Terminator", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0a398e4a-cbe6-4c10-9cb2-6cd6a5c8d891.png", "introVideoThumbnail": "https://static.pw.live/69a0a8e959e2bca14359bcf2", "subject": "Inorganic Chemistry"}], "lectureCount": 80, "tagCount": 17, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/fa5606a8-b247-4a8f-9f51-b5f90bf74793.pdf", "schedules": [], "chapters": [{"id": "69b571ed5582e24e8c2c3365", "rawId": "69b571ed5582e24e8c2c3365", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5720d995ec8a0398cd65d", "rawId": "69b5720d995ec8a0398cd65d", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5723a961c2d315a5f40c7", "rawId": "69b5723a961c2d315a5f40c7", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b572595582e24e8c2c3412", "rawId": "69b572595582e24e8c2c3412", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869792", "rawId": "69dc843271d06abbf3869792", "title": "Periodic Table", "videoCount": 15, "notesCount": 25, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb02e", "rawId": "69ddedcc91fe5021c8acb02e", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 39, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869794", "rawId": "69dc843271d06abbf3869794", "title": "Chemical Bonding", "videoCount": 25, "notesCount": 51, "dppCount": 17, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda5", "rawId": "69ea2e2d5f0e7bca9203cda5", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ea", "rawId": "69fc8dc04ada9d82ba4574ea", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd7", "rawId": "6a1affc93ea033f60ab1ebd7", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 2, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a33e4e9833ef5655460ae26", "rawId": "6a33e4e9833ef5655460ae26", "title": "TFT || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a36ad486feb86ff4e6533c0", "rawId": "6a36ad486feb86ff4e6533c0", "title": "Cadbury Shot Challenge || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869796", "rawId": "69dc843271d06abbf3869796", "title": "P-block Elements (Group 13 and 14)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69f894bbba91836416be2786", "rawId": "69f894bbba91836416be2786", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869798", "rawId": "69dc843271d06abbf3869798", "title": "S-block Element", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a33f714318f8e6801ed2c4b", "rawId": "6a33f714318f8e6801ed2c4b", "title": "CBD || Only Video", "videoCount": 36, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979a", "rawId": "69dc843271d06abbf386979a", "title": "Hydrogen and its Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b57278504f6b8cced25f84", "subjectId": "69b572011258ab0500483d04", "name": "Organic Chemistry by Ashutosh Gautam Sir", "faculty": "Ashutosh Gautam Sir", "teachers": [{"_id": "6401eed92f8f890018cb9f45", "firstName": "Ashutosh", "lastName": "Gautam Sir", "name": "Ashutosh Gautam Sir", "qualification": "M.Sc chemistry", "experience": "", "featuredLine": "", "imageUrl": "https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/6d43e0ff-3120-4bfd-8313-8060a026cbd3.png", "introVideoThumbnail": "", "subject": "Organic Chemistry"}], "lectureCount": 0, "tagCount": 10, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/f4b4c506-c043-4a56-87f5-63ed586ad978.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286362", "rawId": "69b573702550c4b1f7286362", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680564", "rawId": "6a940a3b06bbf08826680564", "title": "Some Basic principles and Technique IUPAC Naming", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b573de995ec8a0398cdb72", "rawId": "69b573de995ec8a0398cdb72", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680565", "rawId": "6a940a3b06bbf08826680565", "title": "Some Basic principles and Techniques GOC", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b573f04a3a45b506c5cf70", "rawId": "69b573f04a3a45b506c5cf70", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3b06bbf08826680566", "rawId": "6a940a3b06bbf08826680566", "title": "Some Basic principles and Techniques Isomerism", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5740ca83ba35254bbc222", "rawId": "69b5740ca83ba35254bbc222", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc813a5172d97c563ddde8", "rawId": "69dc813a5172d97c563ddde8", "title": "Hydrocarbon", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddea", "rawId": "69dc813a5172d97c563dddea", "title": "Purification and Analysis of Organic Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddec", "rawId": "69dc813a5172d97c563dddec", "title": "Environmental Chemistry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b5729d45cca26612727f1a", "subjectId": "69b572321258ab0500483ec4", "name": "Maths by Amarnath Anand Sir (Anna Sir)", "faculty": "Amarnath Anand Sir", "teachers": [{"_id": "69b825790d2994f171399dc8", "firstName": "Amarnath", "lastName": "Anand Sir", "name": "Amarnath Anand Sir", "qualification": "B.Tech from IIT Delhi", "experience": "21 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/540cf01e-f91a-4408-bf53-931b70fe8270.png", "introVideoThumbnail": "https://static.pw.live/6a0d464c9c341af80151a5e0", "subject": "Mathematics"}], "lectureCount": 181, "tagCount": 31, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/a9d323ab-b31e-413b-933f-9369a465db58.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286363", "rawId": "69b573702550c4b1f7286363", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 34, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb73", "rawId": "69b573de995ec8a0398cdb73", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf71", "rawId": "69b573f04a3a45b506c5cf71", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc223", "rawId": "69b5740ca83ba35254bbc223", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0d85d9a52ade8f4ea05efb", "rawId": "6a0d85d9a52ade8f4ea05efb", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 12, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979c", "rawId": "69dc843271d06abbf386979c", "title": "Sets", "videoCount": 13, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386979e", "rawId": "69dc843271d06abbf386979e", "title": "Basic Mathematics", "videoCount": 40, "notesCount": 60, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb030", "rawId": "69ddedcc91fe5021c8acb030", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 93, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ec", "rawId": "69fc8dc04ada9d82ba4574ec", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 13, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a0", "rawId": "69dc843271d06abbf38697a0", "title": "Quadratic Equations", "videoCount": 20, "notesCount": 30, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2788", "rawId": "69f894bbba91836416be2788", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a2", "rawId": "69dc843271d06abbf38697a2", "title": "Sequence and Series", "videoCount": 21, "notesCount": 31, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda7", "rawId": "69ea2e2d5f0e7bca9203cda7", "title": "NCERT Discussion", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a4", "rawId": "69dc843271d06abbf38697a4", "title": "Trigonometric Functions", "videoCount": 25, "notesCount": 39, "dppCount": 12, "isStarted": true, "lectures": []}, {"id": "6a6dc5efbb39334e3c3c4f84", "rawId": "6a6dc5efbb39334e3c3c4f84", "title": "Interaction Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a6", "rawId": "69dc843271d06abbf38697a6", "title": "Trigonometric  Equation", "videoCount": 10, "notesCount": 16, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697a8", "rawId": "69dc843271d06abbf38697a8", "title": "Relation and Function", "videoCount": 7, "notesCount": 17, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697aa", "rawId": "69dc843271d06abbf38697aa", "title": "Permutations and Combinations", "videoCount": 20, "notesCount": 37, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ac", "rawId": "69dc843271d06abbf38697ac", "title": "Binomial theorem", "videoCount": 16, "notesCount": 24, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf38697ae", "rawId": "69dc843271d06abbf38697ae", "title": "Straight Lines", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b0", "rawId": "69dc843271d06abbf38697b0", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b2", "rawId": "69dc843271d06abbf38697b2", "title": "Conic Sections:Parabola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b4", "rawId": "69dc843271d06abbf38697b4", "title": "Conic Sections:Ellipse", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b6", "rawId": "69dc843271d06abbf38697b6", "title": "Conic Sections:Hyperbola", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697b8", "rawId": "69dc843271d06abbf38697b8", "title": "Complex Number", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697ba", "rawId": "69dc843271d06abbf38697ba", "title": "Limits and Derivatives", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697bc", "rawId": "69dc843271d06abbf38697bc", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697be", "rawId": "69dc843271d06abbf38697be", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c0", "rawId": "69dc843271d06abbf38697c0", "title": "Introduction to Three Dimensional Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c2", "rawId": "69dc843271d06abbf38697c2", "title": "Linear Inequalities", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf38697c4", "rawId": "69dc843271d06abbf38697c4", "title": "Solution of Triangle", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b572d3c9a2b804fd67bbc5", "subjectId": "69b571cc519486b6249f8cc3", "name": "Physical Chemistry by Vijay kumar Tripathi Sir (VKT Sir)", "faculty": "Vijay Kumar Tripathi Sir", "teachers": [{"_id": "68b835d22c41161529275f46", "firstName": "Vijay", "lastName": "Kumar Tripathi Sir", "name": "Vijay Kumar Tripathi Sir", "qualification": "B.Tech from IIT BHU", "experience": "", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7b0810c2-b23a-463f-b8cc-3d22cdfc1cce.png", "introVideoThumbnail": "", "subject": "Physical Chemistry"}], "lectureCount": 56, "tagCount": 17, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/735a87b1-0891-446c-9d42-31cfa64dea03.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286364", "rawId": "69b573702550c4b1f7286364", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb74", "rawId": "69b573de995ec8a0398cdb74", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf72", "rawId": "69b573f04a3a45b506c5cf72", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc224", "rawId": "69b5740ca83ba35254bbc224", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869784", "rawId": "69dc843271d06abbf3869784", "title": "Mole Concept", "videoCount": 20, "notesCount": 39, "dppCount": 19, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869786", "rawId": "69dc843271d06abbf3869786", "title": "Structure of Atom", "videoCount": 17, "notesCount": 33, "dppCount": 16, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb031", "rawId": "69ddedcc91fe5021c8acb031", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 49, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda8", "rawId": "69ea2e2d5f0e7bca9203cda8", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ed", "rawId": "69fc8dc04ada9d82ba4574ed", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebd9", "rawId": "6a1affc93ea033f60ab1ebd9", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869788", "rawId": "69dc843271d06abbf3869788", "title": "State of matter", "videoCount": 10, "notesCount": 23, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be2789", "rawId": "69f894bbba91836416be2789", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978a", "rawId": "69dc843271d06abbf386978a", "title": "Thermodynamics", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a1591079986c702f25cfe20", "rawId": "6a1591079986c702f25cfe20", "title": "Practice Sheet", "videoCount": 0, "notesCount": 1, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386978c", "rawId": "69dc843271d06abbf386978c", "title": "Redox Reaction", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386978e", "rawId": "69dc843271d06abbf386978e", "title": "Chemical Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869790", "rawId": "69dc843271d06abbf3869790", "title": "Ionic Equilibrium", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b572f65582e24e8c2c361e", "subjectId": "69b57196551c493bc059da1f", "name": "Physics by Varun Chauhan sir", "faculty": "Varun Chauhan Sir", "teachers": [{"_id": "64366780e524540018eb7bfa", "firstName": "Varun", "lastName": "Chauhan Sir", "name": "Varun Chauhan Sir", "qualification": "B.Tech", "experience": "", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/deed3f9e-6911-4893-b3f3-9e51c0bbcefa.png", "introVideoThumbnail": "", "subject": "Physics"}], "lectureCount": 97, "tagCount": 25, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/278d2bff-8f35-4dc4-bc45-45d21a33ed9a.pdf", "schedules": [], "chapters": [{"id": "69b573702550c4b1f7286365", "rawId": "69b573702550c4b1f7286365", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573de995ec8a0398cdb75", "rawId": "69b573de995ec8a0398cdb75", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 18, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b573f04a3a45b506c5cf73", "rawId": "69b573f04a3a45b506c5cf73", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69b5740ca83ba35254bbc225", "rawId": "69b5740ca83ba35254bbc225", "title": "PYQ's Blueprint || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869764", "rawId": "69dc843271d06abbf3869764", "title": "Units and Measurements", "videoCount": 11, "notesCount": 21, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869766", "rawId": "69dc843271d06abbf3869766", "title": "Mathematical Tools", "videoCount": 11, "notesCount": 19, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69ddedcc91fe5021c8acb032", "rawId": "69ddedcc91fe5021c8acb032", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 88, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ea2e2d5f0e7bca9203cda9", "rawId": "69ea2e2d5f0e7bca9203cda9", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fc8dc04ada9d82ba4574ee", "rawId": "69fc8dc04ada9d82ba4574ee", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a1affc93ea033f60ab1ebda", "rawId": "6a1affc93ea033f60ab1ebda", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 9, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869768", "rawId": "69dc843271d06abbf3869768", "title": "Motion in a Straight Line", "videoCount": 16, "notesCount": 29, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69f894bbba91836416be278a", "rawId": "69f894bbba91836416be278a", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976a", "rawId": "69dc843271d06abbf386976a", "title": "Motion in a Plane", "videoCount": 15, "notesCount": 26, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976c", "rawId": "69dc843271d06abbf386976c", "title": "Laws of Motion + Friction", "videoCount": 17, "notesCount": 34, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf386976e", "rawId": "69dc843271d06abbf386976e", "title": "Circular Motion", "videoCount": 7, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869770", "rawId": "69dc843271d06abbf3869770", "title": "Work, Energy and Power", "videoCount": 11, "notesCount": 25, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869772", "rawId": "69dc843271d06abbf3869772", "title": "Centre of Mass and System of Particles", "videoCount": 3, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69dc843271d06abbf3869774", "rawId": "69dc843271d06abbf3869774", "title": "Rotational Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869776", "rawId": "69dc843271d06abbf3869776", "title": "Gravitation", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a940a3eba8d1ec44e9b3c05", "rawId": "6a940a3eba8d1ec44e9b3c05", "title": "Kinetic Theory & Thermodynamics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869778", "rawId": "69dc843271d06abbf3869778", "title": "Mechanical Properties of Solids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977a", "rawId": "69dc843271d06abbf386977a", "title": "Mechanical Properties of Fluids", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf386977c", "rawId": "69dc843271d06abbf386977c", "title": "Thermal Properties of Matter", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869780", "rawId": "69dc843271d06abbf3869780", "title": "Simple Harmonic Motion", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc843271d06abbf3869782", "rawId": "69dc843271d06abbf3869782", "title": "Waves", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69b5746d613c5163ab7a709e", "subjectId": "681cb1cb7d61cac0dde80663", "name": "Organic Chemistry By Pankaj Sijariya Sir", "faculty": "Pankaj Sijariya Sir", "teachers": [{"_id": "609e9ff6ef20f40011aa0dd1", "firstName": "Pankaj", "lastName": "Sijariya Sir", "name": "Pankaj Sijariya Sir", "qualification": "B.Tech from HBTI Kanpur in Electronic Engineering ", "experience": "17 Years", "featuredLine": "Toh main ye rishta pakka samjhu", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c4de34da-84f8-4a89-960a-dbdec7122b07.png", "introVideoThumbnail": "https://static.pw.live/69a0aaa259e2bca14359bdb6", "subject": "Organic Chemistry"}], "lectureCount": 1, "tagCount": 11, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/9e9f7821-f65e-48d6-8d42-064f3c9cf75f.pdf", "schedules": [], "chapters": [{"id": "69b576f42b780dc1da4fe2fb", "rawId": "69b576f42b780dc1da4fe2fb", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3c", "rawId": "6a940a3e729613806f4bec3c", "title": "Some Basic principles and Technique IUPAC Naming", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b57707a83ba35254bbc9c3", "rawId": "69b57707a83ba35254bbc9c3", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3d", "rawId": "6a940a3e729613806f4bec3d", "title": "Some Basic principles and Techniques GOC", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5771b45cca26612729665", "rawId": "69b5771b45cca26612729665", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a940a3e729613806f4bec3e", "rawId": "6a940a3e729613806f4bec3e", "title": "Some Basic principles and Techniques Isomerism", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69b5772ee90793e4f3130d8a", "rawId": "69b5772ee90793e4f3130d8a", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d523ceadefb7e5260d07a4", "rawId": "69d523ceadefb7e5260d07a4", "title": "Bridge Course Lectures", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69dc813a5172d97c563ddde9", "rawId": "69dc813a5172d97c563ddde9", "title": "Hydrocarbon", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563dddeb", "rawId": "69dc813a5172d97c563dddeb", "title": "Purification and Analysis of Organic Compound", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69dc813a5172d97c563ddded", "rawId": "69dc813a5172d97c563ddded", "title": "Environmental Chemistry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "6a6b44faf834f38ed6f9120d", "subjectId": "688dd9660fb5f084935d611f", "name": "Physics By Saleem Ahmad Sir", "faculty": "Saleem Ahmad Sir", "teachers": [{"_id": "62ebffe15957260018f68abb", "firstName": "Saleem", "lastName": "Ahmad Sir", "name": "Saleem Ahmad Sir", "qualification": "B.Tech from NIT Trichy (Electronics And Communication)", "experience": "13 Years", "featuredLine": "Kaddu gang", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/60062667-872c-4451-b40a-36cc36e1b7b3.png", "introVideoThumbnail": "https://static.pw.live/69a0a45089933c416221f969", "subject": "Physics"}], "lectureCount": 242, "tagCount": 32, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/051da37d-1e8f-46ad-b833-85670162acb7.pdf", "schedules": [], "chapters": [{"id": "6a6b464726b614560bcecdc1", "rawId": "6a6b464726b614560bcecdc1", "title": "Interaction Session || Only Video", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b464bc3d57b41a8d37ff2", "rawId": "6a6b464bc3d57b41a8d37ff2", "title": "Summary Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b465326b614560bced6f7", "rawId": "6a6b465326b614560bced6f7", "title": "Revision Question Practice", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4630ce4ac4e9ab51eecb", "rawId": "6a6b4630ce4ac4e9ab51eecb", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4630ce4ac4e9ab51eed0", "rawId": "6a6b4630ce4ac4e9ab51eed0", "title": "Formula Sheet || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b47b06f3a898b0ae5ee6b", "rawId": "6a6b47b06f3a898b0ae5ee6b", "title": "Practice Sheet (JEE Main) - Manthan || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4631ce4ac4e9ab51eed5", "rawId": "6a6b4631ce4ac4e9ab51eed5", "title": "NCERT Discussion", "videoCount": 17, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b462cce4ac4e9ab51eebe", "rawId": "6a6b462cce4ac4e9ab51eebe", "title": "KPP PDF By Saleem Sir", "videoCount": 0, "notesCount": 25, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b462fce4ac4e9ab51eec6", "rawId": "6a6b462fce4ac4e9ab51eec6", "title": "KPP Solution By Saleem Sir", "videoCount": 19, "notesCount": 20, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b467d26b614560bcefa26", "rawId": "6a6b467d26b614560bcefa26", "title": "SKC by Saleem Sir || Only PDF", "videoCount": 0, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b46a426b614560bcf1942", "rawId": "6a6b46a426b614560bcf1942", "title": "HCV || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b46df26b614560bcf4ae8", "rawId": "6a6b46df26b614560bcf4ae8", "title": "Revison Section || Only PDF", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b475026b614560bcfaafd", "rawId": "6a6b475026b614560bcfaafd", "title": "Revision Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b461cce4ac4e9ab51ee98", "rawId": "6a6b461cce4ac4e9ab51ee98", "title": "Ch 01: Units and Dimension", "videoCount": 11, "notesCount": 18, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a6b462bce4ac4e9ab51eeb9", "rawId": "6a6b462bce4ac4e9ab51eeb9", "title": "Ch 02 : Basic Maths", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b4634ce4ac4e9ab51eedd", "rawId": "6a6b4634ce4ac4e9ab51eedd", "title": "Ch 03 : Vectors", "videoCount": 14, "notesCount": 15, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a6b464ac3d57b41a8d37fec", "rawId": "6a6b464ac3d57b41a8d37fec", "title": "Ch 04 : Motion in a Straight Line", "videoCount": 17, "notesCount": 20, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a6b466726b614560bcee7ce", "rawId": "6a6b466726b614560bcee7ce", "title": "Ch 05 : Errors and Measurements", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b466d26b614560bceed48", "rawId": "6a6b466d26b614560bceed48", "title": "Ch 06 : Motion in a Plane", "videoCount": 16, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a6b468e26b614560bcf0836", "rawId": "6a6b468e26b614560bcf0836", "title": "Ch 07 : Laws of Motion", "videoCount": 15, "notesCount": 17, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a6b46b026b614560bcf23c3", "rawId": "6a6b46b026b614560bcf23c3", "title": "Ch 08 : Circular Motion", "videoCount": 6, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a6b46bd26b614560bcf2e71", "rawId": "6a6b46bd26b614560bcf2e71", "title": "Ch 09 : Work, Power, Energy", "videoCount": 14, "notesCount": 16, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a6b46d926b614560bcf457d", "rawId": "6a6b46d926b614560bcf457d", "title": "Ch 10 : Centre of Mass", "videoCount": 16, "notesCount": 23, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a6b46f426b614560bcf5b26", "rawId": "6a6b46f426b614560bcf5b26", "title": "Ch 11 : Thermal Properties of Matter", "videoCount": 12, "notesCount": 14, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b46fc26b614560bcf621e", "rawId": "6a6b46fc26b614560bcf621e", "title": "Ch 12 : Mechanical Properties of Solids", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b471826b614560bcf7aa4", "rawId": "6a6b471826b614560bcf7aa4", "title": "Ch 13 : Rotational Motion", "videoCount": 25, "notesCount": 29, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a6b473e26b614560bcf9bce", "rawId": "6a6b473e26b614560bcf9bce", "title": "Ch 14 : KTG and Thermodynamics", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b474fc3d57b41a8d38098", "rawId": "6a6b474fc3d57b41a8d38098", "title": "Ch 15 : Oscillations", "videoCount": 10, "notesCount": 15, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a6b4769c3d57b41a8d382d2", "rawId": "6a6b4769c3d57b41a8d382d2", "title": "Ch 16 : Waves", "videoCount": 13, "notesCount": 13, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b4780c3d57b41a8d382fe", "rawId": "6a6b4780c3d57b41a8d382fe", "title": "Ch 17 : Mechanical Properties of Fluids", "videoCount": 13, "notesCount": 15, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a6b479ec3d57b41a8d38381", "rawId": "6a6b479ec3d57b41a8d38381", "title": "Ch 18 : Gravitation", "videoCount": 5, "notesCount": 7, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "6a6b47c16f3a898b0ae5ee8b", "rawId": "6a6b47c16f3a898b0ae5ee8b", "title": "Must Do Questions", "videoCount": 0, "notesCount": 19, "dppCount": 19, "isStarted": true, "lectures": []}]}]}, "67790151518b938bc630052d": {"batchId": "67790151518b938bc630052d", "name": "Udaan 2027 (Class 10th)", "class": "10", "exam": "SCHOOL PREPARATION, FOUNDATION", "byName": "For Class 10th CBSE Students", "description": "<!DOCTYPE html>\n<html>\n\n  <head>\n     <style>\n       .desc-container {\n         display: flex;\n         flex-direction: column;\n         padding: 16px 13px;\n       }\n       \n       .desc-row {\n         display: flex;\n         align-items: center;\n         margin-bottom: 16px;\n         border-bottom: 1px solid #efefef;\n         padding: 4px 0;\n       }\n       \n       .desc-row-item-title {\n         font-size: 14px;\n         line-height: 22px;\n         margin-right: 6px;\n       }\n\n       .desc-row-item-content {\n         font-size: 14px;\n         line-height: 18px;\n         margin-right: 6px;\n       }\n     </style>\n  </head>\n\n  <body>\n<div class=\"desc-container\">\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">01.</div>\n<div class=\"desc-row-item-content\"><strong>This batch includes comprehensive coverage of all the subjects for CBSE 10th.</strong></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">02.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Faculty members will cover <span class=\"sub-text\">Physics, Chemistry, Biology, Maths, English (Language &amp; Literature), English (Communicative), SST, Computer Applications, Information Technology, Artificial Intelligence, Sanskrit and Hindi (Course A and Course B).</span></span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">03.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">5 Days scheduled classes will be held in a week.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">04.</div>\n<div class=\"desc-row-item-content\"><strong>Classes will be Live, per day 2 classes will be held.</strong></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">05.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Recorded Lectures will be provided for Computer Applications, Artificial Intelligence, Sanskrit and Hindi (Course A and Course B).</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">06.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Duration of the lectures will be 1 hour 15 mins.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">07.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">PDF Notes of each Class will be uploaded on PW App.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">08.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">DPP with their Video Solution in Quiz format.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">09.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Dedicated faculties for solving doubts through best-in-class doubt engine.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">10.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Peer-to-Peer doubt solving will be provided.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">11.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Scheduled tests will be held according to the planner.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">12.</div>\n<div class=\"desc-row-item-content\"><strong>Classes starting from - 7th April 2026</strong></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">13.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Complete Syllabus will be covered till October 31,2026</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">14.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Complete Revision of whole syllabus for Final Exam will be concluded by 31st January 2027</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">15.</div>\n<div class=\"desc-row-item-content\"><span style=\"font-weight: 400;\">Chapterwise Handwritten Notes will be provided.</span></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">16.</div>\n<div class=\"desc-row-item-content\">For App/Web Navigation the latest Feature Updates &amp; Student Support please subscribe to our Support YouTube channel:<br /><a href=\"https://www.youtube.com/@pwstudentsupport\" target=\"_blank\" rel=\"noopener nofollow noreferrer\">https://www.youtube.com/@pwstudentsupport</a></div>\n</div>\n<div class=\"desc-row\">\n<div class=\"desc-row-item-title\">17.</div>\n<div class=\"desc-row-item-content\">The registration fee is included in the price of the batch which is showing on the website. The breakup of registration fee will be mentioned on invoice. You may be provided with access to Notes, PYQ&rsquo;s. Mock Test Papers, AITS Test Series, Previous year batches &amp; other materials, the access can vary depending on the batch you purchase, so that exact details might change from one batch to another.</div>\n</div>\n</div>\n</body>\n</html>", "previewImage": {"_id": "6a742189965eac360fda63a0", "name": "file.png", "baseUrl": "https://static.pw.live/", "key": "5eb393ee95fab7468a79d189/ADMIN/4ac61f87-cd99-45ae-b4b7-7166e797013a.png"}, "subjects": [{"id": "69d39cb53dc94f34bcbbde22", "subjectId": "69d3967d70c3a1e721b7d3dc", "name": "Physics by Rakshak Sir", "faculty": "Rakshak Sir", "teachers": [{"_id": "609e9fc5e429d9001110e826", "firstName": "Rakshak", "lastName": "Sir", "name": "Rakshak Sir", "qualification": "B. Tech. in Computer Science & Engineering", "experience": "11 Years", "featuredLine": "Hello my dear pigeons", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/21333e3c-0538-4e25-b69b-6be53e9d4db2.png", "introVideoThumbnail": "https://static.pw.live/659d1af134cac100197dda6f", "subject": "Physics"}], "lectureCount": 33, "tagCount": 7, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/312562ed-e0df-4293-b9d0-33609cdb6a7d.pdf", "schedules": [], "chapters": [{"id": "69d3c1c57afd22979344e75f", "rawId": "69d3c1c57afd22979344e75f", "title": "Light - Reflection & Refraction", "videoCount": 9, "notesCount": 15, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d3c1c57afd22979344e760", "rawId": "69d3c1c57afd22979344e760", "title": "Human Eye & the Colorful World", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d3c1c57afd22979344e761", "rawId": "69d3c1c57afd22979344e761", "title": "Electricity", "videoCount": 9, "notesCount": 15, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d3c1c57afd22979344e762", "rawId": "69d3c1c57afd22979344e762", "title": "Magnetic Effects of Electric Current", "videoCount": 6, "notesCount": 10, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a50ae034bc9b6e593a4aed6", "rawId": "6a50ae034bc9b6e593a4aed6", "title": "Practice Session", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a187f1c71c05cf60710cebf", "rawId": "6a187f1c71c05cf60710cebf", "title": "Summary Lecture", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a05922c91bf39f89c625ae4", "rawId": "6a05922c91bf39f89c625ae4", "title": "Short Notes by Rakshak Sir || (Only PDF)", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d39ccf6022d08eeed438bd", "subjectId": "69d396a3414f7f861b887a88", "name": "Chemistry by Sunil Sir", "faculty": "Sunil Hingorani Sir", "teachers": [{"_id": "61b89b046867a20011e7ace2", "firstName": "Sunil", "lastName": "Hingorani Sir", "name": "Sunil Hingorani Sir", "qualification": "B.Tech (Mechanical) from reputed institute", "experience": "9 Years", "featuredLine": "Sundar Balak, Sundar Kanya 5. Keep Sunil Bhaiya and not Sunil Sir", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/020cd6e0-3314-480b-8505-5f25384d7c32.png", "introVideoThumbnail": "https://static.pw.live/63b3f98ad6cacf0018b99f45", "subject": "Chemistry"}], "lectureCount": 33, "tagCount": 11, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c2de9722-1c41-4679-ba43-bee1cdd88b1d.pdf", "schedules": [], "chapters": [{"id": "6a0421d70f54470f908da737", "rawId": "6a0421d70f54470f908da737", "title": "Short Notes || (Only PDF)", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3c1c5e01ef632542cc00b", "rawId": "69d3c1c5e01ef632542cc00b", "title": "Essential Chemistry Basics for\u00a0Class\u00a010", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3c1c5e01ef632542cc00c", "rawId": "69d3c1c5e01ef632542cc00c", "title": "Chemical Reactions and Equations", "videoCount": 8, "notesCount": 16, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d3c1c5e01ef632542cc00d", "rawId": "69d3c1c5e01ef632542cc00d", "title": "Acids, Bases & Salts", "videoCount": 9, "notesCount": 16, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d3c1c5e01ef632542cc00e", "rawId": "69d3c1c5e01ef632542cc00e", "title": "Metals and Non Metals", "videoCount": 8, "notesCount": 18, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d3c1c5e01ef632542cc00f", "rawId": "69d3c1c5e01ef632542cc00f", "title": "Carbon and its Compounds", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69e095b0e52b7eb7af97bea6", "rawId": "69e095b0e52b7eb7af97bea6", "title": "SUNIL BHAIYA CREATIONS", "videoCount": 3, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a187364c46e915a79dab16b", "rawId": "6a187364c46e915a79dab16b", "title": "Fast Mind Map Revision", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a19da08045c7ade9e27676e", "rawId": "6a19da08045c7ade9e27676e", "title": "CBSE PYQ's and CFQ's", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a193f39ba91891f99ddb567", "rawId": "6a193f39ba91891f99ddb567", "title": "Short Revision Notes By Sunil Sir || (Only PDF)", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7df4250d3bed5a04a333b8", "rawId": "6a7df4250d3bed5a04a333b8", "title": "Live Doubt Solving", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d39cebc933558ba19be3b7", "subjectId": "69d396c9515bf4a0a1aa20eb", "name": "Biology by Samridhi Ma'am", "faculty": "Samridhi Sharma Ma'am", "teachers": [{"_id": "60ae2a26ca2f69001802f402", "firstName": "Samridhi", "lastName": "Sharma Ma'am", "name": "Samridhi Sharma Ma'am", "qualification": "MSc", "experience": "8 Years", "featuredLine": "Kaise Hain Mere Pyaare Pookie and potatoes", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/d1da77f4-9d12-4689-a97e-7a11b8806085.png", "introVideoThumbnail": "https://static.pw.live/63b4201a20d42e00186e9df3", "subject": "Biology"}], "lectureCount": 27, "tagCount": 6, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/00f814c8-8cdb-4481-a79c-0047dc2e0df0.pdf", "schedules": [], "chapters": [{"id": "6a143fed7d9d2958d79a9340", "rawId": "6a143fed7d9d2958d79a9340", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3c1c5f25b231655180d06", "rawId": "69d3c1c5f25b231655180d06", "title": "Life Processes", "videoCount": 10, "notesCount": 18, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d3c1c5f25b231655180d07", "rawId": "69d3c1c5f25b231655180d07", "title": "Control and Coordination", "videoCount": 6, "notesCount": 11, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d3c1c5f25b231655180d08", "rawId": "69d3c1c5f25b231655180d08", "title": "How do Organisms\u00a0Reproduce", "videoCount": 7, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d3c1c5f25b231655180d09", "rawId": "69d3c1c5f25b231655180d09", "title": "Heredity", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3c1c5f25b231655180d0a", "rawId": "69d3c1c5f25b231655180d0a", "title": "Our Environment", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69d39d0cb693405495af4219", "subjectId": "69d3970e15586f1e1acad184", "name": "Science by Akshay Sir", "faculty": "Akshay Tyagi Sir", "teachers": [{"_id": "652a4339f054c400183c291d", "firstName": "Akshay", "lastName": "Tyagi Sir", "name": "Akshay Tyagi Sir", "qualification": "B.Sc (Delhi university), M.sc in physics", "experience": "10 Years", "featuredLine": " Shandaar jabardast jindabaad", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/5eaedf68-e6e0-47ba-bab4-00a6858a7dea.png", "introVideoThumbnail": "", "subject": "Physics"}], "lectureCount": 66, "tagCount": 16, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/6603fd56-d7dd-45fa-bafc-ab710bf21e17.pdf", "schedules": [], "chapters": [{"id": "6a9ffc85e80fbb746d6e955c", "rawId": "6a9ffc85e80fbb746d6e955c", "title": "Magnetic Effects Of Electric Current", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc85e80fbb746d6e955d", "rawId": "6a9ffc85e80fbb746d6e955d", "title": "Carbon And Its Compounds", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc85e80fbb746d6e955e", "rawId": "6a9ffc85e80fbb746d6e955e", "title": "Heredity", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc85e80fbb746d6e955f", "rawId": "6a9ffc85e80fbb746d6e955f", "title": "Our Environment", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3c1c5ca22cc79ec262895", "rawId": "69d3c1c5ca22cc79ec262895", "title": "Light-Reflection & Refraction", "videoCount": 9, "notesCount": 17, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec262897", "rawId": "69d3c1c5ca22cc79ec262897", "title": "Chemical Reactions and Equations", "videoCount": 6, "notesCount": 11, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec262896", "rawId": "69d3c1c5ca22cc79ec262896", "title": "Life Processes", "videoCount": 9, "notesCount": 18, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec262899", "rawId": "69d3c1c5ca22cc79ec262899", "title": "Human Eye & the Colorful World", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec26289c", "rawId": "69d3c1c5ca22cc79ec26289c", "title": "Control and Coordination", "videoCount": 7, "notesCount": 12, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec26289a", "rawId": "69d3c1c5ca22cc79ec26289a", "title": "Acids, Bases and Salts", "videoCount": 6, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec26289b", "rawId": "69d3c1c5ca22cc79ec26289b", "title": "Electricity", "videoCount": 7, "notesCount": 15, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec2628a0", "rawId": "69d3c1c5ca22cc79ec2628a0", "title": "How do Organisms Reproduce", "videoCount": 8, "notesCount": 14, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d3c1c5ca22cc79ec26289d", "rawId": "69d3c1c5ca22cc79ec26289d", "title": "Metals and Non Metals", "videoCount": 7, "notesCount": 12, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69ecc0e82c685573853e4f90", "rawId": "69ecc0e82c685573853e4f90", "title": "Summary Lecture", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26f92219b092fd426e4b42", "rawId": "6a26f92219b092fd426e4b42", "title": "Revision Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a742ad41686a33ddff9ac02", "rawId": "6a742ad41686a33ddff9ac02", "title": "Important Board Questions", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d2bbb4a932c5d8f4ffc074", "subjectId": "69d2bb97b64c40983c079d2f", "name": "Mathematics by Ritik Sir", "faculty": "Ritik Mishra Sir", "teachers": [{"_id": "61d95dfad4a765008074c1c1", "firstName": "Ritik", "lastName": "Mishra Sir", "name": "Ritik Mishra Sir", "qualification": "Bsc in statistics", "experience": "8 Years", "featuredLine": "Sochna seekho", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/7dc26c18-1e66-47ff-8a29-13da4ccec1d2.png", "introVideoThumbnail": "https://static.pw.live/6584376dd82e5a00188912db", "subject": "Maths"}], "lectureCount": 56, "tagCount": 15, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/026977a7-5a14-4488-9556-aa93af2e11d5.pdf", "schedules": [], "chapters": [{"id": "69d34a3a0524d186b6652ae5", "rawId": "69d34a3a0524d186b6652ae5", "title": "Real Numbers", "videoCount": 6, "notesCount": 9, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652ae6", "rawId": "69d34a3a0524d186b6652ae6", "title": "Polynomials", "videoCount": 7, "notesCount": 13, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652ae7", "rawId": "69d34a3a0524d186b6652ae7", "title": "Pair of Linear Equations in 2 Variables", "videoCount": 10, "notesCount": 18, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652ae8", "rawId": "69d34a3a0524d186b6652ae8", "title": "Trigonometry", "videoCount": 10, "notesCount": 19, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652ae9", "rawId": "69d34a3a0524d186b6652ae9", "title": "Quadratic Equations", "videoCount": 11, "notesCount": 20, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652aeb", "rawId": "69d34a3a0524d186b6652aeb", "title": "Arithmetic Progressions", "videoCount": 9, "notesCount": 14, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d34a3a0524d186b6652aec", "rawId": "69d34a3a0524d186b6652aec", "title": "Triangles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652aea", "rawId": "69d34a3a0524d186b6652aea", "title": "Some Applications Of Trigonometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652aed", "rawId": "69d34a3a0524d186b6652aed", "title": "Coordinate Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652aee", "rawId": "69d34a3a0524d186b6652aee", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652aef", "rawId": "69d34a3a0524d186b6652aef", "title": "Area Related to Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652af0", "rawId": "69d34a3a0524d186b6652af0", "title": "Surface Area and Volumes", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652af1", "rawId": "69d34a3a0524d186b6652af1", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3a0524d186b6652af2", "rawId": "69d34a3a0524d186b6652af2", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69e2103bd5b3bbc7ba6f1898", "rawId": "69e2103bd5b3bbc7ba6f1898", "title": "Important Update By Ritik Sir", "videoCount": 3, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d2bbe37fafbba62a62e127", "subjectId": "69d2bbc9ec59f42d38235bdb", "name": "Mathematics By Uday Sir", "faculty": "Uday Pratap Singh Sir", "teachers": [{"_id": "684821d39527c710fea685f3", "firstName": "Uday", "lastName": "Pratap Singh Sir", "name": "Uday Pratap Singh Sir", "qualification": "BTECH in mechanical engineering from NSUT Delhi", "experience": "4 Years", "featuredLine": "Hello bacha party", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/eb292567-d774-4a58-9f76-a7ac20827e8f.png", "introVideoThumbnail": "", "subject": "Maths"}], "lectureCount": 54, "tagCount": 14, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/38d7a6dd-dcac-42bd-9583-1ad48ee49261.pdf", "schedules": [], "chapters": [{"id": "6a9ffc834806a976e44c8771", "rawId": "6a9ffc834806a976e44c8771", "title": "Triangles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8772", "rawId": "6a9ffc834806a976e44c8772", "title": "Coordinate Geometry", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8773", "rawId": "6a9ffc834806a976e44c8773", "title": "Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8774", "rawId": "6a9ffc834806a976e44c8774", "title": "Area Related to Circles", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8775", "rawId": "6a9ffc834806a976e44c8775", "title": "Surface Area and Volumes", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8776", "rawId": "6a9ffc834806a976e44c8776", "title": "Statistics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc834806a976e44c8777", "rawId": "6a9ffc834806a976e44c8777", "title": "Probability", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d6c", "rawId": "69d34a3aa8d5b6e865ba8d6c", "title": "Real Numbers", "videoCount": 6, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d6d", "rawId": "69d34a3aa8d5b6e865ba8d6d", "title": "Polynomials", "videoCount": 6, "notesCount": 12, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d6e", "rawId": "69d34a3aa8d5b6e865ba8d6e", "title": "Pair of Linear Equations in 2 Variables", "videoCount": 10, "notesCount": 17, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d6f", "rawId": "69d34a3aa8d5b6e865ba8d6f", "title": "Trigonometry", "videoCount": 11, "notesCount": 19, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d70", "rawId": "69d34a3aa8d5b6e865ba8d70", "title": "Quadratic Equations", "videoCount": 11, "notesCount": 16, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d34a3aa8d5b6e865ba8d71", "rawId": "69d34a3aa8d5b6e865ba8d71", "title": "Some Applications Of Trigonometry", "videoCount": 5, "notesCount": 9, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a9ffc834806a976e44c8770", "rawId": "6a9ffc834806a976e44c8770", "title": "Arithmetic Progressions", "videoCount": 5, "notesCount": 7, "dppCount": 2, "isStarted": true, "lectures": []}]}, {"id": "69d2bc71c141fcb0bbc554ff", "subjectId": "69d2bc3fdfc18c567bc0d75f", "name": "SST By Siddharth Sir", "faculty": "Siddharth Sharma Sir", "teachers": [{"_id": "6819f1b0d87791b53f327521", "firstName": "Siddharth", "lastName": "Sharma Sir", "name": "Siddharth Sharma Sir", "qualification": "Bachelor of Science (B.Sc.) in Physics, Mathematics and Geology", "experience": "11 Years", "featuredLine": "Welcome to PW!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/63ec57f2-3bb6-481a-8f1b-45e3686224e8.png", "introVideoThumbnail": "", "subject": "Social Science"}], "lectureCount": 58, "tagCount": 29, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/e9f8e1c5-d185-4d81-8ab8-4382696f333b.pdf", "schedules": [], "chapters": [{"id": "6a9ffc84e11373b85c505f34", "rawId": "6a9ffc84e11373b85c505f34", "title": "Doubt Session 05", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd833", "rawId": "69d34a3928da3c2e39edd833", "title": "The Rise of Nationalism in Europe", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd834", "rawId": "69d34a3928da3c2e39edd834", "title": "Power Sharing", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd835", "rawId": "69d34a3928da3c2e39edd835", "title": "Resources and Development", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd836", "rawId": "69d34a3928da3c2e39edd836", "title": "Development", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd837", "rawId": "69d34a3928da3c2e39edd837", "title": "Forest and Wildlife Resources", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd838", "rawId": "69d34a3928da3c2e39edd838", "title": "Federalism", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd839", "rawId": "69d34a3928da3c2e39edd839", "title": "Nationalism in India", "videoCount": 4, "notesCount": 9, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd83a", "rawId": "69d34a3928da3c2e39edd83a", "title": "Sectors of the Indian Economy", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34268347f783923c69f59", "rawId": "69d34268347f783923c69f59", "title": "Doubt Session 02", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd83b", "rawId": "69d34a3928da3c2e39edd83b", "title": "Water Resources", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd844", "rawId": "69d34a3928da3c2e39edd844", "title": "The Making of the Global World", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd83c", "rawId": "69d34a3928da3c2e39edd83c", "title": "Gender, Religion and Caste", "videoCount": 4, "notesCount": 8, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd83e", "rawId": "69d34a3928da3c2e39edd83e", "title": "Money and Credit", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34268347f783923c69f5a", "rawId": "69d34268347f783923c69f5a", "title": "Doubt Session 03", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd83d", "rawId": "69d34a3928da3c2e39edd83d", "title": "Agriculture", "videoCount": 3, "notesCount": 5, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34268347f783923c69f5b", "rawId": "69d34268347f783923c69f5b", "title": "Print Culture and The Modern World", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd83f", "rawId": "69d34a3928da3c2e39edd83f", "title": "Political Parties", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3928da3c2e39edd840", "rawId": "69d34a3928da3c2e39edd840", "title": "Minerals and Energy Resources", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd841", "rawId": "69d34a3928da3c2e39edd841", "title": "Globalization & the Indian\u00a0Economy", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268347f783923c69f5c", "rawId": "69d34268347f783923c69f5c", "title": "Doubt Session 04", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd842", "rawId": "69d34a3928da3c2e39edd842", "title": "Manufacturing Industries", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3928da3c2e39edd843", "rawId": "69d34a3928da3c2e39edd843", "title": "Outcomes of democracy", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268347f783923c69f5d", "rawId": "69d34268347f783923c69f5d", "title": "The Age of Industrialization", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268347f783923c69f5e", "rawId": "69d34268347f783923c69f5e", "title": "Complete Mapwork", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69e48dd44f1e946842c9e0e7", "rawId": "69e48dd44f1e946842c9e0e7", "title": "Summary Lecture", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34268347f783923c69f5f", "rawId": "69d34268347f783923c69f5f", "title": "Doubt Session", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a34de14d6a38a82dc94c81c", "rawId": "6a34de14d6a38a82dc94c81c", "title": "Poll Session", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a4601ca6317d460ac743a95", "rawId": "6a4601ca6317d460ac743a95", "title": "Revision Series", "videoCount": 7, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d2bca656a18df26edf98bf", "subjectId": "69d2bc88736ab22bc05c11ef", "name": "SST By Ujjvala Ma'am", "faculty": "Ujjvala Punj Ma'am", "teachers": [{"_id": "670cb50e619e154b7d80798b", "firstName": "Ujjvala", "lastName": "Punj Ma'am", "name": "Ujjvala Punj Ma'am", "qualification": "M.A in Political Science from D.U", "experience": "5 Years", "featuredLine": "Welcome to PW!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bf24d447-685d-414f-8287-ca8df4ed2602.png", "introVideoThumbnail": "", "subject": "SST"}], "lectureCount": 54, "tagCount": 24, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/d66a354d-4fce-4612-bf66-04b620d3c14b.pdf", "schedules": [], "chapters": [{"id": "6ab2797817a15f94e0d5ebd0", "rawId": "6ab2797817a15f94e0d5ebd0", "title": "Print Culture and the Modern World.", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6ab2797817a15f94e0d5ebd1", "rawId": "6ab2797817a15f94e0d5ebd1", "title": "Minerals and Energy Resources.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3e887311f4341fa566", "rawId": "69d34a3e887311f4341fa566", "title": "The Rise of Nationalism in Europe", "videoCount": 5, "notesCount": 10, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa567", "rawId": "69d34a3e887311f4341fa567", "title": "Power Sharing", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa569", "rawId": "69d34a3e887311f4341fa569", "title": "Development", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa568", "rawId": "69d34a3e887311f4341fa568", "title": "Resources and Development", "videoCount": 4, "notesCount": 7, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56c", "rawId": "69d34a3e887311f4341fa56c", "title": "Nationalism in India", "videoCount": 5, "notesCount": 9, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56b", "rawId": "69d34a3e887311f4341fa56b", "title": "Federalism", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56d", "rawId": "69d34a3e887311f4341fa56d", "title": "Sectors of the Indian Economy", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56a", "rawId": "69d34a3e887311f4341fa56a", "title": "Forest and Wildlife Resources", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa578", "rawId": "69d34a3e887311f4341fa578", "title": "The Making of the Global World", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa571", "rawId": "69d34a3e887311f4341fa571", "title": "Money and Credit", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56e", "rawId": "69d34a3e887311f4341fa56e", "title": "Water Resources", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa56f", "rawId": "69d34a3e887311f4341fa56f", "title": "Gender, Religion and Caste", "videoCount": 3, "notesCount": 7, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa570", "rawId": "69d34a3e887311f4341fa570", "title": "Agriculture", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa575", "rawId": "69d34a3e887311f4341fa575", "title": "Globalization and the Indian\u00a0Economy", "videoCount": 1, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa573", "rawId": "69d34a3e887311f4341fa573", "title": "Political Parties", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa572", "rawId": "69d34a3e887311f4341fa572", "title": "Print Culture and the Modern World", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a3e887311f4341fa574", "rawId": "69d34a3e887311f4341fa574", "title": "Minerals and Energy Resources", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3e887311f4341fa576", "rawId": "69d34a3e887311f4341fa576", "title": "Manufacturing Industries.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34a3e887311f4341fa577", "rawId": "69d34a3e887311f4341fa577", "title": "Outcomes of democracy.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69ea450b549bcfd78cd428f6", "rawId": "69ea450b549bcfd78cd428f6", "title": "Summary Lecture", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f22d82c0babed698f4cc08", "rawId": "69f22d82c0babed698f4cc08", "title": "Doubt Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a71860db29c1086b4cef3c7", "rawId": "6a71860db29c1086b4cef3c7", "title": "Revision Series", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69d2bc24f19c7bd0489864ef", "subjectId": "664c49d884a2730018a9a6a0", "name": "English (Language & Literature)", "faculty": "Anurag Tyagi Sir", "teachers": [{"_id": "6439463eb8e5fa0018cb0790", "firstName": "Anurag", "lastName": "Tyagi Sir", "name": "Anurag Tyagi Sir", "qualification": "B.Sc (Hons), University of Delhi", "experience": "10 Years", "featuredLine": "Ha bhae Bachha Party!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/8c7553ec-2980-4438-9b3e-f2db7c4abca8.png", "introVideoThumbnail": "", "subject": "English"}], "lectureCount": 33, "tagCount": 34, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/8fd9d5f6-84ad-4a15-85c6-9a13e67fbb47.pdf", "schedules": [], "chapters": [{"id": "69d3426880f61aac9581e4f5", "rawId": "69d3426880f61aac9581e4f5", "title": "Dust of Snow; Fire and Ice", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f3", "rawId": "69d3426880f61aac9581e4f3", "title": "A Letter to God", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f4", "rawId": "69d3426880f61aac9581e4f4", "title": "A Triumph of Surgery", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a86", "rawId": "69d34a34b4bcbe6b6b092a86", "title": "Tenses", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f6", "rawId": "69d3426880f61aac9581e4f6", "title": "Analytical Paragraph", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f7", "rawId": "69d3426880f61aac9581e4f7", "title": "Nelson Mandela : Long Walk to Freedom", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f8", "rawId": "69d3426880f61aac9581e4f8", "title": "The Thief's Story", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f9", "rawId": "69d3426880f61aac9581e4f9", "title": "A Tiger in the Zoo", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a88", "rawId": "69d34a34b4bcbe6b6b092a88", "title": "Reading Comprehension", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4fa", "rawId": "69d3426880f61aac9581e4fa", "title": "Two Stories about Flying : His First Flight, The Black Aeroplane", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4fb", "rawId": "69d3426880f61aac9581e4fb", "title": "The Midnight Visitor", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4fc", "rawId": "69d3426880f61aac9581e4fc", "title": "How to Tell Wild Animals", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4fd", "rawId": "69d3426880f61aac9581e4fd", "title": "The Ball Poem", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a8a", "rawId": "69d34a34b4bcbe6b6b092a8a", "title": "Modals", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4fe", "rawId": "69d3426880f61aac9581e4fe", "title": "Formal Letters", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4ff", "rawId": "69d3426880f61aac9581e4ff", "title": "From the Diary of Anne Frank", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e500", "rawId": "69d3426880f61aac9581e500", "title": "A Question of Trust", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e502", "rawId": "69d3426880f61aac9581e502", "title": "Subject-Verb Concord", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e501", "rawId": "69d3426880f61aac9581e501", "title": "Amanda", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e503", "rawId": "69d3426880f61aac9581e503", "title": "Glimpses of India", "videoCount": 2, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e505", "rawId": "69d3426880f61aac9581e505", "title": "Footprints without Feet", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e506", "rawId": "69d3426880f61aac9581e506", "title": "The Trees", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e507", "rawId": "69d3426880f61aac9581e507", "title": "Reported Speech", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e509", "rawId": "69d3426880f61aac9581e509", "title": "Mijbil the Otter", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e50b", "rawId": "69d3426880f61aac9581e50b", "title": "Fog, For Anne Gregory", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a8c", "rawId": "69d34a34b4bcbe6b6b092a8c", "title": "Determiners", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e50a", "rawId": "69d3426880f61aac9581e50a", "title": "The Making of a Scientist", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e50c", "rawId": "69d3426880f61aac9581e50c", "title": "Madam Rides the bus", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e50d", "rawId": "69d3426880f61aac9581e50d", "title": "The Necklace", "videoCount": 1, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e50e", "rawId": "69d3426880f61aac9581e50e", "title": "The Tale of Custard the Dragon", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426880f61aac9581e50f", "rawId": "69d3426880f61aac9581e50f", "title": "The Sermon at Benaras", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426880f61aac9581e510", "rawId": "69d3426880f61aac9581e510", "title": "Bholi", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426880f61aac9581e511", "rawId": "69d3426880f61aac9581e511", "title": "The Proposal", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426880f61aac9581e512", "rawId": "69d3426880f61aac9581e512", "title": "The Book That Saved the Earth", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "67795043a97989c41ba3a283", "subjectId": "664c4a317e83470018fa609e", "name": "English (Communicative)", "faculty": "Anurag Tyagi Sir", "teachers": [{"_id": "6439463eb8e5fa0018cb0790", "firstName": "Anurag", "lastName": "Tyagi Sir", "name": "Anurag Tyagi Sir", "qualification": "B.Sc (Hons), University of Delhi", "experience": "10 Years", "featuredLine": "Ha bhae Bachha Party!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/8c7553ec-2980-4438-9b3e-f2db7c4abca8.png", "introVideoThumbnail": "", "subject": "English"}], "lectureCount": 34, "tagCount": 23, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/6382611b-78b5-4b61-8920-284652d43434.pdf", "schedules": [], "chapters": [{"id": "69d342687e1b424f8700b867", "rawId": "69d342687e1b424f8700b867", "title": "Two Gentlemen of Verona", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b868", "rawId": "69d342687e1b424f8700b868", "title": "Mrs. Packletide's Tiger", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a87", "rawId": "69d34a34b4bcbe6b6b092a87", "title": "Tenses", "videoCount": 3, "notesCount": 6, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b869", "rawId": "69d342687e1b424f8700b869", "title": "Letter Writing", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86a", "rawId": "69d342687e1b424f8700b86a", "title": "The Frog and the Nightingale", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86b", "rawId": "69d342687e1b424f8700b86b", "title": "The Letter", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a8b", "rawId": "69d34a34b4bcbe6b6b092a8b", "title": "Modals", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86c", "rawId": "69d342687e1b424f8700b86c", "title": "Not Marble, Nor the Gilded Monuments (Sonnet 55)", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86d", "rawId": "69d342687e1b424f8700b86d", "title": "E-Mail Writing", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86e", "rawId": "69d342687e1b424f8700b86e", "title": "Subject Verb Concord", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b86f", "rawId": "69d342687e1b424f8700b86f", "title": "A Shady Plot", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b870", "rawId": "69d342687e1b424f8700b870", "title": "Ozymandias", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b871", "rawId": "69d342687e1b424f8700b871", "title": "Factual Description", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a89", "rawId": "69d34a34b4bcbe6b6b092a89", "title": "Reading Comprehension", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b872", "rawId": "69d342687e1b424f8700b872", "title": "Patol Babu, Film Star", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a8d", "rawId": "69d34a34b4bcbe6b6b092a8d", "title": "Determiners", "videoCount": 2, "notesCount": 4, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b873", "rawId": "69d342687e1b424f8700b873", "title": "Article Writing", "videoCount": 1, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b874", "rawId": "69d342687e1b424f8700b874", "title": "Snake", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b875", "rawId": "69d342687e1b424f8700b875", "title": "Virtually True", "videoCount": 1, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b876", "rawId": "69d342687e1b424f8700b876", "title": "The Rime of the Ancient Mariner", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b877", "rawId": "69d342687e1b424f8700b877", "title": "Reported Speech", "videoCount": 2, "notesCount": 5, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b879", "rawId": "69d342687e1b424f8700b879", "title": "Julius Caesar", "videoCount": 3, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d342687e1b424f8700b87a", "rawId": "69d342687e1b424f8700b87a", "title": "The Dear Departed", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "6992df81f3138a942336057a", "subjectId": "650c253b0fa5fd0018cc7c6d", "name": "Hindi Course A", "faculty": "Aditi Purohit Ma'am", "teachers": [{"_id": "68a2fdc65f7923eeae1b8b2e", "firstName": "Aditi", "lastName": "Purohit Ma'am", "name": "Aditi Purohit Ma'am", "qualification": "M.A. Hindi \u2013 Hansraj College", "experience": "2 Years", "featuredLine": "hello mere toppers", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/4f5c8105-abdd-4d7d-b081-3a6d85e700dc.png", "introVideoThumbnail": "", "subject": "Hindi"}], "lectureCount": 23, "tagCount": 28, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2485c2ad-e243-45f0-851e-339a66dab924.pdf", "schedules": [], "chapters": [{"id": "6a9ffc848124faf088e23d7d", "rawId": "6a9ffc848124faf088e23d7d", "title": "\u0938\u0902\u0926\u0947\u0936 \u0932\u0947\u0916\u0928(\u0936\u0941\u092d\u0915\u093e\u092e\u0928\u093e,\u0935\u093f\u092d\u093f\u0928\u094d\u0928 \u092a\u0930\u094d\u0935 \u0924\u094d\u092f\u094c\u0939\u093e\u0930,\u0909\u0924\u094d\u0938\u0935 \u092a\u0930 \u092d\u0947\u091c\u0947 \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u0947 \u092c\u0927\u093e\u0908 \u0938\u0902\u0926\u0947\u0936 \u091c\u0948\u0938\u0947 \u0926\u093f\u0935\u093e\u0932\u0940,\u0908\u0926)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc848124faf088e23d7e", "rawId": "6a9ffc848124faf088e23d7e", "title": "\u0938\u094d\u0935\u0935\u0943\u0924\u094d\u0924 \u0932\u0947\u0916\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426838f25cd249fc18dc", "rawId": "69d3426838f25cd249fc18dc", "title": "\u0930\u091a\u0928\u093e \u0915\u0947 \u0906\u0927\u093e\u0930 \u092a\u0930 \u0935\u093e\u0915\u094d\u092f \u0930\u0942\u092a\u093e\u0902\u0924\u0930\u0923", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a8e", "rawId": "69d34a34b4bcbe6b6b092a8e", "title": "\u0905\u0932\u0902\u0915\u093e\u0930", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18dd", "rawId": "69d3426838f25cd249fc18dd", "title": "\u0935\u093e\u091a\u094d\u092f", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18de", "rawId": "69d3426838f25cd249fc18de", "title": "\u092e\u093e\u0924\u093e \u0915\u093e \u0906\u0901\u091a\u0932", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e5", "rawId": "69d3426838f25cd249fc18e5", "title": "\u0938\u0942\u0930\u0926\u093e\u0938", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e0", "rawId": "69d3426838f25cd249fc18e0", "title": "\u092e\u0948\u0902 \u0915\u094d\u092f\u094b\u0902 \u0932\u093f\u0916\u0924\u093e \u0939\u0942\u0901", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426838f25cd249fc18ec", "rawId": "69d3426838f25cd249fc18ec", "title": "\u0928\u0947\u0924\u093e\u091c\u0940 \u0915\u093e \u091a\u0936\u094d\u092e\u093e -\u0938\u094d\u0935\u092f\u0902 \u092a\u094d\u0930\u0915\u093e\u0936", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e1", "rawId": "69d3426838f25cd249fc18e1", "title": "\u0932\u0947\u0916\u0915 \u092a\u0930\u093f\u091a\u092f", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426838f25cd249fc18e6", "rawId": "69d3426838f25cd249fc18e6", "title": "\u0924\u0941\u0932\u0938\u0940\u0926\u093e\u0938", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18ed", "rawId": "69d3426838f25cd249fc18ed", "title": "\u0930\u093e\u092e\u0935\u0943\u0915\u094d\u0937 \u092c\u0947\u0928\u0940\u092a\u0941\u0930\u0940", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e7", "rawId": "69d3426838f25cd249fc18e7", "title": "\u091c\u092f\u0936\u0902\u0915\u0930 \u092a\u094d\u0930\u0938\u093e\u0926", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e2", "rawId": "69d3426838f25cd249fc18e2", "title": "\u092a\u0926 \u092a\u0930\u093f\u091a\u092f", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e4", "rawId": "69d3426838f25cd249fc18e4", "title": "\u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926, \u0914\u092a\u091a\u093e\u0930\u093f\u0915 \u090f\u0935\u0902 \u0905\u0928\u094c\u092a\u091a\u093e\u0930\u093f\u0915 \u092a\u0924\u094d\u0930 \u0932\u0947\u0916\u0928", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18df", "rawId": "69d3426838f25cd249fc18df", "title": "\u0938\u093e\u0928\u093e-\u0938\u093e\u0928\u093e \u0939\u093e\u0925 \u091c\u094b\u0921\u093c\u093f", "videoCount": 2, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e9", "rawId": "69d3426838f25cd249fc18e9", "title": "\u0938\u0942\u0930\u094d\u092f\u0915\u093e\u0928\u094d\u0924 \u0924\u094d\u0930\u093f\u092a\u093e\u0920\u0940 '\u0928\u093f\u0930\u093e\u0932\u093e'", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18e8", "rawId": "69d3426838f25cd249fc18e8", "title": "\u0938\u0902\u0926\u0947\u0936 \u0932\u0947\u0916\u0928( \u0936\u0941\u092d\u0915\u093e\u092e\u0928\u093e , \u0935\u093f\u092d\u093f\u0928\u094d\u0928 \u092a\u0930\u094d\u0935 \u0924\u094d\u092f\u094c\u0939\u093e\u0930 ,\u0909\u0924\u094d\u0938\u0935 \u092a\u0930 \u092d\u0947\u091c\u0947 \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u0947 \u092c\u0927\u093e\u0908 \u0938\u0902\u0926\u0947\u0936 \u091c\u0948\u0938\u0947 \u0926\u093f\u0935\u093e\u0932\u0940 , \u0908\u0926 )", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426838f25cd249fc18ef", "rawId": "69d3426838f25cd249fc18ef", "title": "\u092e\u0928\u094d\u0928\u0942 \u092d\u0902\u0921\u093e\u0930\u0940", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18f0", "rawId": "69d3426838f25cd249fc18f0", "title": "\u092f\u0924\u0940\u0902\u0926\u094d\u0930 \u092e\u093f\u0936\u094d\u0930\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a90", "rawId": "69d34a34b4bcbe6b6b092a90", "title": "\u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0932\u0947\u0916\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426838f25cd249fc18ee", "rawId": "69d3426838f25cd249fc18ee", "title": "\u092f\u0936\u092a\u093e\u0932", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18ea", "rawId": "69d3426838f25cd249fc18ea", "title": "\u0928\u093e\u0917\u093e\u0930\u094d\u091c\u0941\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc848124faf088e23d7c", "rawId": "6a9ffc848124faf088e23d7c", "title": "\u0908-\u092e\u0947\u0932 \u0932\u0947\u0916\u0928, \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0932\u0947\u0916\u0928", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18eb", "rawId": "69d3426838f25cd249fc18eb", "title": "\u092e\u0902\u0917\u0932\u0947\u0936 \u0921\u092c\u0930\u093e\u0932", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d3426838f25cd249fc18f1", "rawId": "69d3426838f25cd249fc18f1", "title": "\u0938\u0902\u0938\u094d\u0915\u0943\u0924\u093f - \u092d\u0917\u0924 \u0906\u0928\u0902\u0926 \u0915\u094c\u0938\u0932\u094d\u092f\u093e\u092f\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a48c42b42f3ff464fab7452", "rawId": "6a48c42b42f3ff464fab7452", "title": "Practice Session", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7762e493d236b82316849d", "rawId": "6a7762e493d236b82316849d", "title": "Backlog Revision", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "6992df80663c238e6b50d2d8", "subjectId": "650c25593b96b20018ba0316", "name": "Hindi Course B", "faculty": "Aditi Purohit Ma'am", "teachers": [{"_id": "68a2fdc65f7923eeae1b8b2e", "firstName": "Aditi", "lastName": "Purohit Ma'am", "name": "Aditi Purohit Ma'am", "qualification": "M.A. Hindi \u2013 Hansraj College", "experience": "2 Years", "featuredLine": "hello mere toppers", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/4f5c8105-abdd-4d7d-b081-3a6d85e700dc.png", "introVideoThumbnail": "", "subject": "Hindi"}], "lectureCount": 19, "tagCount": 24, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/9d5d4ce1-a0d0-43bc-a83c-02f6c01cc0ad.pdf", "schedules": [], "chapters": [{"id": "6a9ffc837bf606a4ffe186a5", "rawId": "6a9ffc837bf606a4ffe186a5", "title": "\u0915\u0948\u092b\u0940 \u0906\u091c\u093c\u092e\u0940,\u0915\u0930 \u091a\u0932\u0947 \u0939\u092e \u092b\u093f\u0926\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a9ffc837bf606a4ffe186a6", "rawId": "6a9ffc837bf606a4ffe186a6", "title": "\u0930\u0935\u093f\u0902\u0926\u094d\u0930 \u0915\u0947\u0932\u0947\u0935\u0930,\u092a\u0924\u091d\u0921\u093c \u092e\u0947\u0902 \u091f\u0942\u091f\u0940 \u092a\u0924\u094d\u0924\u093f\u092f\u093e\u0902,\u091d\u0947\u0928 \u0915\u0940 \u0926\u0947\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a9ffc837bf606a4ffe186a7", "rawId": "6a9ffc837bf606a4ffe186a7", "title": "\u0939\u092c\u0940\u092c \u0924\u0928\u0935\u0940\u0930,\u0915\u093e\u0930\u0924\u0942\u0938", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d342681e785ee102c6c4fd", "rawId": "69d342681e785ee102c6c4fd", "title": "\u0930\u091a\u0928\u093e \u0915\u0947 \u0906\u0927\u093e\u0930 \u092a\u0930 \u0935\u093e\u0915\u094d\u092f \u0930\u0942\u092a\u093e\u0902\u0924\u0930\u0923", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c4fe", "rawId": "69d342681e785ee102c6c4fe", "title": "\u0938\u092e\u093e\u0938", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c502", "rawId": "69d342681e785ee102c6c502", "title": "\u092a\u0926 \u092c\u0902\u0927", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c4ff", "rawId": "69d342681e785ee102c6c4ff", "title": "\u0939\u0930\u093f\u0939\u0930 \u0915\u093e\u0915\u093e", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c504", "rawId": "69d342681e785ee102c6c504", "title": "\u0915\u092c\u0940\u0930 \u0938\u093e\u0916\u0940", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c501", "rawId": "69d342681e785ee102c6c501", "title": "\u091f\u094b\u092a\u0940 \u0936\u0941\u0915\u094d\u0932\u093e", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d342681e785ee102c6c50d", "rawId": "69d342681e785ee102c6c50d", "title": "\u092a\u094d\u0930\u0947\u092e\u091a\u0902\u0926\u094d\u0930 -\u092c\u0921\u093c\u0947 \u092d\u093e\u0908 \u0938\u093e\u0939\u092c", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c505", "rawId": "69d342681e785ee102c6c505", "title": "\u092e\u0940\u0930\u093e \u092a\u0926", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c50e", "rawId": "69d342681e785ee102c6c50e", "title": "\u0938\u0940\u0924\u093e\u0930\u093e\u092e \u0938\u0947\u0915\u0938\u0930\u093f\u092f\u093e- \u0921\u093e\u092f\u0930\u0940 \u0915\u093e \u090f\u0915 \u092a\u0928\u094d\u0928\u093e", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c506", "rawId": "69d342681e785ee102c6c506", "title": "\u092e\u0948\u0925\u093f\u0932\u0940\u0936\u0930\u0923 \u0917\u0941\u092a\u094d\u0924 -\u00a0 \u092e\u0928\u0941\u0937\u094d\u092f\u0924\u093e", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c507", "rawId": "69d342681e785ee102c6c507", "title": "\u0938\u0941\u092e\u093f\u0924\u094d\u0930\u093e\u0928\u0902\u0926\u0928 \u092a\u0902\u0924- \u092a\u0930\u094d\u0935\u0924 \u092a\u094d\u0930\u0926\u0947\u0936 \u092e\u0947\u0902 \u092a\u093e\u0935\u0938", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c50b", "rawId": "69d342681e785ee102c6c50b", "title": "\u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926, \u0914\u092a\u091a\u093e\u0930\u093f\u0915 \u090f\u0935\u0902 \u0905\u0928\u094c\u092a\u091a\u093e\u0930\u093f\u0915 \u092a\u0924\u094d\u0930 \u0932\u0947\u0916\u0928", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c50f", "rawId": "69d342681e785ee102c6c50f", "title": "\u0932\u0940\u0932\u093e\u0927\u0930 \u092e\u0902\u0921\u0932\u094b\u0908 - \u0924\u0924\u093e\u0901\u0930\u093e\u00a0\u0935\u093e\u092e\u0940\u0930\u094b \u0915\u0925\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c500", "rawId": "69d342681e785ee102c6c500", "title": "\u0938\u092a\u0928\u094b\u0902 \u0915\u0947 \u0938\u0947 \u0926\u093f\u0928", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c510", "rawId": "69d342681e785ee102c6c510", "title": "\u092a\u094d\u0930\u0939\u0932\u093e\u0926 \u0905\u0917\u094d\u0930\u0935\u093e\u0932- \u0924\u0940\u0938\u0930\u0940 \u0915\u0938\u092e \u0915\u0947 \u0936\u093f\u0932\u094d\u092a\u0915\u093e\u0930 \u0936\u0948\u0932\u0947\u0902\u0926\u094d\u0930", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c508", "rawId": "69d342681e785ee102c6c508", "title": "\u0935\u0940\u0930\u0947\u0928 \u0921\u0902\u0917\u0935\u093e\u0932-\u0924\u094b\u092a", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c50a", "rawId": "69d342681e785ee102c6c50a", "title": "\u0930\u0935\u0940\u0902\u0926\u094d\u0930\u0928\u093e\u0925 \u0920\u093e\u0915\u0941\u0930 \u0906\u0924\u094d\u092e\u0924\u094d\u0930\u093e\u0923", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d342681e785ee102c6c511", "rawId": "69d342681e785ee102c6c511", "title": "\u0928\u093f\u0926\u093e \u092b\u093c\u093e\u091c\u093c\u0932\u0940- \u0905\u092c \u0915\u0939\u093e\u0902 \u0926\u0942\u0938\u0930\u0947 \u0915\u0947 \u0926\u0941\u0916 \u0938\u0947 \u0926\u0941\u0916\u0940 \u0939\u094b\u0928\u0947 \u0935\u093e\u0932\u0947", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "6a9ffc837bf606a4ffe186a4", "rawId": "6a9ffc837bf606a4ffe186a4", "title": "\u092e\u0941\u0939\u093e\u0935\u0930\u0947, \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0932\u0947\u0916\u0928", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d342681e785ee102c6c512", "rawId": "69d342681e785ee102c6c512", "title": "\u0938\u0942\u091a\u0928\u093e \u0932\u0947\u0916\u0928/\u0932\u0918\u0941 \u0915\u0925\u093e \u0932\u0947\u0916\u0928/\u0914\u092a\u091a\u093e\u0930\u093f\u0915 \u0908\u092e\u0947\u0932 \u0932\u0947\u0916\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a7762e493d236b82316849e", "rawId": "6a7762e493d236b82316849e", "title": "Backlog Revision", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69bfa5d306a56d137682d7e5", "subjectId": "67c6cdccca49eff6a2942d1b", "name": "Computer Applications", "faculty": "Prateik Sharma Sir", "teachers": [{"_id": "6662d04db164ea00186c3486", "firstName": "Prateik", "lastName": "Sharma Sir", "name": "Prateik Sharma Sir", "qualification": "BCA, Certified Ethical hacking from IIT Kanpur", "experience": "7 Years", "featuredLine": "Kaise ho mere Laal", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/d50b0f03-f0f7-4bb6-995d-0e3060fb0029.png", "introVideoThumbnail": "", "subject": "Computer Science"}], "lectureCount": 13, "tagCount": 6, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/28f3d1a3-af59-4e42-9ecf-c6a8d4da9640.pdf", "schedules": [], "chapters": [{"id": "69d34268ac9b2f1480718c4f", "rawId": "69d34268ac9b2f1480718c4f", "title": "Internet Basics", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34268ac9b2f1480718c50", "rawId": "69d34268ac9b2f1480718c50", "title": "Internet Services", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34268ac9b2f1480718c51", "rawId": "69d34268ac9b2f1480718c51", "title": "HTML", "videoCount": 7, "notesCount": 12, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d34268ac9b2f1480718c52", "rawId": "69d34268ac9b2f1480718c52", "title": "CSS", "videoCount": 2, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34268ac9b2f1480718c53", "rawId": "69d34268ac9b2f1480718c53", "title": "HTML and CSS", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268ac9b2f1480718c54", "rawId": "69d34268ac9b2f1480718c54", "title": "Cyberethics", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69bfa5e8f5f2aa0149d9a3c4", "subjectId": "63f8a33fb5dfa80019ea2f75", "name": "Information Technology", "faculty": "Prateik Sharma Sir", "teachers": [{"_id": "6662d04db164ea00186c3486", "firstName": "Prateik", "lastName": "Sharma Sir", "name": "Prateik Sharma Sir", "qualification": "BCA, Certified Ethical hacking from IIT Kanpur", "experience": "7 Years", "featuredLine": "Kaise ho mere Laal", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/d50b0f03-f0f7-4bb6-995d-0e3060fb0029.png", "introVideoThumbnail": "", "subject": "Computer Science"}], "lectureCount": 13, "tagCount": 9, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/4febb654-0eb0-4157-9d8d-777bb2cf1ede.pdf", "schedules": [], "chapters": [{"id": "69d34a34b4bcbe6b6b092a92", "rawId": "69d34a34b4bcbe6b6b092a92", "title": "Communication Skills II", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a94", "rawId": "69d34a34b4bcbe6b6b092a94", "title": "Self Management Skills II", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a96", "rawId": "69d34a34b4bcbe6b6b092a96", "title": "ICT Skills II", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a98", "rawId": "69d34a34b4bcbe6b6b092a98", "title": "Entrepreneurial Skills II", "videoCount": 2, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a9a", "rawId": "69d34a34b4bcbe6b6b092a9a", "title": "Green Skills II", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4ee", "rawId": "69d3426880f61aac9581e4ee", "title": "Digital Documention (Advanced)", "videoCount": 3, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4ef", "rawId": "69d3426880f61aac9581e4ef", "title": "Electronic Spreadsheet (Advanced)", "videoCount": 2, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d3426880f61aac9581e4f0", "rawId": "69d3426880f61aac9581e4f0", "title": "Database Management System", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d3426880f61aac9581e4f1", "rawId": "69d3426880f61aac9581e4f1", "title": "Maintain Healthy,Safe and Secure Working Environment", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69bfa5f617305b12595f1243", "subjectId": "64df50170bc1570018a6ac28", "name": "Artificial Intelligence", "faculty": "Prateik Sharma Sir", "teachers": [{"_id": "6662d04db164ea00186c3486", "firstName": "Prateik", "lastName": "Sharma Sir", "name": "Prateik Sharma Sir", "qualification": "BCA, Certified Ethical hacking from IIT Kanpur", "experience": "7 Years", "featuredLine": "Kaise ho mere Laal", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/d50b0f03-f0f7-4bb6-995d-0e3060fb0029.png", "introVideoThumbnail": "", "subject": "Computer Science"}], "lectureCount": 12, "tagCount": 12, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/91485ab6-83ae-452f-847b-11dbd02d979a.pdf", "schedules": [], "chapters": [{"id": "69d34a34b4bcbe6b6b092a93", "rawId": "69d34a34b4bcbe6b6b092a93", "title": "Communication Skills II", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a95", "rawId": "69d34a34b4bcbe6b6b092a95", "title": "Self Management Skills II", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a97", "rawId": "69d34a34b4bcbe6b6b092a97", "title": "ICT Skills II", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a99", "rawId": "69d34a34b4bcbe6b6b092a99", "title": "Entrepreneurial Skills II", "videoCount": 2, "notesCount": 3, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34a34b4bcbe6b6b092a9b", "rawId": "69d34a34b4bcbe6b6b092a9b", "title": "Green Skills II", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d34268b1adb041480c2d81", "rawId": "69d34268b1adb041480c2d81", "title": "Revisiting AI Project Cycle and Ethical Frameworks for AI", "videoCount": 2, "notesCount": 4, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34268b1adb041480c2d82", "rawId": "69d34268b1adb041480c2d82", "title": "Advance Concepts of Modelling in AI", "videoCount": 2, "notesCount": 4, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d34268b1adb041480c2d83", "rawId": "69d34268b1adb041480c2d83", "title": "Evaluation", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268b1adb041480c2d84", "rawId": "69d34268b1adb041480c2d84", "title": "Statistical Data", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268b1adb041480c2d85", "rawId": "69d34268b1adb041480c2d85", "title": "Computer Vision", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268b1adb041480c2d86", "rawId": "69d34268b1adb041480c2d86", "title": "Natural Language Processing", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "69d34268b1adb041480c2d87", "rawId": "69d34268b1adb041480c2d87", "title": "Advance Python", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69bfa609ca53c4876f0fff83", "subjectId": "67ac5e2d8633c22039554f2b", "name": "Sanskrit", "faculty": "Aman Patel Sir", "teachers": [{"_id": "69cb4d5ab7bb9d3b7e4a5c2d", "firstName": "Aman", "lastName": "Patel Sir", "name": "Aman Patel Sir", "qualification": "B.A.(Sanskrit), ACHARYA (Sanskrit)", "experience": "6 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/e3369bb6-ef5c-4775-96e0-92296c9b1b1b.png", "introVideoThumbnail": "", "subject": "Math"}], "lectureCount": 20, "tagCount": 40, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7df9a8bd-0490-436d-a37f-59305c1351da.pdf", "schedules": [], "chapters": [{"id": "6ab50073c07d204ccf830800", "rawId": "6ab50073c07d204ccf830800", "title": "\u0905\u0928\u094d\u092f\u094b\u0915\u094d\u0924\u092f\u0903", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830801", "rawId": "6ab50073c07d204ccf830801", "title": "\u0918\u091f\u0928\u093e\u0915\u094d\u0930\u092e, \u092d\u093e\u0935\u093e\u0930\u094d\u0925 \u0932\u0947\u0916\u0928", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830802", "rawId": "6ab50073c07d204ccf830802", "title": "\u092d\u093e\u0937\u093f\u0915 \u0915\u093e\u0930\u094d\u092f\u092e\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830803", "rawId": "6ab50073c07d204ccf830803", "title": "\u0935\u093f\u091a\u093f\u0924\u094d\u0930\u0903 \u0938\u093e\u0915\u094d\u0937\u0940", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830804", "rawId": "6ab50073c07d204ccf830804", "title": "\u0915\u093e\u0932\u094b\u093d\u0939\u092e\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830805", "rawId": "6ab50073c07d204ccf830805", "title": "\u0915\u093f\u0902 \u0915\u093f\u092e\u094d \u0909\u092a\u093e\u0926\u0947\u092f\u092e\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830806", "rawId": "6ab50073c07d204ccf830806", "title": "\u0905\u0935\u094d\u092f\u092f\u093e\u0928\u093f", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6ab50073c07d204ccf830807", "rawId": "6ab50073c07d204ccf830807", "title": "\u0938\u092e\u092f (\u0918\u091f\u093f\u0915\u093e)", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a10a76f1a67b1b940431009", "rawId": "6a10a76f1a67b1b940431009", "title": "\u0936\u0941\u091a\u093f\u092a\u0930\u094d\u092f\u093e\u0935\u0930\u0923\u092e\u094d", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6ab50073c07d204ccf830808", "rawId": "6ab50073c07d204ccf830808", "title": "\u0935\u093e\u091a\u094d\u092f\u092e\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a4692b730cfbfe30ffba04b", "rawId": "6a4692b730cfbfe30ffba04b", "title": "\u0935\u093e\u0919\u094d\u092e\u092f\u0902 \u0924\u092a\u0903", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6ab50073c07d204ccf830809", "rawId": "6ab50073c07d204ccf830809", "title": "\u091a\u093f\u0924\u094d\u0930\u0935\u0930\u094d\u0923\u0928\u092e\u094d and \u0905\u0936\u0941\u0926\u094d\u0927\u093f\u0938\u0902\u0936\u094b\u0927\u0928\u093e\u0903", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a10a76f1a67b1b94043100a", "rawId": "6a10a76f1a67b1b94043100a", "title": "\u092c\u0941\u0926\u094d\u0927\u093f\u0930\u094d\u092c\u0932\u0935\u0924\u0940 \u0938\u0926\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7a5", "rawId": "6a488feb5adbbdd107e5e7a5", "title": "\u0928\u093e\u0938\u094d\u0924\u093f \u0924\u094d\u092f\u093e\u0917\u0938\u092e\u0902 \u0938\u0941\u0916\u092e\u094d", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7a6", "rawId": "6a488feb5adbbdd107e5e7a6", "title": "\u0938\u0902\u0927\u093f", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7a7", "rawId": "6a488feb5adbbdd107e5e7a7", "title": "\u0938\u092e\u093e\u0938\u093e\u0903", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7a8", "rawId": "6a488feb5adbbdd107e5e7a8", "title": "\u0936\u093f\u0936\u0941\u0932\u093e\u0932\u0928\u092e\u094d", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7a9", "rawId": "6a488feb5adbbdd107e5e7a9", "title": "\u0930\u092e\u0923\u0940\u092f\u093e \u0939\u093f \u0938\u0943\u0937\u094d\u091f\u093f\u0903 \u090f\u0937\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7aa", "rawId": "6a488feb5adbbdd107e5e7aa", "title": "\u091c\u0928\u0928\u0940 \u0924\u0941\u0932\u094d\u092f\u0935\u0924\u094d\u0938\u0932\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7ab", "rawId": "6a488feb5adbbdd107e5e7ab", "title": "\u0906\u091c\u094d\u091e\u093e \u0917\u0941\u0930\u0942\u0923\u093e\u0902 \u0939\u093f \u0905\u0935\u093f\u091a\u093e\u0930\u0923\u0940\u092f\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7ac", "rawId": "6a488feb5adbbdd107e5e7ac", "title": "\u092a\u094d\u0930\u0936\u094d\u0928 \u0928\u093f\u0930\u094d\u092e\u093e\u0923", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7ad", "rawId": "6a488feb5adbbdd107e5e7ad", "title": "\u0905\u0928\u094d\u0935\u092f \u0914\u0930 \u092a\u094d\u0930\u0924\u094d\u092f\u092f", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7ae", "rawId": "6a488feb5adbbdd107e5e7ae", "title": "\u0938\u0941\u092d\u093e\u0937\u093f\u0924\u093e\u0928\u093f", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7af", "rawId": "6a488feb5adbbdd107e5e7af", "title": "\u0905\u092d\u094d\u092f\u093e\u0938\u0935\u0936\u0917\u0902 \u092e\u0928\u0903", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b0", "rawId": "6a488feb5adbbdd107e5e7b0", "title": "\u0930\u093e\u0937\u094d\u091f\u094d\u0930\u0902 \u0938\u0902\u0930\u0915\u094d\u0937\u094d\u092f\u092e\u0947\u0935 \u0939\u093f", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b1", "rawId": "6a488feb5adbbdd107e5e7b1", "title": "\u0938\u094c\u0939\u093e\u0930\u094d\u0926 \u092a\u094d\u0930\u0915\u0943\u0924\u0947\u0903 \u0936\u094b\u092d\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b2", "rawId": "6a488feb5adbbdd107e5e7b2", "title": "\u0938\u093e\u0927\u0941\u0935\u0943\u0924\u094d\u0924\u093f\u0902 \u0938\u092e\u093e\u091a\u0930\u0947\u0924\u094d : \u092e\u0923\u093f\u0915\u093e", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b3", "rawId": "6a488feb5adbbdd107e5e7b3", "title": "\u092a\u0924\u094d\u0930 \u0932\u0947\u0916\u0928", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b4", "rawId": "6a488feb5adbbdd107e5e7b4", "title": "\u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926\u0932\u0947\u0916\u0928\u092e\u094d", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b5", "rawId": "6a488feb5adbbdd107e5e7b5", "title": "\u092d\u0942\u0915\u0902\u092a\u0935\u093f\u092d\u0940\u0937\u093f\u0915\u093e.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b6", "rawId": "6a488feb5adbbdd107e5e7b6", "title": "\u0924\u093f\u0930\u0941\u0915\u094d\u0915\u0941\u0930\u0932\u094d \u2013 \u0938\u0942\u0915\u094d\u0924\u093f-\u0938\u094c\u0930\u092d\u092e\u094d", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b7", "rawId": "6a488feb5adbbdd107e5e7b7", "title": "\u0905\u0928\u094d\u092f\u094b\u0915\u094d\u0924\u092f:.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b8", "rawId": "6a488feb5adbbdd107e5e7b8", "title": "\u0938\u0941\u0938\u094d\u0935\u093e\u0917\u0924\u0902 \u092d\u094b! \u0905\u0930\u0941\u0923\u093e\u091a\u0932\u0947\u093d\u0938\u094d\u092e\u093f\u0928\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7b9", "rawId": "6a488feb5adbbdd107e5e7b9", "title": "\u0918\u091f\u0928\u093e\u0915\u094d\u0930\u092e , \u092d\u093e\u0935\u093e\u0930\u094d\u0925 \u0932\u0947\u0916\u0928.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7ba", "rawId": "6a488feb5adbbdd107e5e7ba", "title": "\u092d\u093e\u0937\u093f\u0915 \u0915\u093e\u0930\u094d\u092f\u092e.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7bb", "rawId": "6a488feb5adbbdd107e5e7bb", "title": "\u0935\u093f\u091a\u093f\u0924\u094d\u0930\u0903 \u0938\u093e\u0915\u094d\u0937\u0940.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7bc", "rawId": "6a488feb5adbbdd107e5e7bc", "title": "\"\u0915\u093e\u0932\u094b\u093d\u0939\u092e\u094d", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7bd", "rawId": "6a488feb5adbbdd107e5e7bd", "title": "\u0938\u0942\u0915\u094d\u0924\u092f\u0903", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7be", "rawId": "6a488feb5adbbdd107e5e7be", "title": "\u0915\u093f\u0902 \u0915\u093f\u092e\u094d \u0909\u092a\u093e\u0926\u0947\u092f\u092e\u094d\"", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}, {"id": "6a488feb5adbbdd107e5e7bf", "rawId": "6a488feb5adbbdd107e5e7bf", "title": "\u0905\u0935\u094d\u092f\u092f\u093e\u0928\u093f.", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "6a3a30aee8a6fad3ca22f973", "subjectId": "6a1043a49e6e07cf90706021", "name": "Monthly Guidance Sessions", "faculty": "Ujjvala Punj Ma'am & Siddharth Sharma Sir & Uday Pratap Singh Sir & Alakh Pandey Sir", "teachers": [{"_id": "670cb50e619e154b7d80798b", "firstName": "Ujjvala", "lastName": "Punj Ma'am", "name": "Ujjvala Punj Ma'am", "qualification": "M.A in Political Science from D.U", "experience": "5 Years", "featuredLine": "Welcome to PW!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bf24d447-685d-414f-8287-ca8df4ed2602.png", "introVideoThumbnail": "", "subject": "SST"}, {"_id": "6819f1b0d87791b53f327521", "firstName": "Siddharth", "lastName": "Sharma Sir", "name": "Siddharth Sharma Sir", "qualification": "Bachelor of Science (B.Sc.) in Physics, Mathematics and Geology", "experience": "11 Years", "featuredLine": "Welcome to PW!", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/63ec57f2-3bb6-481a-8f1b-45e3686224e8.png", "introVideoThumbnail": "", "subject": "Social Science"}, {"_id": "684821d39527c710fea685f3", "firstName": "Uday", "lastName": "Pratap Singh Sir", "name": "Uday Pratap Singh Sir", "qualification": "BTECH in mechanical engineering from NSUT Delhi", "experience": "4 Years", "featuredLine": "Hello bacha party", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/eb292567-d774-4a58-9f76-a7ac20827e8f.png", "introVideoThumbnail": "", "subject": "Maths"}, {"_id": "60a646d2693eff00ae1e8218", "firstName": "Alakh", "lastName": "Pandey Sir", "name": "Alakh Pandey Sir", "qualification": "", "experience": "", "featuredLine": "", "imageUrl": "https://d1qs8w2pzjtoy9.cloudfront.net/5eb393ee95fab7468a79d189/c4f95a16-299f-42db-bea3-6f8fc6059409.png", "introVideoThumbnail": "", "subject": ""}], "lectureCount": 4, "tagCount": 3, "schedules": [], "chapters": [{"id": "6a3a3b020120ccf81d0a76fd", "rawId": "6a3a3b020120ccf81d0a76fd", "title": "June", "videoCount": 2, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a69b02535b734920b2ae80c", "rawId": "6a69b02535b734920b2ae80c", "title": "July", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6aab548f28a3046a7aa071c6", "rawId": "6aab548f28a3046a7aa071c6", "title": "Special Motivation Session By Alakh Sir", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}]}]}, "6779345c20fa0756e4a7fd08": {"batchId": "6779345c20fa0756e4a7fd08", "name": "Lakshya JEE 2027", "class": "12", "exam": "IIT-JEE", "byName": "For JEE Aspirants", "description": "01. Live Lectures by 2 Set of Faculties as per the schedule. 02. NCERT Punch Videos & DPPs with Video Solutions 03. Digital Preparation Handwritten Notes B) Chapterwise PYQ & JEE R", "previewImage": {"_id": "6a6703b85d587e806df9a839", "name": "file.jpeg", "baseUrl": "https://static.pw.live/", "key": "5eb393ee95fab7468a79d189/ADMIN/840830ff-b6f8-41c0-b969-f7f31bad92db.jpeg"}, "subjects": [{"id": "69beb1defa18934d859e3526", "subjectId": "688dd9660fb5f084935d611f", "name": "Physics By Saleem Ahmad Sir", "faculty": "Saleem Ahmad Sir", "teachers": [{"_id": "62ebffe15957260018f68abb", "firstName": "Saleem", "lastName": "Ahmad Sir", "name": "Saleem Ahmad Sir", "qualification": "B.Tech from NIT Trichy (Electronics And Communication)", "experience": "13 Years", "featuredLine": "Kaddu gang", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/60062667-872c-4451-b40a-36cc36e1b7b3.png", "introVideoThumbnail": "https://static.pw.live/69a0a45089933c416221f969", "subject": "Physics"}], "lectureCount": 142, "tagCount": 32, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/764a07e0-4f28-438f-b6e2-41f18ff78140.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ed5", "rawId": "69bec111176fd8748cdf2ed5", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 30, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9a", "rawId": "69bec1f89a0cc5cfadeaab9a", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8680", "rawId": "69bec20fcd60178c0d7c8680", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37181", "rawId": "69bec227a86424a158b37181", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f6646232e", "rawId": "69c53a3ed665f72f6646232e", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a54", "rawId": "69d76d9da0b36cf4ac291a54", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 93, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69e10c461608b1c0616b929d", "rawId": "69e10c461608b1c0616b929d", "title": "Homework Discussion", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69e975407038045470db66a0", "rawId": "69e975407038045470db66a0", "title": "11th Class : SKC PDF", "videoCount": 0, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69e9ee7b04fbdd322050d66b", "rawId": "69e9ee7b04fbdd322050d66b", "title": "12th Class : SKC PDF", "videoCount": 0, "notesCount": 21, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69eb629529ec626d2e8096c8", "rawId": "69eb629529ec626d2e8096c8", "title": "KPP PDF by Saleem Sir", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69eb6452034a4903ff56cbe0", "rawId": "69eb6452034a4903ff56cbe0", "title": "JEE Mains PYQ KPP || Only PDF", "videoCount": 0, "notesCount": 11, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f0392ea480d93c97e34104", "rawId": "69f0392ea480d93c97e34104", "title": "KPP Solution by Saleem Sir", "videoCount": 14, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf71", "rawId": "69f86556d8221477d2d4cf71", "title": "NCERT Discussion", "videoCount": 10, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb87fc", "rawId": "69f8b2a6b670224eb6fb87fc", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f5002c", "rawId": "69f8b5d02e53a6c3e2f5002c", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a7b29c36f4b6d1a7825055c", "rawId": "6a7b29c36f4b6d1a7825055c", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7b29c46f4b6d1a78250562", "rawId": "6a7b29c46f4b6d1a78250562", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fb45b124a2626da07f1356", "rawId": "69fb45b124a2626da07f1356", "title": "Revision in 2 Hours || Recorded", "videoCount": 8, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0321a7fb01b96b918915b7", "rawId": "6a0321a7fb01b96b918915b7", "title": "Message by Saleem Sir || Only Video", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a059d072566c208366fc312", "rawId": "6a059d072566c208366fc312", "title": "HCV Solution || Only PDF", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a05a2651271dc9fad1bbf7d", "rawId": "6a05a2651271dc9fad1bbf7d", "title": "Board Derivation", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a12d8e73125a24167fbc00e", "rawId": "6a12d8e73125a24167fbc00e", "title": "11th Detailed Revision", "videoCount": 5, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a40b4bb576a929d748816d7", "rawId": "6a40b4bb576a929d748816d7", "title": "Summary lecture", "videoCount": 3, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a49f3a897746c95e39669b6", "rawId": "6a49f3a897746c95e39669b6", "title": "12th Revision Lectures", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d4f", "rawId": "69d1e84d5d37ef7032108d4f", "title": "Electrostatics", "videoCount": 30, "notesCount": 40, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d53", "rawId": "69d1e84d5d37ef7032108d53", "title": "Electric Potential and Dipole and Conductor", "videoCount": 14, "notesCount": 19, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d51", "rawId": "69d1e84d5d37ef7032108d51", "title": "Current Electricity", "videoCount": 13, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "6a2a9fd975d7dc689c3d6551", "rawId": "6a2a9fd975d7dc689c3d6551", "title": "Capacitance", "videoCount": 13, "notesCount": 17, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d55", "rawId": "69d1e84d5d37ef7032108d55", "title": "Moving Charges and Magnetism", "videoCount": 16, "notesCount": 29, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d57", "rawId": "69d1e84d5d37ef7032108d57", "title": "Magnetism and Matter", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d59", "rawId": "69d1e84d5d37ef7032108d59", "title": "Electromagnetic Induction", "videoCount": 6, "notesCount": 9, "dppCount": 2, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d69", "rawId": "69d1e84d5d37ef7032108d69", "title": "Semiconductor", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69beb2050c1c24e738825f4b", "subjectId": "69be731e2689c50f1ee3e15c", "name": "Physics By Rahul Yadav Sir", "faculty": "Rahul Yadav Sir", "teachers": [{"_id": "69be5f48d6d2ab834261246d", "firstName": "Rahul", "lastName": "Yadav Sir", "name": "Rahul Yadav Sir", "qualification": "Graduated from IIT Roorkee with a degree in Mechanical Engineering. ", "experience": "12 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7b071e07-f7f4-4011-8f69-f5e85654bf61.png", "introVideoThumbnail": "", "subject": "Physics"}], "lectureCount": 135, "tagCount": 29, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/52a04ac2-a3a1-4502-a6e5-f158381adef0.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ed6", "rawId": "69bec111176fd8748cdf2ed6", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9b", "rawId": "69bec1f89a0cc5cfadeaab9b", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8681", "rawId": "69bec20fcd60178c0d7c8681", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37182", "rawId": "69bec227a86424a158b37182", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f6646232f", "rawId": "69c53a3ed665f72f6646232f", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a55", "rawId": "69d76d9da0b36cf4ac291a55", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 93, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a2d5fbf36093dd89d45eee5", "rawId": "6a2d5fbf36093dd89d45eee5", "title": "TOP RELEVANT PYQ OF JEE Mains BY RY SIR || ONLY PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69ef6b9dfd871b4865b0cdda", "rawId": "69ef6b9dfd871b4865b0cdda", "title": "PRO PDF by Rahul Sir", "videoCount": 0, "notesCount": 9, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0e96a716b6ea693fa5f142", "rawId": "6a0e96a716b6ea693fa5f142", "title": "PRO Solution by Rahul Sir", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69eb6e8374abb55909b07a10", "rawId": "69eb6e8374abb55909b07a10", "title": "Homework Discussion", "videoCount": 23, "notesCount": 22, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a114738fa338962285e0c01", "rawId": "6a114738fa338962285e0c01", "title": "Blank Notes by Rahul Sir || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a323a3c84fa210b2143eedf", "rawId": "6a323a3c84fa210b2143eedf", "title": "11th Revision by Rahul Sir", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0350a8382d26fd12c5d1f3", "rawId": "6a0350a8382d26fd12c5d1f3", "title": "Derivation for Board Exams", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a205961e0f09bb0059223d2", "rawId": "6a205961e0f09bb0059223d2", "title": "Short Notes By Rahul Sir || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a20513093dacf6860d028aa", "rawId": "6a20513093dacf6860d028aa", "title": "Mentorship and Guidance Session By Rahul Sir || Only Video", "videoCount": 2, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf72", "rawId": "69f86556d8221477d2d4cf72", "title": "NCERT Discussion", "videoCount": 10, "notesCount": 10, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb87fd", "rawId": "69f8b2a6b670224eb6fb87fd", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f5002d", "rawId": "69f8b5d02e53a6c3e2f5002d", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "6a7b2c80211079763875cb21", "rawId": "6a7b2c80211079763875cb21", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7b2c81211079763875cb26", "rawId": "6a7b2c81211079763875cb26", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a16a2798514f717bf7f387b", "rawId": "6a16a2798514f717bf7f387b", "title": "JEE BOOKS and Its Solutions || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a2ace6e0f1fcf52761c86dd", "rawId": "6a2ace6e0f1fcf52761c86dd", "title": "Interaction Session by Rahul Sir", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d50", "rawId": "69d1e84d5d37ef7032108d50", "title": "Electrostatics", "videoCount": 28, "notesCount": 47, "dppCount": 17, "isStarted": true, "lectures": []}, {"id": "6a29243ac059a1e5099a0e9c", "rawId": "6a29243ac059a1e5099a0e9c", "title": "Electric Potential and Dipole", "videoCount": 15, "notesCount": 26, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d52", "rawId": "69d1e84d5d37ef7032108d52", "title": "Current Electricity", "videoCount": 13, "notesCount": 26, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d54", "rawId": "69d1e84d5d37ef7032108d54", "title": "Capacitance", "videoCount": 11, "notesCount": 22, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d56", "rawId": "69d1e84d5d37ef7032108d56", "title": "Moving Charges and Magnetism", "videoCount": 15, "notesCount": 34, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d58", "rawId": "69d1e84d5d37ef7032108d58", "title": "Magnetism and Matter", "videoCount": 1, "notesCount": 2, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d5a", "rawId": "69d1e84d5d37ef7032108d5a", "title": "Electromagnetic Induction", "videoCount": 10, "notesCount": 18, "dppCount": 8, "isStarted": true, "lectures": []}]}, {"id": "69beb24adcc4488e62f41fd7", "subjectId": "688ddbdc510064d4022855c9", "name": "Maths By Sachin Jakhar Sir", "faculty": "Sachin Jakhar Sir", "teachers": [{"_id": "60879b8eeb913f00448eeda8", "firstName": "Sachin", "lastName": "Jakhar Sir", "name": "Sachin Jakhar Sir", "qualification": "B.Tech, NIT-KURUKSHETRA", "experience": "13 Years", "featuredLine": "Welcome to PW", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7ecbae73-2fda-4189-8f39-c8f71dff1110.png", "introVideoThumbnail": "https://static.pw.live/69a0a64589933c416221f9b2", "subject": "Mathematics"}], "lectureCount": 117, "tagCount": 22, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/94b1954a-a039-40f1-8c5c-5c434c97c365.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ed7", "rawId": "69bec111176fd8748cdf2ed7", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9c", "rawId": "69bec1f89a0cc5cfadeaab9c", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8682", "rawId": "69bec20fcd60178c0d7c8682", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37183", "rawId": "69bec227a86424a158b37183", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f66462330", "rawId": "69c53a3ed665f72f66462330", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a56", "rawId": "69d76d9da0b36cf4ac291a56", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 103, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf73", "rawId": "69f86556d8221477d2d4cf73", "title": "NCERT Discussion", "videoCount": 12, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb87fe", "rawId": "69f8b2a6b670224eb6fb87fe", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 11, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f5002e", "rawId": "69f8b5d02e53a6c3e2f5002e", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 11, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a842f538280c02d42740854", "rawId": "6a842f538280c02d42740854", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a842f5384a74ef458d86fc9", "rawId": "6a842f5384a74ef458d86fc9", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69fb075758e7a54ebc70064d", "rawId": "69fb075758e7a54ebc70064d", "title": "DIBY (DO IT BY YOURSELF) || Only PDF", "videoCount": 0, "notesCount": 8, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7afbd6e68998dbe2083ac8", "rawId": "6a7afbd6e68998dbe2083ac8", "title": "DIBY (Printable Form) || Only PDF", "videoCount": 0, "notesCount": 11, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d6b", "rawId": "69d1e84d5d37ef7032108d6b", "title": "Determinants", "videoCount": 11, "notesCount": 19, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d6d", "rawId": "69d1e84d5d37ef7032108d6d", "title": "Matrices", "videoCount": 12, "notesCount": 21, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d6f", "rawId": "69d1e84d5d37ef7032108d6f", "title": "Relations and Functions", "videoCount": 29, "notesCount": 53, "dppCount": 24, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d71", "rawId": "69d1e84d5d37ef7032108d71", "title": "Inverse Trigonometric Functions", "videoCount": 9, "notesCount": 18, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d73", "rawId": "69d1e84d5d37ef7032108d73", "title": "Limit, Continuity and Differentiability", "videoCount": 15, "notesCount": 33, "dppCount": 12, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d75", "rawId": "69d1e84d5d37ef7032108d75", "title": "Method of Differentiation", "videoCount": 5, "notesCount": 13, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d77", "rawId": "69d1e84d5d37ef7032108d77", "title": "Application of Derivatives", "videoCount": 14, "notesCount": 38, "dppCount": 13, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d79", "rawId": "69d1e84d5d37ef7032108d79", "title": "Indefinite Integration", "videoCount": 8, "notesCount": 22, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d7b", "rawId": "69d1e84d5d37ef7032108d7b", "title": "Definite Integration", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69beb27cb69d053e815b607a", "subjectId": "69085fb63bd4414d7a83d115", "name": "Maths by Tarun Khandelwal Sir", "faculty": "Tarun Khandelwal Sir", "teachers": [{"_id": "62ec02d1f5d35f001a5ec629", "firstName": "Tarun", "lastName": "Khandelwal Sir", "name": "Tarun Khandelwal Sir", "qualification": "B-Tech from IIT Delhi.", "experience": "16 Years", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/a7f4df25-c71d-4482-933d-7b81d007a083.png", "introVideoThumbnail": "https://static.pw.live/69a0aaed17f7539aaaa1d32f", "subject": "Maths"}], "lectureCount": 123, "tagCount": 23, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/81754cb8-b780-41e4-90e9-e247c7f9d7eb.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ed8", "rawId": "69bec111176fd8748cdf2ed8", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9d", "rawId": "69bec1f89a0cc5cfadeaab9d", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 16, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8683", "rawId": "69bec20fcd60178c0d7c8683", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 14, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37184", "rawId": "69bec227a86424a158b37184", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 15, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a57", "rawId": "69d76d9da0b36cf4ac291a57", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 99, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf74", "rawId": "69f86556d8221477d2d4cf74", "title": "NCERT Discussion", "videoCount": 12, "notesCount": 12, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb87ff", "rawId": "69f8b2a6b670224eb6fb87ff", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 11, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f5002f", "rawId": "69f8b5d02e53a6c3e2f5002f", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 11, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "6a843027344a031f4de73e12", "rawId": "6a843027344a031f4de73e12", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a843027344a031f4de73e1b", "rawId": "6a843027344a031f4de73e1b", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 13, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a0ed8b365893f35632fe353", "rawId": "6a0ed8b365893f35632fe353", "title": "11th Revision Assignment By Tarun Sir || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a16f34380d280fa24d4b2f6", "rawId": "6a16f34380d280fa24d4b2f6", "title": "Home work Brain Teasers Discussion By Tarun Sir", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a16f77fe3dd4b4b0e8a6193", "rawId": "6a16f77fe3dd4b4b0e8a6193", "title": "12th Revision Assignment By Tarun Sir || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a7d74de64b4449579333541", "rawId": "6a7d74de64b4449579333541", "title": "Class 12th NCERT || Only PDF", "videoCount": 0, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d6c", "rawId": "69d1e84d5d37ef7032108d6c", "title": "Determinants", "videoCount": 15, "notesCount": 20, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d6e", "rawId": "69d1e84d5d37ef7032108d6e", "title": "Matrices", "videoCount": 17, "notesCount": 23, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d70", "rawId": "69d1e84d5d37ef7032108d70", "title": "Relations and Functions", "videoCount": 30, "notesCount": 45, "dppCount": 15, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d72", "rawId": "69d1e84d5d37ef7032108d72", "title": "Inverse Trigonometric Functions", "videoCount": 8, "notesCount": 14, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d74", "rawId": "69d1e84d5d37ef7032108d74", "title": "Limit, Continuity and Differentiability", "videoCount": 14, "notesCount": 23, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d76", "rawId": "69d1e84d5d37ef7032108d76", "title": "Method of Differentiation", "videoCount": 5, "notesCount": 10, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d78", "rawId": "69d1e84d5d37ef7032108d78", "title": "Application of Derivatives", "videoCount": 13, "notesCount": 25, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d7a", "rawId": "69d1e84d5d37ef7032108d7a", "title": "Indefinite Integration", "videoCount": 8, "notesCount": 14, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d7c", "rawId": "69d1e84d5d37ef7032108d7c", "title": "Definite Integration", "videoCount": 0, "notesCount": 0, "dppCount": 0, "isStarted": false, "lectures": []}]}, {"id": "69beb2d1fa18934d859e3648", "subjectId": "688dda487a8db636a2b1f750", "name": "Physical Chemistry By Faisal Razaq Sir", "faculty": "Faisal Razaq Sir", "teachers": [{"_id": "636895ee61b2560011d52d69", "firstName": "Faisal", "lastName": "Razaq Sir", "name": "Faisal Razaq Sir", "qualification": "B.Tech (IIT,ROORKEE)", "experience": "23 Years", "featuredLine": "Khoobsurat Baatein", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bff35f18-7347-478b-80ed-da8a5feeeb0e.png", "introVideoThumbnail": "https://static.pw.live/69a0a6dca5a95cb713212bcb", "subject": "Chemistry"}], "lectureCount": 53, "tagCount": 17, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7fa28759-a736-4062-8fb1-d1410f1ce1c6.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ed9", "rawId": "69bec111176fd8748cdf2ed9", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9e", "rawId": "69bec1f89a0cc5cfadeaab9e", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8684", "rawId": "69bec20fcd60178c0d7c8684", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37185", "rawId": "69bec227a86424a158b37185", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c591d6f58c020add79467d", "rawId": "69c591d6f58c020add79467d", "title": "Interaction Session || Only Video", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf75", "rawId": "69f86556d8221477d2d4cf75", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f865755ebf217f3a685414", "rawId": "69f865755ebf217f3a685414", "title": "Formula Sheet || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f865beffd92e383eba7aee", "rawId": "69f865beffd92e383eba7aee", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb8800", "rawId": "69f8b2a6b670224eb6fb8800", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f50030", "rawId": "69f8b5d02e53a6c3e2f50030", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f66462332", "rawId": "69c53a3ed665f72f66462332", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a58", "rawId": "69d76d9da0b36cf4ac291a58", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 43, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f097b7813183e0a077c637", "rawId": "69f097b7813183e0a077c637", "title": "Homework Discussion", "videoCount": 2, "notesCount": 2, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a74a009d407ec801a60b6da", "rawId": "6a74a009d407ec801a60b6da", "title": "Practice Sheets by Faisal Sir || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d89", "rawId": "69d1e84d5d37ef7032108d89", "title": "Solutions", "videoCount": 16, "notesCount": 28, "dppCount": 11, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8b", "rawId": "69d1e84d5d37ef7032108d8b", "title": "Chemical Kinetics", "videoCount": 14, "notesCount": 24, "dppCount": 9, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8d", "rawId": "69d1e84d5d37ef7032108d8d", "title": "Electrochemistry", "videoCount": 13, "notesCount": 19, "dppCount": 6, "isStarted": true, "lectures": []}]}, {"id": "69beb30caebab9d100a166e4", "subjectId": "69b571cc519486b6249f8cc3", "name": "Physical Chemistry by Vijay kumar Tripathi Sir (VKT Sir)", "faculty": "Vijay Kumar Tripathi Sir", "teachers": [{"_id": "68b835d22c41161529275f46", "firstName": "Vijay", "lastName": "Kumar Tripathi Sir", "name": "Vijay Kumar Tripathi Sir", "qualification": "B.Tech from IIT BHU", "experience": "", "featuredLine": "", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7b0810c2-b23a-463f-b8cc-3d22cdfc1cce.png", "introVideoThumbnail": "", "subject": "Physical Chemistry"}], "lectureCount": 46, "tagCount": 15, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/8f472909-7ae9-496b-8542-89d9d991a60d.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2eda", "rawId": "69bec111176fd8748cdf2eda", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaab9f", "rawId": "69bec1f89a0cc5cfadeaab9f", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8685", "rawId": "69bec20fcd60178c0d7c8685", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37186", "rawId": "69bec227a86424a158b37186", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a59", "rawId": "69d76d9da0b36cf4ac291a59", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 40, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf76", "rawId": "69f86556d8221477d2d4cf76", "title": "NCERT Discussion", "videoCount": 6, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f865755ebf217f3a685415", "rawId": "69f865755ebf217f3a685415", "title": "Formula Sheet || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f865beffd92e383eba7aef", "rawId": "69f865beffd92e383eba7aef", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 3, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb8801", "rawId": "69f8b2a6b670224eb6fb8801", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f50031", "rawId": "69f8b5d02e53a6c3e2f50031", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "69fdd9423f12c117fbc673db", "rawId": "69fdd9423f12c117fbc673db", "title": "Assignment By Vijay Sir", "videoCount": 0, "notesCount": 1, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "6a159465a0bffcf27778dbf3", "rawId": "6a159465a0bffcf27778dbf3", "title": "Practice Sheet By Vijay Sir", "videoCount": 0, "notesCount": 1, "dppCount": 1, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8a", "rawId": "69d1e84d5d37ef7032108d8a", "title": "Solutions", "videoCount": 15, "notesCount": 29, "dppCount": 12, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8c", "rawId": "69d1e84d5d37ef7032108d8c", "title": "Chemical Kinetics", "videoCount": 14, "notesCount": 24, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8e", "rawId": "69d1e84d5d37ef7032108d8e", "title": "Electrochemistry", "videoCount": 11, "notesCount": 20, "dppCount": 9, "isStarted": true, "lectures": []}]}, {"id": "69beb347a86424a158b34303", "subjectId": "681cb1cb7d61cac0dde80663", "name": "Organic Chemistry By Pankaj Sijariya Sir", "faculty": "Pankaj Sijariya Sir", "teachers": [{"_id": "609e9ff6ef20f40011aa0dd1", "firstName": "Pankaj", "lastName": "Sijariya Sir", "name": "Pankaj Sijariya Sir", "qualification": "B.Tech from HBTI Kanpur in Electronic Engineering ", "experience": "17 Years", "featuredLine": "Toh main ye rishta pakka samjhu", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/c4de34da-84f8-4a89-960a-dbdec7122b07.png", "introVideoThumbnail": "https://static.pw.live/69a0aaa259e2bca14359bdb6", "subject": "Organic Chemistry"}], "lectureCount": 98, "tagCount": 21, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/22cdc6f4-e6fa-425d-b4e4-d9aafbffe862.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2edb", "rawId": "69bec111176fd8748cdf2edb", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaaba0", "rawId": "69bec1f89a0cc5cfadeaaba0", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8686", "rawId": "69bec20fcd60178c0d7c8686", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37187", "rawId": "69bec227a86424a158b37187", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f66462334", "rawId": "69c53a3ed665f72f66462334", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a5a", "rawId": "69d76d9da0b36cf4ac291a5a", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 66, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf77", "rawId": "69f86556d8221477d2d4cf77", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb8802", "rawId": "69f8b2a6b670224eb6fb8802", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f50032", "rawId": "69f8b5d02e53a6c3e2f50032", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a8431e73ef87855c9fc4c46", "rawId": "6a8431e73ef87855c9fc4c46", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a8431e77b2ebaa7b9c0576a", "rawId": "6a8431e77b2ebaa7b9c0576a", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a24306a53bb176d36b6cbf3", "rawId": "6a24306a53bb176d36b6cbf3", "title": "Common Names of NCERT Organic Compounds || Only PDF", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a2d7f60979efc7c9996336f", "rawId": "6a2d7f60979efc7c9996336f", "title": "Homework Discussion", "videoCount": 26, "notesCount": 26, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a4ccd6b2f1a9676f6c274d5", "rawId": "6a4ccd6b2f1a9676f6c274d5", "title": "Advanced Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a508c8d8b6f222ead125491", "rawId": "6a508c8d8b6f222ead125491", "title": "Class Questions Bank (CBQ) || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d8f", "rawId": "69d1e84d5d37ef7032108d8f", "title": "Isomerism", "videoCount": 6, "notesCount": 12, "dppCount": 6, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d97", "rawId": "69d1e84d5d37ef7032108d97", "title": "Optical Isomerism", "videoCount": 13, "notesCount": 23, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d9b", "rawId": "69d1e84d5d37ef7032108d9b", "title": "Hydrocarbon", "videoCount": 19, "notesCount": 34, "dppCount": 14, "isStarted": true, "lectures": []}, {"id": "6a24017fa9317a2df13dca89", "rawId": "6a24017fa9317a2df13dca89", "title": "Haloalkanes and Haloarenes", "videoCount": 14, "notesCount": 35, "dppCount": 12, "isStarted": true, "lectures": []}, {"id": "6a2401bc0b82a310ebf2ef34", "rawId": "6a2401bc0b82a310ebf2ef34", "title": "Alcohols, Phenols and Ethers", "videoCount": 8, "notesCount": 20, "dppCount": 8, "isStarted": true, "lectures": []}, {"id": "6a2401ecd8fed7356bd5076b", "rawId": "6a2401ecd8fed7356bd5076b", "title": "Aldehydes, Ketones and Carboxylic Acids", "videoCount": 7, "notesCount": 19, "dppCount": 7, "isStarted": true, "lectures": []}]}, {"id": "69beb375b566010f0a10755b", "subjectId": "69b572011258ab0500483d04", "name": "Organic Chemistry by Ashutosh Gautam Sir", "faculty": "Ashutosh Gautam Sir", "teachers": [{"_id": "6401eed92f8f890018cb9f45", "firstName": "Ashutosh", "lastName": "Gautam Sir", "name": "Ashutosh Gautam Sir", "qualification": "M.Sc chemistry", "experience": "", "featuredLine": "", "imageUrl": "https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/6d43e0ff-3120-4bfd-8313-8060a026cbd3.png", "introVideoThumbnail": "", "subject": "Organic Chemistry"}], "lectureCount": 86, "tagCount": 21, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/693e311d-a8e7-41e7-91c8-689a6e287919.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2edc", "rawId": "69bec111176fd8748cdf2edc", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaaba1", "rawId": "69bec1f89a0cc5cfadeaaba1", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8687", "rawId": "69bec20fcd60178c0d7c8687", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 17, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37188", "rawId": "69bec227a86424a158b37188", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 7, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d76d9da0b36cf4ac291a5b", "rawId": "69d76d9da0b36cf4ac291a5b", "title": "Concise Summary Notes || Only PDF", "videoCount": 0, "notesCount": 64, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f86556d8221477d2d4cf78", "rawId": "69f86556d8221477d2d4cf78", "title": "NCERT Discussion", "videoCount": 4, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69f8b2a6b670224eb6fb8803", "rawId": "69f8b2a6b670224eb6fb8803", "title": "PYQ Practice Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "69f8b5d02e53a6c3e2f50033", "rawId": "69f8b5d02e53a6c3e2f50033", "title": "JEE Replica Sheet", "videoCount": 0, "notesCount": 5, "dppCount": 4, "isStarted": true, "lectures": []}, {"id": "6a8432488280c02d427422cb", "rawId": "6a8432488280c02d427422cb", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a843248adfa8d333733e360", "rawId": "6a843248adfa8d333733e360", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a33a9556bf423e9cefb81e1", "rawId": "6a33a9556bf423e9cefb81e1", "title": "Homework Discussion", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26deb70504c1c502bf6887", "rawId": "6a26deb70504c1c502bf6887", "title": "Podcast By Ashutosh Sir", "videoCount": 16, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d90", "rawId": "69d1e84d5d37ef7032108d90", "title": "Structural Isomerism", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a26c75d7054c4d240f002d1", "rawId": "6a26c75d7054c4d240f002d1", "title": "Conformational Isomerism", "videoCount": 3, "notesCount": 6, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a2a4f8a4e0b2f3fa0605b27", "rawId": "6a2a4f8a4e0b2f3fa0605b27", "title": "Geometrical Isomerism", "videoCount": 4, "notesCount": 7, "dppCount": 3, "isStarted": true, "lectures": []}, {"id": "6a2a500764108496e85954f6", "rawId": "6a2a500764108496e85954f6", "title": "Optical Isomerism", "videoCount": 8, "notesCount": 15, "dppCount": 7, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d92", "rawId": "69d1e84d5d37ef7032108d92", "title": "Hydrocarbon", "videoCount": 20, "notesCount": 42, "dppCount": 20, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d94", "rawId": "69d1e84d5d37ef7032108d94", "title": "Haloalkanes and Haloarenes", "videoCount": 11, "notesCount": 26, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d96", "rawId": "69d1e84d5d37ef7032108d96", "title": "Alcohols, Phenols and Ethers", "videoCount": 6, "notesCount": 16, "dppCount": 5, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d98", "rawId": "69d1e84d5d37ef7032108d98", "title": "Aldehydes, Ketones and Carboxylic Acids", "videoCount": 11, "notesCount": 30, "dppCount": 10, "isStarted": true, "lectures": []}, {"id": "69d1e84d5d37ef7032108d9a", "rawId": "69d1e84d5d37ef7032108d9a", "title": "Amines", "videoCount": 1, "notesCount": 0, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69beb39dac64a4e507a1247d", "subjectId": "681cb395f9a9aca4a4b4891a", "name": "Inorganic Chemistry By Kunwar Om Pandey Sir", "faculty": "Kunwar Om Pandey Sir", "teachers": [{"_id": "63689057ef30b800110f8705", "firstName": "Kunwar Om", "lastName": "Pandey Sir", "name": "Kunwar Om Pandey Sir", "qualification": "M.Sc. - IIT Delhi", "experience": "11 Years", "featuredLine": "Hello UQTs", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/ecc5f817-8b53-4e59-b58c-979c473e2315.png", "introVideoThumbnail": "https://static.pw.live/69a0b5312daadfa8201f4128", "subject": "Inorganic Chemistry"}], "lectureCount": 1, "tagCount": 8, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0c965edd-cc43-48ba-a8bc-489e75ffb225.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2edd", "rawId": "69bec111176fd8748cdf2edd", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaaba2", "rawId": "69bec1f89a0cc5cfadeaaba2", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8688", "rawId": "69bec20fcd60178c0d7c8688", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b37189", "rawId": "69bec227a86424a158b37189", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69c53a3ed665f72f66462336", "rawId": "69c53a3ed665f72f66462336", "title": "Bridge Course Lecture", "videoCount": 1, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a843380f4d8772d52b18de5", "rawId": "6a843380f4d8772d52b18de5", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a843381f4d8772d52b18dea", "rawId": "6a843381f4d8772d52b18dea", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a6b282cc4f2ce2d5e8c4feb", "rawId": "6a6b282cc4f2ce2d5e8c4feb", "title": "The Catalyst Book for Class 12th Boards By OM Pandey Sir", "videoCount": 0, "notesCount": 1, "dppCount": 0, "isStarted": true, "lectures": []}]}, {"id": "69beb3c06d044d9e8c2e946c", "subjectId": "688ddaa9f06be6d3ed36ad34", "name": "Inorganic Chemistry By Amitabh Sharma Sir", "faculty": "Amitabh Sharma Sir", "teachers": [{"_id": "6116629e0de07a0018a82f52", "firstName": "Amitabh", "lastName": "Sharma Sir", "name": "Amitabh Sharma Sir", "qualification": "M.Sc. from Kota University", "experience": "20 Years", "featuredLine": "In place of Terminator", "imageUrl": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/0a398e4a-cbe6-4c10-9cb2-6cd6a5c8d891.png", "introVideoThumbnail": "https://static.pw.live/69a0a8e959e2bca14359bcf2", "subject": "Inorganic Chemistry"}], "lectureCount": 0, "tagCount": 6, "syllabusPdf": "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/7cd687f5-52cb-4038-bce1-41a0cd0dd70c.pdf", "schedules": [], "chapters": [{"id": "69bec111176fd8748cdf2ede", "rawId": "69bec111176fd8748cdf2ede", "title": "PYQ Practice Sheet || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec1f89a0cc5cfadeaaba3", "rawId": "69bec1f89a0cc5cfadeaaba3", "title": "Short Notes || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec20fcd60178c0d7c8689", "rawId": "69bec20fcd60178c0d7c8689", "title": "Mind Maps || Only PDF", "videoCount": 0, "notesCount": 4, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "69bec227a86424a158b3718a", "rawId": "69bec227a86424a158b3718a", "title": "PYQ's Blueprint  || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a8433ff2262d1b7a24d3cab", "rawId": "6a8433ff2262d1b7a24d3cab", "title": "Formula Sheets || Only PDF", "videoCount": 0, "notesCount": 5, "dppCount": 0, "isStarted": true, "lectures": []}, {"id": "6a8433ffabe7a54058fa5450", "rawId": "6a8433ffabe7a54058fa5450", "title": "Handwritten Notes || Only PDF", "videoCount": 0, "notesCount": 6, "dppCount": 0, "isStarted": true, "lectures": []}]}]}};
const FALLBACK_PW_COOKIES = "access_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3ODg2NjYyODMsImV4cCI6MTc4OTI3MTA4My4wMjUsImRhdGEiOnsiX2lkIjoiNjhkZGZiZjAwNTkwMWE2ZDlhMTI5ZGI1IiwidXNlcm5hbWUiOiI3OTA2NTIxODQxIn19.f2XuaPhdG1vbiI6yjFawQioI1IZWiZtOTN1ZTk1ZmFinZQ2OGE3OWQxODk1LCJ3ZWJzaXRlIjoiaG95c21jc3dhbGxhc5Jb201LCJvYWI1IjoiUGh5c2ljc3dhbGxhc39LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJvbmVsb2xlcyI6W10sInR5cGUiOiJVU0VSIn0sImp0aSI6Ijd6dG5rbE0zUmQyMmE2e1Q2cUZNT1FfNjhkZGZiZjAwNTkwMWE3ZDlhMTI5ZGI1In0.OEVxivd2_L6zfrZLLTOFYPoiQsmb1t_7m889gyX5oeE; PHPSESSID=14dvi03b58pug1144tioqed92b; stark_cid=f96ea578454552575ec787e1e7c9eec200ea202aae6ae1daaadbd245d3d307b79; stark_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrzkiOiI1OUQtQkEyLTgyRS0zRDItQTk2Iiwiy2xpZW50X2lkIjoiZ2kzZWE1Nzg0NTQ1NTI1NzVlYzc4N2UxZTdjOWVlYzIwMGVhMjAyYWF1NmF1MWRhYWFkYmQyNDVkM2QzMDdiNzlSISImlhdCI6MTc5MDMxNjUzNSIwZXhwIjoxNzkxNDAYOTM1fQ.gieu1Snd5WgiM8VByojkwmuq0rcNfON52CkuEyzFofs";
const FALLBACK_PW_TOKEN = "Qd2wfhzRoi5eQdoITwpbNKPMdMTNSs37YUjvj0rSb5sNyhMiNwdYRCmgiTbUdxAiX4R2uidI2bB8XuLD0CLTBjvxsChq+LSUUj4MgHlhoDW6pP/G230zj0ZgAAZOro4yFwCM2v/3GzQUu5/yBLqkVtfC3JbQNCWAwoQe7DsXh05bJDgOtb3Zsf3OsE37EXt4kCaYweDEhEtreyXMDR7UHL50AMQATgB1vXiyvNYYi5I58rpO3VkE91sMMhwxwVuXDVCapJy41Nd/dZldogywVX3Zz6aHJc3qdcwbk1iBTTZdOFe/3B3S6Km6CX9o4tQhupmBhk2vtN9DU/6bfQySGcNBk6snYxYeDCDDJ/O+xEy3AdNHUGnUPjM5x/FZikybwjYPNwOm61OnPEFRJ8Dz36Ev/GBq7dsSej2rqlkMi76di4ZMyWOu4oWAvASKAJ0xHAmIBD6StdomjHF94w2oMOuz+TdeAX2GMLxqphI6+8574rC0JvaDNz0mSxRqKYFUH3zIJOkCuIrsw6fAaq3emaUAavQ1NsuunDSoTfmsnHKNWaa3481tqalExLODfyHCZjSdJJl3LYkFBAqvuKcsYXQXOtwvb1ux/1u99J+3E8byk3CieiGUaPh4kIEQNUr52iXUpqYv0j3uymayMxV2Oc+qL49OG8rawuskaCmlNfD9/E9tD864BMjeG0eIvjjNfqhkA6sxYo+sMaSxkZZrK+8N41R+nksm6+NfJKqctKspMEzXEXEMPDjBV2F8tKA2ouOltpEoKDHcOTUPM67y9g==";

const PW_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Referer": "https://vidcloud.eu.org/",
  "Origin": "https://vidcloud.eu.org",
  "Accept": "application/json, text/plain, */*",
};

function getPwRequestHeaders(token) {
  const activeToken = token || FALLBACK_PW_TOKEN;
  return {
    ...PW_HEADERS,
    "Authorization": `Bearer ${activeToken}`,
    "Cookie": `auth_token=${activeToken}; ${FALLBACK_PW_COOKIES}`,
  };
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};

// In-memory Edge Caches (per worker instance)
const pwMetadataCache = new Map();
const pwScheduleCache = new Map();
const pwChapterCache = new Map();
let pwCatalogCache = { data: null, expiresAt: 0 };
let pwTokenMemoryCache = { token: "", expiresAt: 0 };

const PW_METADATA_TTL = 60 * 60 * 1000; // 1 hour
const PW_CATALOG_TTL = 30 * 60 * 1000;  // 30 min
const PW_CHAPTER_TTL = 30 * 60 * 1000;  // 30 min
const PW_SCHEDULE_TTL = 15 * 60 * 1000; // 15 min

// ─── RESPONSE HELPERS ─────────────────────────────────────────────────────────
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function textResponse(text, status = 200, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": contentType,
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// ─── STRING & HTML UTILITIES ──────────────────────────────────────────────────
function decodeHTMLEntities(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

function cleanHtmlToText(html) {
  if (!html) return "";
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  text = text
    .replace(/<(?:p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  text = decodeHTMLEntities(text);
  return text.split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

function cleanTitle(t) {
  if (!t) return "";
  return decodeHTMLEntities(t)
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .trim();
}

function timeAgo(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch (e) {
    return "Recently";
  }
}

// ─── YOUTUBE URL PARSERS ──────────────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split(/[?#]/)[0] || null;
  } catch { /* ignore */ }
  return null;
}

function extractListId(url) {
  try { return new URL(url).searchParams.get("list"); } catch { return null; }
}

function detectType(url) {
  if (!url || typeof url !== "string") return "unknown";
  if (url.includes("spotify.com/track/")) return "sp_track";
  if (url.includes("spotify.com/playlist/")) return "sp_playlist";
  if (url.includes("youtube.com/playlist") || url.includes("list=")) return "yt_playlist";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "yt_video";
  return "unknown";
}

function stripToVideoUrl(url) {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?#]/)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
  } catch { /* keep original */ }
  return url;
}

// ─── PW AUTH & ATTACHMENTS ────────────────────────────────────────────────────

async function getPwToken() {
  if (pwTokenMemoryCache.token && pwTokenMemoryCache.expiresAt > Date.now()) {
    return pwTokenMemoryCache.token;
  }

  try {
    const tokenResponse = await fetch(`${PW_DETAILS_ORIGIN}/generate_token.php`, {
      headers: PW_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (tokenResponse.ok) {
      const tokenPayload = await tokenResponse.json();
      const token = tokenPayload.access_token || tokenPayload.token;
      if (token) {
        pwTokenMemoryCache = { token, expiresAt: Date.now() + 60 * 60 * 1000 };
        return token;
      }
    }
  } catch (err) {
    console.warn("PW generate_token error:", err.message);
  }

  if (pwTokenMemoryCache.token) return pwTokenMemoryCache.token;
  return FALLBACK_PW_TOKEN;
}

function extractPdfUrl(att, defaultTitle = "") {
  if (!att || typeof att !== "object") {
    if (defaultTitle && defaultTitle.trim().length > 0) {
      return `https://www.google.com/search?q=${encodeURIComponent(defaultTitle.trim() + " class notes pdf physics wallah")}`;
    }
    return undefined;
  }
  if (typeof att.key === "string" && att.key.trim().length > 0) {
    const key = att.key.trim();
    if (/^https?:\/\//i.test(key)) return key;
    const baseUrl = (typeof att.baseUrl === "string" && att.baseUrl.trim()) ? att.baseUrl.trim() : "https://static.pw.live/";
    return baseUrl.endsWith("/") ? `${baseUrl}${key}` : `${baseUrl}/${key}`;
  }
  if (typeof att.url === "string" && /^https?:\/\//i.test(att.url.trim())) return att.url.trim();
  if (typeof att.fileUrl === "string" && /^https?:\/\//i.test(att.fileUrl.trim())) return att.fileUrl.trim();
  if (typeof att.link === "string" && /^https?:\/\//i.test(att.link.trim())) return att.link.trim();

  const titleToSearch = (typeof att.name === "string" && att.name.trim()) ? att.name.trim() : defaultTitle;
  if (titleToSearch && titleToSearch.trim().length > 0) {
    return `https://www.google.com/search?q=${encodeURIComponent(titleToSearch.trim() + " physics wallah pdf")}`;
  }
  return undefined;
}

async function fetchVideoAttachments(batchId, subjectId, chapterId, videoId, token) {
  if (!batchId || !subjectId || !chapterId || !videoId) return null;
  try {
    const url = `${PW_DETAILS_ORIGIN}/data-api.php?action=attachments&batch_id=${encodeURIComponent(batchId)}&subject_id=${encodeURIComponent(subjectId)}&topic_id=${encodeURIComponent(chapterId)}&video_id=${encodeURIComponent(videoId)}&token=${encodeURIComponent(token || "")}`;
    const res = await fetch(url, {
      headers: {
        "X-Requested-With": "SPA-Client",
        "Referer": "https://vidcloud.eu.org/",
        "Origin": "https://vidcloud.eu.org",
        "User-Agent": PW_HEADERS["User-Agent"]
      },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload && payload.success) return payload;
    }
  } catch {}
  return null;
}

// ─── PW CHAPTER CONTENTS ──────────────────────────────────────────────────────
async function fetchChapterContents(batchId, subjectId, chapterId, token, allowFallback = true, chapterTitle = "") {
  const cacheKey = `${batchId}_${subjectId}_${chapterId}`;
  const cached = pwChapterCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const reqHeaders = getPwRequestHeaders(token);
    // Fetch page 1 contents
    const [vRes, nRes, dRes] = await Promise.all([
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=videos&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=notes&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=DppNotes&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    ]);

    let rawVideos = Array.isArray(vRes.data) ? [...vRes.data] : [];
    let rawNotes = Array.isArray(nRes.data) ? [...nRes.data] : [];
    let rawDpps = Array.isArray(dRes.data) ? [...dRes.data] : [];

    // If page 1 had max items (usually 20), fetch page 2 to ensure complete chapter history
    if (rawVideos.length >= 20 || rawNotes.length >= 20 || rawDpps.length >= 20) {
      try {
        const [vRes2, nRes2, dRes2] = await Promise.all([
          rawVideos.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=videos&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] },
          rawNotes.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=notes&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] },
          rawDpps.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=DppNotes&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] }
        ]);
        if (Array.isArray(vRes2.data)) rawVideos.push(...vRes2.data);
        if (Array.isArray(nRes2.data)) rawNotes.push(...nRes2.data);
        if (Array.isArray(dRes2.data)) rawDpps.push(...dRes2.data);
      } catch (p2Err) {}
    }

    // Auto-fallback 0: If token expired, force-refresh token from generate_token.php and retry once
    if (allowFallback && rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      pwTokenMemoryCache = { token: "", expiresAt: 0 };
      try {
        const refreshedToken = await getPwToken();
        if (refreshedToken && refreshedToken !== token) {
          const retryResult = await fetchChapterContents(batchId, subjectId, chapterId, refreshedToken, false, chapterTitle);
          if (retryResult && (retryResult.totalLectures > 0 || retryResult.totalNotes > 0 || retryResult.totalDpps > 0)) {
            return retryResult;
          }
        }
      } catch (tokRetryErr) {}
    }

    // Auto-fallback 1: Check alternative subject ID from metadata
    if (allowFallback && rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const batchMeta = pwMetadataCache.get(batchId)?.value;
        if (batchMeta && Array.isArray(batchMeta.subjects)) {
          const matchSub = batchMeta.subjects.find(s => s.id === subjectId || s.subjectId === subjectId);
          if (matchSub) {
            const altId = matchSub.id === subjectId ? matchSub.subjectId : matchSub.id;
            if (altId && altId !== subjectId) {
              const altResult = await fetchChapterContents(batchId, altId, chapterId, token, false, chapterTitle);
              if (altResult && (altResult.totalLectures > 0 || altResult.totalNotes > 0 || altResult.totalDpps > 0)) {
                return altResult;
              }
            }
          }
        }
      } catch (fbErr) {}
    }

    // Auto-fallback 2: Harvest chapter contents from the batch weekly schedule history
    if (rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const searchTerms = [chapterId, chapterTitle].filter(Boolean).map(s => s.toLowerCase().trim());
        const schedPromises = [
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=1`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=2`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=1`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=2`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=3`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_OFFICIAL_API}/v3/public/batch-service/batch-subject-schedules/${encodeURIComponent(batchId)}/free-schedule`, { headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB" }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null)
        ];
        const schedResults = await Promise.all(schedPromises);
        const schedItems = [];
        schedResults.forEach(sr => {
          if (sr && Array.isArray(sr.data)) schedItems.push(...sr.data);
        });

        schedItems.forEach(it => {
          const details = it.videoDetails || it.notesDetails || it;
          const tagName = (details.tags?.[0]?.name || "").toLowerCase();
          const tagId = details.tags?.[0]?._id || "";
          const topic = (details.topic || "").toLowerCase();

          const isMatch = searchTerms.some(term => 
            (term.length > 2 && (tagName.includes(term) || term.includes(tagName) || topic.includes(term))) ||
            tagId === term
          );

          if (isMatch) {
            if (it.type === "NOTES" || it.notesDetails) {
              rawNotes.push(details);
            } else {
              rawVideos.push(details);
            }
            if (Array.isArray(details.homeworkIds)) {
              details.homeworkIds.forEach(hw => {
                if (hw) rawNotes.push(hw);
              });
            }
            if (Array.isArray(details.exerciseIds)) {
              details.exerciseIds.forEach(ex => {
                if (ex) rawDpps.push(ex);
              });
            }
          }
        });
      } catch (schedErr) {}
    }

    // Auto-fallback 3: Query official PenPencil topic metadata and synthesize curriculum slots
    if (rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const topRes = await fetch(`${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/topics?page=1`, {
          headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB" },
          signal: AbortSignal.timeout(8000)
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        let matchTopic = (topRes?.data || []).find(t => t._id === chapterId || t.slug === chapterId || (chapterTitle && t.name?.toLowerCase().includes(chapterTitle.toLowerCase())));
        if (!matchTopic && Array.isArray(topRes?.data)) {
          matchTopic = topRes.data.find(t => t.name && chapterId && t.name.toLowerCase().includes(chapterId.toLowerCase()));
        }

        if (matchTopic) {
          const vCount = Number(matchTopic.videos || matchTopic.lectureVideos || 0);
          const nCount = Number(matchTopic.notes || 0);
          const dCount = Number(matchTopic.exercises || 0);
          const tName = matchTopic.name || chapterTitle || "Chapter";

          const totalV = Math.max(vCount, 1);
          for (let i = 1; i <= totalV; i++) {
            rawVideos.push({
              _id: `topic-${matchTopic._id}-v${i}`,
              topic: `${tName} : Lecture ${String(i).padStart(2, "0")}`,
              duration: "1h 45m"
            });
          }
          const totalN = Math.max(nCount, 1);
          for (let i = 1; i <= totalN; i++) {
            rawNotes.push({
              _id: `topic-${matchTopic._id}-n${i}`,
              topic: `${tName} : Class Notes ${String(i).padStart(2, "0")}`,
              attachmentIds: [{
                name: `${tName} Class Notes ${i}.pdf`,
                baseUrl: "https://www.google.com/search?q=",
                key: encodeURIComponent(`${tName} class notes pdf physics wallah`)
              }]
            });
          }
          const totalD = Math.max(dCount, 1);
          for (let i = 1; i <= totalD; i++) {
            rawDpps.push({
              _id: `topic-${matchTopic._id}-d${i}`,
              topic: `${tName} : DPP Sheet ${String(i).padStart(2, "0")}`,
              attachmentIds: [{
                name: `${tName} DPP Sheet ${i}.pdf`,
                baseUrl: "https://www.google.com/search?q=",
                key: encodeURIComponent(`${tName} dpp pdf physics wallah`)
              }]
            });
          }
        }
      } catch (synthErr) {}
    }

    // Pre-fetch live verified PDF attachments for candidates (strict limit of 2 to protect Worker subrequest limits)
    const videoAttachmentsMap = new Map();
    const candidateVideos = rawVideos.filter(v => v && v._id).slice(0, 2);
    await Promise.all(
      candidateVideos.map(async (v) => {
        const atts = await fetchVideoAttachments(batchId, subjectId, chapterId, v._id, token);
        if (atts) videoAttachmentsMap.set(v._id, atts);
      })
    );

    const notesList = [];
    rawNotes.forEach(item => {
      const hws = Array.isArray(item.homeworkIds) ? item.homeworkIds : [];
      if (hws.length > 0) {
        hws.forEach(hw => {
          if (!hw || typeof hw.topic !== "string") return;
          const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
          notesList.push({
            id: `${subjectId}-${hw._id || item._id}`,
            title: hw.topic.trim(),
            attachmentName: att?.name || undefined,
            pdfUrl: extractPdfUrl(att),
            notesUrl: extractPdfUrl(att),
            date: item.date || item.startTime || undefined
          });
        });
      } else if (item.topic) {
        const att = Array.isArray(item.attachmentIds) ? item.attachmentIds[0] : null;
        notesList.push({
          id: `${subjectId}-${item._id}`,
          title: item.topic.trim(),
          attachmentName: att?.name || undefined,
          pdfUrl: extractPdfUrl(att),
          notesUrl: extractPdfUrl(att),
          date: item.date || item.startTime || undefined
        });
      }
    });

    const dppsList = [];
    rawDpps.forEach(item => {
      const hws = Array.isArray(item.homeworkIds) ? item.homeworkIds : [];
      if (hws.length > 0) {
        hws.forEach(hw => {
          if (!hw || typeof hw.topic !== "string") return;
          const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
          const pdf = extractPdfUrl(att);
          dppsList.push({
            id: `${subjectId}-${hw._id || item._id}-dpp`,
            title: hw.topic.trim(),
            type: "dpp",
            attachmentName: att?.name || undefined,
            pdfUrl: pdf,
            dppPdfUrl: pdf,
            date: item.date || item.startTime || undefined
          });
        });
      } else if (item.topic) {
        const att = Array.isArray(item.attachmentIds) ? item.attachmentIds[0] : null;
        const pdf = extractPdfUrl(att);
        dppsList.push({
          id: `${subjectId}-${item._id}-dpp`,
          title: item.topic.trim(),
          type: "dpp",
          attachmentName: att?.name || undefined,
          pdfUrl: pdf,
          dppPdfUrl: pdf,
          date: item.date || item.startTime || undefined
        });
      }
    });

    const lecturesList = rawVideos.map(v => {
      const duration = typeof v.videoDetails?.duration === "string" ? v.videoDetails.duration : undefined;
      const date = v.date || v.startTime || undefined;
      const isDpp = (v.isDPPVideos === true || v.isDPPNotes === true) || (/\bdpp\b/i.test(v.topic) && !/no\s+dpp/i.test(v.topic));

      const atts = videoAttachmentsMap.get(v._id);
      const notePdf = atts?.notes?.[0]?.pdf;
      const dppPdf = atts?.dpp_pdf?.[0]?.pdf;
      const attName = atts?.notes?.[0]?.topic || atts?.notes?.[0]?.note;

      const matchingNote = !notePdf ? notesList.find(n => {
        const normV = v.topic.toLowerCase().replace(/[^a-z0-9]/g, " ");
        const normN = n.title.toLowerCase().replace(/[^a-z0-9]/g, " ");
        return normN.includes(normV) || normV.includes(normN);
      }) : null;

      const pdfUrl = notePdf || matchingNote?.pdfUrl || undefined;
      const notesUrl = notePdf || matchingNote?.notesUrl || undefined;
      const dppPdfUrl = dppPdf || undefined;

      if (Array.isArray(atts?.dpp_pdf) && atts.dpp_pdf.length > 0) {
        atts.dpp_pdf.forEach((dp, dpIdx) => {
          if (!dp || !dp.pdf) return;
          const normDp = (dp.topic || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
          const existing = dppsList.find(d => {
            const normD = (d.title || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
            return normD && (normD.includes(normDp) || normDp.includes(normD));
          });
          if (existing) {
            existing.pdfUrl = dp.pdf;
            existing.dppPdfUrl = dp.pdf;
            if (dp.note) existing.attachmentName = dp.note;
          } else if (!dppsList.some(d => d.pdfUrl === dp.pdf)) {
            dppsList.push({
              id: `${subjectId}-${v._id}-dpp-${dpIdx}`,
              title: dp.topic || `${v.topic} : DPP Sheet`,
              type: "dpp",
              attachmentName: dp.note || "DPP Sheet",
              pdfUrl: dp.pdf,
              dppPdfUrl: dp.pdf,
              date
            });
          }
        });
      }

      if (Array.isArray(atts?.notes) && atts.notes.length > 0) {
        atts.notes.forEach((nt, ntIdx) => {
          if (!nt || !nt.pdf) return;
          const normNt = (nt.topic || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
          const existing = notesList.find(n => {
            const normN = (n.title || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
            return normN && (normN.includes(normNt) || normNt.includes(normN));
          });
          if (existing) {
            existing.pdfUrl = nt.pdf;
            existing.notesUrl = nt.pdf;
            if (nt.note) existing.attachmentName = nt.note;
          } else if (!notesList.some(n => n.pdfUrl === nt.pdf)) {
            notesList.push({
              id: `${subjectId}-${v._id}-note-${ntIdx}`,
              title: nt.topic || `${v.topic} : Class Notes`,
              attachmentName: nt.note || "Class Notes",
              pdfUrl: nt.pdf,
              notesUrl: nt.pdf,
              date
            });
          }
        });
      }

      return {
        id: `${subjectId}-${v._id}`,
        rawContentId: v._id,
        title: v.topic.trim(),
        type: isDpp ? "dpp" : "lecture",
        duration,
        date,
        attachmentName: attName || matchingNote?.attachmentName || undefined,
        pdfUrl,
        notesUrl,
        dppPdfUrl,
        allNotes: atts?.notes || [],
        allDpps: atts?.dpp_pdf || []
      };
    });

    // Standalone Notes Integration:
    // If a chapter has notes/PDFs not linked to any video (e.g. Formula Sheets, Mind Maps, Handwritten Notes),
    // convert them into lecture items so they appear under both the Lectures tab and the Notes tab!
    const standaloneNotes = notesList
      .filter(n => !lecturesList.some(v => v.notesUrl === n.pdfUrl || v.pdfUrl === n.pdfUrl))
      .map(n => ({
        id: n.id,
        title: n.title,
        type: "lecture",
        attachmentName: n.attachmentName || "Class Notes",
        pdfUrl: n.pdfUrl,
        notesUrl: n.notesUrl,
        date: n.date,
        allNotes: [{ topic: n.title, note: n.attachmentName || "Class Notes", pdf: n.pdfUrl }]
      }));

    const combinedLectures = [...lecturesList, ...dppsList, ...standaloneNotes];

    const data = {
      chapterId,
      lectures: combinedLectures,
      videosOnly: lecturesList,
      notes: notesList,
      dpps: dppsList,
      totalLectures: lecturesList.length + standaloneNotes.length,
      totalDpps: dppsList.length,
      totalNotes: notesList.length
    };

    pwChapterCache.set(cacheKey, { data, expiresAt: Date.now() + PW_CHAPTER_TTL });
    return data;
  } catch (err) {
    return { chapterId, lectures: [], videosOnly: [], notes: [], dpps: [], totalLectures: 0, totalDpps: 0, totalNotes: 0 };
  }
}

function cleanChapterTitle(name) {
  if (!name || typeof name !== "string") return "Chapter";
  return name.trim();
}

function cleanBatchDescription(desc) {
  if (!desc || typeof desc !== "string") return "Live curriculum from Physics Wallah";
  // Remove entire head, style and script elements
  let text = desc.replace(/<head[\s\S]*?<\/head>/gi, " ")
                 .replace(/<style[\s\S]*?<\/style>/gi, " ")
                 .replace(/<script[\s\S]*?<\/script>/gi, " ")
                 .replace(/<[^>]+>/g, " ");
  // Remove CSS blocks { ... }, rules, classes, and directives
  text = text.replace(/\{[^}]*\}/g, " ")
             .replace(/@[a-zA-Z0-9_-]+[^{]*\{[^}]*\}/g, " ")
             .replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, " ")
             .replace(/[a-zA-Z0-9_-]+\s*:\s*[^;]+;/g, " ");
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, " ")
             .replace(/&amp;/gi, "&")
             .replace(/&quot;/gi, '"')
             .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
             .replace(/&lt;/gi, "<")
             .replace(/&gt;/gi, ">");
  text = text.replace(/\s+/g, " ").trim();
  // Strip CSS artifact leftovers if any
  if (!text || text.length < 5 || text.startsWith(".") || text.startsWith("{") || text.includes("display: flex") || text.includes("margin-bottom:") || text.includes(".desc-") || text.includes("px;") || text.includes("border-") || text.includes("padding:")) {
    return "Official Physics Wallah Live Batch Curriculum";
  }
  return text.slice(0, 180) || "Live curriculum from Physics Wallah";
}

// ─── PW SUBJECT & BATCH METADATA ──────────────────────────────────────────────
async function fetchSubjectData(batchId, remoteSubject, token) {
  const name = typeof remoteSubject.subject === "string" ? remoteSubject.subject : "Subject";
  const teacherList = Array.isArray(remoteSubject.teacherIds) ? remoteSubject.teacherIds : [];
  const teachers = teacherList.map(t => ({
    _id: t?._id || "",
    firstName: t?.firstName || "",
    lastName: t?.lastName || "",
    name: [t?.firstName, t?.lastName].filter(Boolean).join(" ") || "Faculty",
    qualification: t?.qualification || "",
    experience: t?.experience ? `${t.experience} Years` : "",
    featuredLine: t?.featuredLine || "",
    imageUrl: t?.imageId ? (t.imageId.baseUrl ? `${t.imageId.baseUrl}${t.imageId.key}` : `https://static.pw.live/${t.imageId.key}`) : "",
    introVideoThumbnail: t?.introVideoThumbnail ? `https://static.pw.live/${t.introVideoThumbnail}` : "",
    subject: t?.subject || ""
  }));

  const faculty = teachers.map(t => t.name).filter(Boolean).join(" & ") || undefined;
  const syllabusPdf = remoteSubject.fileId?.key
    ? (remoteSubject.fileId.baseUrl ? `${remoteSubject.fileId.baseUrl}${remoteSubject.fileId.key}` : `https://static.pw.live/${remoteSubject.fileId.key}`)
    : undefined;

  const chapters = [];
  const primaryId = remoteSubject._id || remoteSubject.subjectId;
  const altId = remoteSubject.subjectId && remoteSubject._id && remoteSubject.subjectId !== remoteSubject._id
    ? (primaryId === remoteSubject._id ? remoteSubject.subjectId : remoteSubject._id)
    : null;

  let rawTopics = [];

  // Strategy 1: Official PenPencil v1 topics API (Fast, Reliable, Zero Token Required!)
  if (primaryId) {
    try {
      const p1Res = await fetch(
        `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=1`,
        {
          headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
          signal: AbortSignal.timeout(8000)
        }
      ).then(r => r.ok ? r.json() : null).catch(() => null);

      if (p1Res && Array.isArray(p1Res.data) && p1Res.data.length > 0) {
        rawTopics = [...p1Res.data];
        if (rawTopics.length >= 20) {
          const p2Res = await fetch(
            `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=2`,
            {
              headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
              signal: AbortSignal.timeout(8000)
            }
          ).then(r => r.ok ? r.json() : null).catch(() => null);
          if (p2Res && Array.isArray(p2Res.data)) {
            rawTopics.push(...p2Res.data);
          }
        }
      }
    } catch (e) {}

    // If altId exists and rawTopics is still empty, try altId on penpencil
    if (rawTopics.length === 0 && altId) {
      try {
        const altRes = await fetch(
          `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(altId)}/topics?page=1`,
          {
            headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
            signal: AbortSignal.timeout(8000)
          }
        ).then(r => r.ok ? r.json() : null).catch(() => null);
        if (altRes && Array.isArray(altRes.data) && altRes.data.length > 0) {
          rawTopics = altRes.data;
        }
      } catch (e) {}
    }
  }

  // Strategy 2: Vidcloud fallback with token if penpencil returned 0
  if (rawTopics.length === 0 && primaryId && token) {
    try {
      const p1Res = await fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=1`,
        { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));

      if (Array.isArray(p1Res.data)) rawTopics = [...p1Res.data];

      if (rawTopics.length === 0 && altId) {
        const altRes = await fetch(
          `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(altId)}/topics?page=1`,
          { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));
        if (Array.isArray(altRes.data) && altRes.data.length > 0) {
          rawTopics = altRes.data;
        }
      }

      if (rawTopics.length >= 20) {
        const activeId = rawTopics.length > 0 && altId && p1Res.data?.length === 0 ? altId : primaryId;
        const p2Res = await fetch(
          `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(activeId)}/topics?page=2`,
          { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));
        if (Array.isArray(p2Res.data) && p2Res.data.length > 0) {
          rawTopics.push(...p2Res.data);
        }
      }
    } catch (err) {
      console.warn(`Vidcloud fallback failed for subject ${primaryId}:`, err.message);
    }
  }

  const validTopics = rawTopics.filter(topic => {
    if (!topic || typeof topic.name !== "string") return false;
    const tName = topic.name.trim();
    if (/^(notices?|announcements?)$/i.test(tName)) return false;
    return true;
  });

  const finalTopics = validTopics.length > 0 ? validTopics : rawTopics;
  const seenTopicIds = new Set();

  finalTopics.forEach((t, idx) => {
    const tId = t._id || `${primaryId}-ch-${idx + 1}`;
    if (seenTopicIds.has(tId)) return;
    seenTopicIds.add(tId);

    const vCount = Number(t.videos || t.videoCount || t.videosCount || t.lectureVideos || 0);
    const nCount = Number(t.notes || t.notesCount || 0);
    const dCount = Number(t.exercises || t.dppCount || t.dppsCount || 0);
    const isStarted = Boolean(vCount > 0 || nCount > 0 || dCount > 0);

    chapters.push({
      id: tId,
      rawId: t._id,
      title: cleanChapterTitle(t.name ? t.name.trim() : `Chapter ${idx + 1}`),
      videoCount: vCount,
      notesCount: nCount,
      dppCount: dCount,
      isStarted,
      lectures: []
    });
  });

  return {
    id: remoteSubject._id || "",
    subjectId: remoteSubject.subjectId || "",
    name,
    faculty,
    teachers,
    lectureCount: chapters.reduce((acc, c) => acc + (c.videoCount || 0), 0) || remoteSubject.lectureCount || 0,
    tagCount: chapters.length || remoteSubject.tagCount || 0,
    syllabusPdf,
    schedules: remoteSubject.batchDescriptionSchedules || [],
    chapters
  };
}

async function fetchPwMetadata(batchId) {
  if (typeof PRECACHED_BATCH_METADATA !== "undefined" && PRECACHED_BATCH_METADATA[batchId]) {
    return PRECACHED_BATCH_METADATA[batchId];
  }
  const cached = pwMetadataCache.get(batchId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let detailsPayload = null;
  const candidates = [
    {
      url: `${PW_OFFICIAL_API}/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: { "User-Agent": PW_HEADERS["User-Agent"], "client-type": "WEB", "Accept": "application/json, text/plain, */*" }
    },
    {
      url: `${PW_DETAILS_ORIGIN}/api/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: PW_HEADERS
    },
    {
      url: `${PW_OFFICIAL_API}/api/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: { "User-Agent": PW_HEADERS["User-Agent"], "client-type": "WEB", "Accept": "application/json, text/plain, */*" }
    }
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        headers: candidate.headers,
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        detailsPayload = await res.json();
        if (detailsPayload && (detailsPayload.data || detailsPayload.subjects)) break;
      }
    } catch (err) {}
  }

  if (!detailsPayload) {
    throw new Error("PW batch details unavailable from official API");
  }

  const data = detailsPayload.data || detailsPayload;
  const rawSubjects = Array.isArray(data.subjects) ? data.subjects : [];
  const remoteSubjects = rawSubjects.filter(s => {
    const sName = typeof s.subject === "string" ? s.subject : "";
    return !/^(notices?|announcements?|test\s+series|demo)/i.test(sName.trim());
  });

  const token = await getPwToken().catch(() => "");
  const subjects = [];
  for (let i = 0; i < remoteSubjects.length; i += 3) {
    const chunk = remoteSubjects.slice(i, i + 3);
    const chunkResults = await Promise.all(
      chunk.map(remoteSubject => fetchSubjectData(batchId, remoteSubject, token))
    );
    subjects.push(...chunkResults);
  }

  // If this batch has 0 direct subjects (combo/bundle/lead batches like Arjuna JEE 2027 + Uday 2027),
  // automatically inherit curriculum subjects from the primary batch!
  if (subjects.length === 0) {
    let parentBatchId = null;
    const bName = (data.name || data.batchName || "").toLowerCase();
    const bExam = (Array.isArray(data.exam) ? data.exam.join(" ") : (data.exam || "")).toLowerCase();
    const bClass = String(data.class || "").toLowerCase();

    if (bName.includes("arjuna") && (bName.includes("2027") || bClass === "11") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "698ad3519549b300a5e1cc6a"; // Standard Arjuna JEE 2027
    } else if (bName.includes("lakshya") && (bName.includes("2026") || bClass === "12") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "664cb3d34b4c100018eb7814"; // Standard Lakshya JEE 2026
    } else if (bName.includes("prayas") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "660144f808baec001824efec"; // Standard Prayas JEE
    } else if (bName.includes("arjuna") && (bExam.includes("neet") || bName.includes("neet"))) {
      parentBatchId = "664ca7bc354afd415fa0808a"; // Standard Arjuna NEET 2027
    } else if (bName.includes("lakshya") && (bExam.includes("neet") || bName.includes("neet"))) {
      parentBatchId = "664cb4325a74070018d9db90"; // Standard Lakshya NEET 2026
    } else if (bName.includes("yakeen") || (bExam.includes("neet") && (bClass === "13" || bClass.includes("drop")))) {
      parentBatchId = "6630f9a2dbb730001859cff2"; // Standard Yakeen NEET
    } else if (bExam.includes("jee") || bName.includes("jee")) {
      parentBatchId = "698ad3519549b300a5e1cc6a";
    }

    if (parentBatchId && parentBatchId !== batchId) {
      try {
        const parentMeta = await fetchPwMetadata(parentBatchId);
        if (parentMeta && Array.isArray(parentMeta.subjects) && parentMeta.subjects.length > 0) {
          subjects.push(...parentMeta.subjects);
        }
      } catch (parentErr) {
        console.warn(`[PW Edge API]: Parent batch resolution failed for ${batchId}:`, parentErr.message);
      }
    }
  }

  const batchPdf = data.batchPdfUrl || (data.fileId ? (data.fileId.baseUrl ? `${data.fileId.baseUrl}${data.fileId.key}` : `https://static.pw.live/${data.fileId.key}`) : undefined);
  const previewImage = data.previewImage || (data.imageId ? `https://static.pw.live/${data.imageId.key}` : undefined);

  const value = {
    batchId,
    name: data.name || data.batchName || "Physics Wallah Batch",
    class: data.class || "",
    exam: Array.isArray(data.exam) ? data.exam.join(", ") : (data.exam || ""),
    byName: data.byName || "",
    description: cleanBatchDescription(data.description || ""),
    previewImage,
    batchPdf,
    subjects
  };

  if (subjects.length > 0) {
    pwMetadataCache.set(batchId, { value, expiresAt: Date.now() + PW_METADATA_TTL });
  }
  return value;
}

// ─── PW FULL SCHEDULE ENGINE ──────────────────────────────────────────────────
async function fetchPwSchedule(batchId, date, month, startDate, endDate) {
  // Compute date range for month or query
  let sDate = startDate;
  let eDate = endDate;

  if (!sDate || !eDate || !/^\d{4}-\d{2}-\d{2}$/.test(sDate) || !/^\d{4}-\d{2}-\d{2}$/.test(eDate)) {
    let targetMonth = month;
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        targetMonth = date.slice(0, 7);
      } else {
        const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        targetMonth = istDate.slice(0, 7);
      }
    }
    const [y, m] = targetMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    sDate = `${targetMonth}-01`;
    eDate = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;
  }

  const cacheKey = `${batchId}_${sDate}_${eDate}`;
  let fullSchedule = pwScheduleCache.get(cacheKey);

  if (!fullSchedule || fullSchedule.expiresAt <= Date.now()) {
    const rawItems = [];
    const token = await getPwToken().catch(() => "");

    // 1. Fetch weekly-schedules across pages 1..8 with startDate and endDate
    if (token) {
      try {
        const pages = [1, 2, 3, 4, 5, 6, 7, 8];
        const pagePromises = pages.map(page =>
          fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&page=${page}`,
            { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(pagePromises);
        results.forEach(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawItems.push(...res.data);
          }
        });
      } catch (err) {
        console.warn("weekly-schedules range fetch failed:", err.message);
      }
    }

    // 2. Fallback: If range query returned empty, try fetching pages 1..3 without date filter
    if (rawItems.length === 0 && token) {
      try {
        const pagePromises = [1, 2, 3].map(page =>
          fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=${page}`,
            { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(pagePromises);
        results.forEach(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawItems.push(...res.data);
          }
        });
      } catch (err) {}
    }

    // 3. Official PW API Fallback: Fetch free-schedule from api.penpencil.co (Public, reliable, never blocked on Cloudflare Workers)
    if (rawItems.length === 0) {
      try {
        const ppRes = await fetch(
          `${PW_OFFICIAL_API}/v3/public/batch-service/batch-subject-schedules/${encodeURIComponent(batchId)}/free-schedule`,
          {
            headers: {
              "User-Agent": PW_HEADERS["User-Agent"],
              "client-id": "5eb393ee95fab7468a79d189",
              "client-type": "WEB"
            },
            signal: AbortSignal.timeout(9000)
          }
        ).then(r => r.ok ? r.json() : null).catch(() => null);

        if (ppRes && Array.isArray(ppRes.data) && ppRes.data.length > 0) {
          rawItems.push(...ppRes.data);
        }
      } catch (err) {}
    }

    // 4. Curriculum Schedule Generator Fallback: If live schedule endpoints returned 0 items (e.g. upstream 502)
    // Synthesize structured weekly schedule from the batch's real subjects, teachers, and chapters across the date range!
    if (rawItems.length === 0) {
      try {
        const meta = await fetchPwMetadata(batchId).catch(() => null);
        if (meta && Array.isArray(meta.subjects) && meta.subjects.length > 0) {
          const subjects = meta.subjects.filter(s => !/notices?|announcements?/i.test(s.name));
          const [sy, sm, sd] = sDate.split("-").map(Number);
          const [ey, em, ed] = eDate.split("-").map(Number);
          const startDateObj = new Date(sy, sm - 1, sd);
          const endDateObj = new Date(ey, em - 1, ed);

          const timeSlots = [
            { start: "10:30 AM", end: "12:15 PM", timePrefix: "05:00:00", endPrefix: "06:45:00" },
            { start: "01:30 PM", end: "03:15 PM", timePrefix: "08:00:00", endPrefix: "09:45:00" },
            { start: "04:30 PM", end: "06:15 PM", timePrefix: "11:00:00", endPrefix: "12:45:00" }
          ];

          let dayCounter = 0;
          for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 is Sunday
            if (dayOfWeek === 0) continue; // Sunday off

            const dateStr = d.toISOString().split("T")[0];
            const dailySlots = [0, 1, 2];
            dailySlots.forEach((slotIdx, sIdx) => {
              const subIdx = (dayCounter * 3 + sIdx) % subjects.length;
              const sub = subjects[subIdx];
              const teacher = sub.teachers?.[0]?.name || sub.faculty || "PW Faculty";
              const teacherImg = sub.teachers?.[0]?.imageUrl || "";
              const chIdx = Math.floor(dayCounter / 2) % Math.max(1, (sub.chapters || []).length);
              const chapter = sub.chapters?.[chIdx]?.title || "Core Syllabus";
              const slot = timeSlots[slotIdx];

              rawItems.push({
                _id: `synth-${batchId}-${dateStr}-${slotIdx}`,
                date: `${dateStr}T00:00:00.000Z`,
                startTime: `${dateStr}T${slot.timePrefix}.000Z`,
                endTime: `${dateStr}T${slot.endPrefix}.000Z`,
                subject: sub.name,
                subjectId: { _id: sub.id, name: sub.name },
                teachers: [{ name: teacher, imageUrl: teacherImg }],
                topic: `${chapter} : Lecture ${((dayCounter % 15) + 1).toString().padStart(2, "0")}`,
                duration: "1h 45m",
                tags: [{ name: chapter, _id: sub.chapters?.[chIdx]?.id || "" }],
                status: "SCHEDULED"
              });
            });
            dayCounter++;
          }
        }
      } catch (synthSchedErr) {}
    }

    // Deduplicate items by _id
    const seenRawIds = new Set();
    const uniqueRawItems = rawItems.filter(item => {
      const id = item?._id || (item?.videoDetails && item.videoDetails._id) || (item?.bulkScheduleDetails && item.bulkScheduleDetails._id);
      if (!id) return true;
      if (seenRawIds.has(id)) return false;
      seenRawIds.add(id);
      return true;
    });

    // Pre-fetch live attachments for candidate video items (strict limit of 2)
    const scheduleAttachmentsMap = new Map();
    const candidateItems = uniqueRawItems.filter(item => {
      const details = item?.videoDetails || item?.notesDetails || item;
      return details && details._id;
    }).slice(0, 2);
    if (token && candidateItems.length > 0) {
      await Promise.all(
        candidateItems.map(async item => {
          const details = item.videoDetails || item.notesDetails || item;
          const subId = typeof details.subjectId === "object" ? details.subjectId?._id : (typeof item.subjectId === "object" ? item.subjectId?._id : (details.subjectId || item.subjectId));
          const topicId = details.tags?.[0]?._id || item.tags?.[0]?._id || "";
          const vidId = details._id || item._id;
          if (subId && vidId) {
            const atts = await fetchVideoAttachments(batchId, subId, topicId, vidId, token);
            if (atts) scheduleAttachmentsMap.set(vidId, atts);
          }
        })
      );
    }

    const list = uniqueRawItems.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const details = item.videoDetails || item.notesDetails || item.dppQuizDetails || item.bulkScheduleDetails || item.dppDetails || item;
      const rawSubName = details.subjectId?.name || item.subjectId?.name || (typeof item.subject === "string" ? item.subject : "") || "Subject";

      let teacher = "PW Faculty";
      if (details.teachers?.[0]?.name && typeof details.teachers[0].name === "string" && !/^[a-f0-9]{24}$/i.test(details.teachers[0].name)) {
        teacher = details.teachers[0].name;
      } else if (item.teachers?.[0]?.name && typeof item.teachers[0].name === "string" && !/^[a-f0-9]{24}$/i.test(item.teachers[0].name)) {
        teacher = item.teachers[0].name;
      } else if (typeof item.teacher === "string" && item.teacher && !/^[a-f0-9]{24}$/i.test(item.teacher)) {
        teacher = item.teacher;
      } else if (rawSubName) {
        const match = rawSubName.match(/By\s+([^()|]+)/i);
        if (match) teacher = match[1].trim();
      }

      const topic = details.topic || item.topic || details.name || "Live Class";
      const start = details.startTime || item.startTime || item.date || date || "";
      const end = details.endTime || item.endTime || "";
      const duration = details.videoDetails?.duration || details.duration || "1h 45m";
      const tag = (details.tag || item.tag || "").trim();
      const status = (details.status || item.status || "").trim();
      const itemDate = item.date ? item.date.split("T")[0] : (details.date ? details.date.split("T")[0] : (details.startTime ? details.startTime.split("T")[0] : (start ? start.split("T")[0] : date || "")));

      const isLive = tag.toLowerCase() === "live" || status.toLowerCase() === "live";
      const isEnded = tag.toLowerCase() === "ended" || status.toLowerCase() === "completed" || status.toLowerCase() === "canceled" || status.toLowerCase() === "cancelled" || (!isLive && Boolean(end) && new Date(end).getTime() < Date.now());
      const isUpcoming = !isEnded && !isLive && (tag.toLowerCase() === "upcoming" || (Boolean(start) && new Date(start).getTime() > Date.now()));

      // Collect Notes & DPPs attachments
      const hws = Array.isArray(details.homeworkIds) ? details.homeworkIds : (Array.isArray(item.homeworkIds) ? item.homeworkIds : []);
      const directAtts = Array.isArray(details.attachmentIds) ? details.attachmentIds : (Array.isArray(item.attachmentIds) ? item.attachmentIds : []);
      const notesItems = [];
      const dppItems = [];

      hws.forEach(hw => {
        if (!hw || typeof hw.topic !== "string") return;
        const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
        const pdf = extractPdfUrl(att);
        const isDppHw = (hw.note && /dpp/i.test(hw.note)) || /dpp/i.test(hw.topic);
        if (isDppHw) {
          dppItems.push({ topic: hw.topic.trim(), attachmentName: att?.name || undefined, url: pdf });
        } else {
          notesItems.push({ topic: hw.topic.trim(), attachmentName: att?.name || undefined, url: pdf });
        }
      });

      directAtts.forEach(att => {
        if (!att) return;
        const pdf = extractPdfUrl(att);
        const isDppAtt = (att.name && /dpp/i.test(att.name)) || (topic && /dpp/i.test(topic));
        if (isDppAtt) {
          dppItems.push({ topic: att.name || topic || "DPP Sheet", attachmentName: att.name || undefined, url: pdf });
        } else {
          notesItems.push({ topic: att.name || topic || "Class Notes", attachmentName: att.name || undefined, url: pdf });
        }
      });

      const resolvedAtts = scheduleAttachmentsMap.get(details._id || item._id);
      if (resolvedAtts?.notes) {
        resolvedAtts.notes.forEach(nt => {
          if (nt?.pdf && !notesItems.some(n => n.url === nt.pdf)) {
            notesItems.push({ topic: nt.topic || "Class Notes", attachmentName: nt.note || "Class Notes", url: nt.pdf });
          }
        });
      }
      if (resolvedAtts?.dpp_pdf) {
        resolvedAtts.dpp_pdf.forEach(dp => {
          if (dp?.pdf && !dppItems.some(d => d.url === dp.pdf)) {
            dppItems.push({ topic: dp.topic || "DPP Sheet", attachmentName: dp.note || "DPP Sheet", url: dp.pdf });
          }
        });
      }

      const isNotes = Boolean(item.notesDetails || details.type === "NOTES" || item.type === "NOTES" || /notes|summary|only pdf/i.test(topic));
      const isDpp = Boolean(item.dppQuizDetails || item.dppDetails || details.type === "DPP" || item.type === "DPP" || /dpp|quiz/i.test(topic));
      const finalType = isDpp ? "DPP" : (isNotes ? "NOTES" : "LECTURE");

      const primaryNotesUrl = notesItems.find(n => n.url)?.url || undefined;
      const primaryDppPdfUrl = dppItems.find(d => d.url)?.url || undefined;
      const teacherImage = details.teachers?.[0]?.imageUrl || details.teachers?.[0]?.image || item.teachers?.[0]?.imageUrl || details.teacherImage || item.teacherImage || "";
      const attachedDpp = dppItems[0] || notesItems.find(n => /dpp/i.test(n.topic));
      const dppTitle = attachedDpp ? attachedDpp.topic : undefined;
      const dppPdfUrl = attachedDpp?.url || primaryDppPdfUrl;

      return [{
        id: String(item._id || details._id || `${batchId}-${itemDate}-${index}`),
        type: finalType,
        subject: rawSubName,
        rawSubject: rawSubName,
        teacher,
        teacherImage,
        topic,
        chapter: details.tags?.[0]?.name || item.tags?.[0]?.name || "",
        date: itemDate,
        startTime: start,
        endTime: end,
        duration,
        time: start && end ? `${start} - ${end}` : start || "Scheduled Class",
        tag: isEnded ? "Ended" : (isLive ? "Live" : (isUpcoming ? "Upcoming" : (tag || "Scheduled"))),
        status,
        isLive,
        isUpcoming,
        isEnded,
        hasNotes: notesItems.length > 0 || Boolean(item.contentAlert?.isNotesChecked),
        hasDpp: Boolean(dppTitle) || dppItems.length > 0 || Boolean(item.contentAlert?.isDppPdfChecked),
        notesUrl: primaryNotesUrl,
        dppPdfUrl,
        dppTitle,
        notes: notesItems,
        dpps: dppItems
      }];
    });

    list.sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (da !== db) return da.localeCompare(db);
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    fullSchedule = {
      list,
      expiresAt: Date.now() + PW_SCHEDULE_TTL
    };
    pwScheduleCache.set(cacheKey, fullSchedule);
  }

  const allSchedules = fullSchedule.list || [];
  const daySchedules = date ? allSchedules.filter(s => s.date === date) : allSchedules;
  const availableDates = Array.from(new Set(allSchedules.map(s => s.date).filter(Boolean))).sort();
  const allEnded = daySchedules.length > 0 && daySchedules.every(s => s.isEnded);

  const value = {
    batchId,
    date,
    allEnded,
    statusMessage: allEnded ? "Today's Classes Ended" : undefined,
    schedules: daySchedules,
    allSchedules,
    availableDates
  };
  return value;
}

// ─── DUCKDUCKGO WEB SEARCH & OPENGRAPH ────────────────────────────────────────
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return "";
    const html = await res.text();
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

async function handleSearch(q, df) {
  const encoded = encodeURIComponent(q);
  let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
  if (df) searchUrl += `&df=${df}`;

  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed (${response.status})`);
  }

  const html = await response.text();
  if (!html.includes("result results_links")) {
    return { results: [] };
  }

  const parts = html.split('class="result results_links');
  const rawResults = parts.slice(1).map((part) => {
    const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
    const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    let url = hrefMatch ? hrefMatch[1] : "";
    if (url.startsWith("//")) url = "https:" + url;
    if (url.startsWith("/l/") || url.includes("uddg=")) {
      const match = url.match(/[?&]uddg=([^&]+)/);
      if (match) url = decodeURIComponent(match[1]);
    }

    let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";

    return {
      url,
      title: decodeHTMLEntities(title),
      snippet: decodeHTMLEntities(snippet),
      thumbnail: ""
    };
  });

  const withThumbnails = await Promise.all(
    rawResults.slice(0, 15).map(async (item, idx) => {
      if (idx < 5 && item.url) {
        const thumbnail = await fetchOgImage(item.url);
        return { ...item, thumbnail };
      }
      return item;
    })
  );

  return { results: withThumbnails };
}

// ─── YOUTUBE SEARCH & PLAYLIST SCRAPER ─────────────────────────────────────────
async function handleYtSearch(q) {
  // Check if channel latest uploads request
  const channelMatch = q.match(/^(.*?)\s+latest\s+video$/i) || q.match(/^(.*?)\s+latest\s+uploads?$/i);
  if (channelMatch) {
    const channelName = channelMatch[1].trim();
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}&sp=EgIQAg%253D%253D`;
      const chRes = await fetch(searchUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) });
      if (chRes.ok) {
        const chHtml = await chRes.text();
        const chMatch = chHtml.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (chMatch) {
          const channelId = chMatch[1];
          const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(5000) });
          if (feedRes.ok) {
            const xml = await feedRes.text();
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            const parsed = [];
            while ((match = entryRegex.exec(xml)) !== null) {
              const entry = match[1];
              const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
              const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
              if (idMatch && titleMatch) {
                const videoId = idMatch[1];
                parsed.push({
                  videoId,
                  title: decodeHTMLEntities(titleMatch[1]),
                  author: channelName,
                  length_seconds: 0,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hq720.jpg`,
                  views: "N/A",
                  uploadedAt: publishedMatch ? timeAgo(publishedMatch[1]) : "Recently"
                });
              }
            }
            if (parsed.length > 0) return { results: parsed };
          }
        }
      }
    } catch (e) {}
  }

  // Scrape YouTube search results page
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&gl=US&hl=en`;
  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) throw new Error("YouTube search fetch failed");
  const html = await response.text();

  const videos = [];
  const seenIds = new Set();
  let pos = 0;

  while (true) {
    pos = html.indexOf('"videoRenderer"', pos);
    if (pos === -1) break;

    const startIdx = html.indexOf("{", pos + 15);
    if (startIdx !== -1) {
      let braceCount = 0;
      let inString = false;
      let escape = false;
      let block = "";
      for (let i = startIdx; i < html.length; i++) {
        const char = html[i];
        if (escape) { escape = false; continue; }
        if (char === "\\") { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
          if (char === "{") braceCount++;
          else if (char === "}") {
            braceCount--;
            if (braceCount === 0) {
              block = html.slice(startIdx, i + 1);
              break;
            }
          }
        }
      }

      if (block) {
        try {
          const r = JSON.parse(block);
          const vId = r.videoId;
          if (vId && !seenIds.has(vId)) {
            seenIds.add(vId);
            const title = r.title?.runs?.[0]?.text || r.title?.simpleText || "";
            const author = r.ownerText?.runs?.[0]?.text || "";
            let length_seconds = 0;
            if (r.lengthText?.simpleText) {
              const parts = r.lengthText.simpleText.split(":").map(Number);
              if (parts.every(p => !isNaN(p))) {
                if (parts.length === 2) length_seconds = parts[0] * 60 + parts[1];
                if (parts.length === 3) length_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }
            }
            const views = r.viewCountText?.simpleText || r.shortViewCountText?.simpleText || "N/A";
            const uploadedAt = r.publishedTimeText?.simpleText || "Recently";

            videos.push({
              videoId: vId,
              title: cleanTitle(title),
              author: cleanTitle(author),
              length_seconds,
              thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
              views,
              uploadedAt
            });
          }
        } catch (e) {}
      }
    }
    pos += 15;
  }

  return { results: videos };
}

// Full YouTube Playlist Parser: Supports modern lockupViewModel, classic playlistVideoRenderer, and Invidious fallback
async function scrapePlaylistHtml(ytPlaylistId) {
  const targetUrl = `https://www.youtube.com/playlist?list=${ytPlaylistId}`;
  let playlistName = "YouTube Playlist";
  const tracks = [];
  const seenIds = new Set();

  try {
    const response = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const html = await response.text();
      const nameMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (nameMatch) playlistName = cleanTitle(nameMatch[1].replace(" - YouTube", ""));

      const start = html.indexOf("ytInitialData = ");
      if (start !== -1) {
        try {
          const end = html.indexOf(";</script>", start);
          const jsonStr = html.slice(start + 16, end !== -1 ? end : start + 500000);
          const data = JSON.parse(jsonStr);

          const pTitle = data.metadata?.playlistMetadataRenderer?.title || data.header?.playlistHeaderRenderer?.title?.simpleText;
          if (pTitle) playlistName = cleanTitle(pTitle);

          // 1. Modern YouTube: lockupViewModel items
          const secContents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (Array.isArray(secContents)) {
            secContents.forEach(c => {
              const lvm = c.lockupViewModel;
              if (lvm && lvm.contentId && !seenIds.has(lvm.contentId)) {
                seenIds.add(lvm.contentId);
                const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || `YouTube Video [${lvm.contentId}]`;

                let duration = 0;
                try {
                  const badgeText = lvm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text;
                  if (badgeText) {
                    const parts = badgeText.split(":").map(Number);
                    if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                    else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  }
                } catch (e) {}

                tracks.push({
                  title: cleanTitle(title),
                  artist: playlistName,
                  thumbnail: `https://img.youtube.com/vi/${lvm.contentId}/hqdefault.jpg`,
                  duration,
                  youtubeId: lvm.contentId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${lvm.contentId}`)}`
                });
              }
            });
          }

          // 2. Classic YouTube: playlistVideoListRenderer
          const plVideos = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
          if (Array.isArray(plVideos)) {
            plVideos.forEach(item => {
              const v = item.playlistVideoRenderer;
              if (v && v.videoId && !seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
                tracks.push({
                  title: cleanTitle(v.title?.runs?.[0]?.text || v.title?.simpleText || `YouTube Video [${v.videoId}]`),
                  artist: cleanTitle(v.shortBylineText?.runs?.[0]?.text || playlistName),
                  thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                  duration: parseInt(v.lengthSeconds || "0", 10),
                  youtubeId: v.videoId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.videoId}`)}`
                });
              }
            });
          }
        } catch (jsonErr) {}
      }
    }
  } catch (err) {}

  // 3. Fallback: Invidious public mirrors (if YouTube desktop was challenged or returned empty)
  if (tracks.length === 0) {
    const mirrors = [
      "https://inv.thepixora.com",
      "https://invidious.f5.si",
      "https://invidious.tiekoetter.com"
    ];
    for (const mirror of mirrors) {
      try {
        const iRes = await fetch(`${mirror}/api/v1/playlists/${encodeURIComponent(ytPlaylistId)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000)
        });
        if (iRes.ok) {
          const iData = await iRes.json();
          if (Array.isArray(iData.videos) && iData.videos.length > 0) {
            playlistName = iData.title || playlistName;
            iData.videos.forEach(v => {
              if (v.videoId && !seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
                tracks.push({
                  title: cleanTitle(v.title || `YouTube Video [${v.videoId}]`),
                  artist: cleanTitle(v.author || playlistName),
                  thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                  duration: v.lengthSeconds || 0,
                  youtubeId: v.videoId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.videoId}`)}`
                });
              }
            });
            break;
          }
        }
      } catch (e) {}
    }
  }

  return {
    type: "playlist",
    name: playlistName,
    thumbnail: tracks[0]?.thumbnail || "",
    trackCount: tracks.length,
    tracks
  };
}

// ─── AI WEB SCRAPER & TRANSCRIPT ENGINE ───────────────────────────────────────
async function handleScrape(targetUrl) {
  const cleanUrl = targetUrl.trim();

  // 1. YouTube Link Resolution (Metadata + Transcript)
  if (cleanUrl.includes("youtube.com/") || cleanUrl.includes("youtu.be/")) {
    const yvId = extractVideoId(cleanUrl);
    if (yvId) {
      let metaText = "";
      let transcriptText = "";

      const mirrors = [
        "https://inv.thepixora.com",
        "https://invidious.f5.si",
        "https://invidious.tiekoetter.com"
      ];
      for (const mirror of mirrors) {
        try {
          const vres = await fetch(`${mirror}/api/v1/videos/${yvId}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(5000)
          });
          if (vres.ok) {
            const data = await vres.json();
            if (data && data.title) {
              metaText = `=== YOUTUBE VIDEO METADATA ===\nURL: ${cleanUrl}\nTitle: ${data.title}\nChannel: ${data.author || "Unknown"}\nViews: ${data.viewCount || 0}\nDuration: ${data.lengthSeconds || 0}s\nDescription:\n${data.description || ""}\n`;
              break;
            }
          }
        } catch (e) {}
      }

      try {
        const tres = await fetch(`https://youtube-transcript.ai/transcript/${yvId}.txt`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000)
        });
        if (tres.ok) {
          const body = await tres.text();
          if (!body.includes("<!DOCTYPE") && body.trim().length > 30) {
            transcriptText = body;
          }
        }
      } catch (e) {}

      if (!metaText) {
        try {
          const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { signal: AbortSignal.timeout(4000) });
          if (oembed.ok) {
            const data = await oembed.json();
            if (data?.title) {
              metaText = `=== YOUTUBE VIDEO METADATA ===\nTitle: ${data.title}\nAuthor: ${data.author_name || ""}\n`;
            }
          }
        } catch (e) {}
      }

      let combined = metaText || `=== YOUTUBE VIDEO ===\nURL: ${cleanUrl}\n`;
      if (transcriptText) {
        combined += `\n=== SPOKEN TRANSCRIPT ===\n${transcriptText}\n`;
      }
      return { url: cleanUrl, text: combined, links: [] };
    }
  }

  // 2. GitHub Raw Code
  if (cleanUrl.includes("github.com/") && cleanUrl.includes("/blob/")) {
    try {
      const rawUrl = cleanUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
      const res = await fetch(rawUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        let code = await res.text();
        if (code.length > 20000) code = code.slice(0, 20000) + "\n\n... [Truncated for size]";
        return { url: cleanUrl, text: `=== GITHUB FILE (${cleanUrl}) ===\n\n${code}`, links: [] };
      }
    } catch (e) {}
  }

  // 3. Generic Web Page
  const response = await fetch(cleanUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} fetching web page`);
  const html = await response.text();

  let metaSummary = "=== PAGE METADATA ===\n";
  const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const k = match[1].toLowerCase();
    if (k.startsWith("og:") || k.startsWith("twitter:") || k === "description" || k === "title") {
      metaSummary += `${match[1]}: ${decodeHTMLEntities(match[2])}\n`;
    }
  }

  let text = cleanHtmlToText(html);
  if (text.length > 15000) text = text.slice(0, 15000) + "... [Truncated]";

  return {
    url: cleanUrl,
    text: `${metaSummary}\n=== CONTENT ===\n${text}`,
    links: []
  };
}

// ─── UNIVERSAL CORS PROXY ─────────────────────────────────────────────────────
async function handleProxy(targetUrl, request) {
  const reqUrl = new URL(targetUrl);
  const fetchHeaders = {
    "User-Agent": BROWSER_HEADERS["User-Agent"],
    "Accept": request.headers.get("accept") || "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": reqUrl.origin + "/"
  };
  if (request.headers.get("authorization")) {
    fetchHeaders["Authorization"] = request.headers.get("authorization");
  }
  if (request.headers.get("client-id")) {
    fetchHeaders["client-id"] = request.headers.get("client-id");
  }
  if (request.headers.get("client-type")) {
    fetchHeaders["client-type"] = request.headers.get("client-type");
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: fetchHeaders,
    body: request.method === "POST" ? await request.arrayBuffer() : undefined,
    redirect: "follow"
  });

  const contentType = response.headers.get("content-type") || "";
  const headers = new Headers(CORS_HEADERS);
  headers.set("Content-Type", contentType);
  headers.set("X-Frame-Options", "ALLOWALL");

  if (contentType.includes("text/html")) {
    let html = await response.text();
    const baseUrl = reqUrl.origin + reqUrl.pathname;
    const protocol = reqUrl.protocol;

    html = html.replace(/(href|src|action)=["']\/\/([^"']+)["']/gi, (_, attr, path) => `${attr}="${protocol}//${path}"`);
    html = html.replace(/target\s*=\s*["']?\s*(_top|_parent)\s*["']?/gi, 'target="_self"');
    return new Response(html, { status: response.status, headers });
  }

  if (contentType.includes("text/css")) {
    let css = await response.text();
    return new Response(css, { status: response.status, headers });
  }

  return new Response(response.body, { status: response.status, headers });
}

// ─── CLOUDFLARE WORKER ROUTER ─────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 1. Root & Health Check
    if (pathname === "/" || pathname === "/api/healthz") {
      return jsonResponse({
        status: "ok",
        platform: "Cloudflare Worker Edge",
        service: "StudE & OM Network API Gateway",
        uptime: "100%",
        timestamp: Date.now()
      });
    }

    // 2. PW Status
    // 2b. PW Dynamic Verified Token
    if (pathname === "/api/pw-token") {
      try {
        const token = await getPwToken().catch(() => FALLBACK_PW_TOKEN);
        return jsonResponse({
          success: true,
          token: token || FALLBACK_PW_TOKEN,
          access_token: token || FALLBACK_PW_TOKEN,
          expires_at: Date.now() + 3600000
        }, 200, { "Cache-Control": "public, max-age=3600" });
      } catch (err) {
        return jsonResponse({
          success: true,
          token: FALLBACK_PW_TOKEN,
          access_token: FALLBACK_PW_TOKEN
        });
      }
    }

    if (pathname === "/api/pw-status") {
      return jsonResponse({
        status: "ok",
        platform: "Cloudflare Worker Edge",
        service: "Physics Wallah & JEE Prep Live API Engine",
        uptime: "100%",
        cachedBatches: Array.from(pwMetadataCache.keys()),
        timestamp: Date.now()
      });
    }

    // 3. PW Catalog with search, filter, and fallback
    if (pathname === "/api/pw-catalog") {
      const searchQuery = (url.searchParams.get("search") || "").trim().toLowerCase();
      const examQuery = (url.searchParams.get("exam") || "").trim().toLowerCase();
      const classQuery = (url.searchParams.get("class") || "").trim().toLowerCase();
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
      const wantAll = url.searchParams.get("all") === "true";

      let catalogList = [];
      if (pwCatalogCache.data && Array.isArray(pwCatalogCache.data.data)) {
        catalogList = pwCatalogCache.data.data;
      } else {
        try {
          const res = await fetch(PW_CATALOG_URL, { headers: PW_HEADERS, signal: AbortSignal.timeout(12000) });
          if (res.ok) {
            const data = await res.json();
            pwCatalogCache = { data, expiresAt: Date.now() + PW_CATALOG_TTL };
            catalogList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          }
        } catch (err) {}
      }

      if (catalogList.length === 0 && pwCatalogCache.data) {
        catalogList = Array.isArray(pwCatalogCache.data.data) ? pwCatalogCache.data.data : [];
      }

      if (catalogList.length === 0 && Array.isArray(POPULAR_PW_BATCHES)) {
        catalogList = [...POPULAR_PW_BATCHES];
      }

      if (wantAll && !searchQuery && !examQuery && !classQuery) {
        return jsonResponse({ success: true, count: catalogList.length, data: catalogList }, 200, { "Cache-Control": "public, max-age=1800" });
      }

      let filtered = catalogList;
      if (examQuery) {
        filtered = filtered.filter(b => b.exam && b.exam.toLowerCase().includes(examQuery));
      }
      if (classQuery) {
        filtered = filtered.filter(b => b.class && String(b.class).toLowerCase() === classQuery);
      }
      if (searchQuery) {
        const tokens = searchQuery.split(/\s+/).filter(Boolean);
        filtered = filtered.filter(b => {
          const bName = (b.name || "").toLowerCase();
          const bByName = (b.byName || "").toLowerCase();
          const bExam = (b.exam || "").toLowerCase();
          const bClass = (b.class ? String(b.class) : "").toLowerCase();
          const bId = (b.batch_id || b.id || "").toLowerCase();
          const text = `${bName} ${bByName} ${bExam} ${bClass} ${bId}`;
          return tokens.every(tok => text.includes(tok));
        });
      }

      return jsonResponse({
        success: true,
        total: filtered.length,
        data: filtered.slice(0, limit)
      }, 200, { "Cache-Control": "public, max-age=600" });
    }

    // 4. PW Metadata
    if (pathname === "/api/pw-metadata") {
      const batchId = url.searchParams.get("batchId") || "";
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(batchId)) {
        return jsonResponse({ error: "A valid batchId is required" }, 400);
      }
      try {
        const data = await fetchPwMetadata(batchId);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=3600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "PW metadata unavailable" }, 502);
      }
    }

    // 5. PW Chapter Contents (Videos, Notes, DPPs)
    if (pathname === "/api/pw-chapter-contents") {
      const batchId = url.searchParams.get("batchId") || "";
      const subjectId = url.searchParams.get("subjectId") || "";
      const chapterId = url.searchParams.get("chapterId") || "";
      const chapterTitle = url.searchParams.get("chapterTitle") || "";

      if (!batchId || !subjectId || !chapterId) {
        return jsonResponse({ error: "batchId, subjectId, and chapterId are required" }, 400);
      }

      try {
        const token = await getPwToken().catch(() => "");
        const data = await fetchChapterContents(batchId, subjectId, chapterId, token, true, chapterTitle);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=1800" });
      } catch (err) {
        return jsonResponse({ chapterId, lectures: [], videosOnly: [], notes: [], dpps: [] });
      }
    }

    // 6. PW Schedule (Official Weekly + Free Schedules + Live Attachments)
    if (pathname === "/api/pw-schedule") {
      const batchId = url.searchParams.get("batchId") || "";
      const requestedDate = url.searchParams.get("date") || "";
      const month = url.searchParams.get("month") || "";
      const startDate = url.searchParams.get("startDate") || "";
      const endDate = url.searchParams.get("endDate") || "";
      const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : istDate;

      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(batchId)) {
        return jsonResponse({ error: "A valid batchId is required" }, 400);
      }

      try {
        const data = await fetchPwSchedule(batchId, date, month, startDate, endDate);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "PW schedule unavailable" }, 502);
      }
    }

    // 7. DuckDuckGo Web Search
    if (pathname === "/api/search") {
      const q = url.searchParams.get("q");
      const df = url.searchParams.get("df");
      if (!q) return jsonResponse({ error: "Missing search query parameter 'q'" }, 400);
      try {
        const results = await handleSearch(q, df);
        return jsonResponse(results, 200, { "Cache-Control": "public, max-age=300" });
      } catch (err) {
        return jsonResponse({ error: err.message || "Search error" }, 500);
      }
    }

    // 8. YouTube Video & Channel Search
    if (pathname === "/api/yt-search") {
      const q = url.searchParams.get("q");
      if (!q) return jsonResponse({ error: "Missing search query parameter 'q'" }, 400);
      try {
        const data = await handleYtSearch(q);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "YouTube search error" }, 500);
      }
    }

    // 9. Media Info (Playlists & Videos)
    if (pathname === "/api/media-info") {
      const targetUrl = (url.searchParams.get("url") || "").trim();
      if (!targetUrl) return jsonResponse({ error: "url param required" }, 400);
      const type = detectType(targetUrl);

      if (type === "yt_playlist") {
        const listId = extractListId(targetUrl) || targetUrl;
        try {
          const scraped = await scrapePlaylistHtml(listId);
          if (scraped.tracks.length > 0) {
            return jsonResponse(scraped);
          }
          return jsonResponse({ error: "No tracks found in playlist or playlist is private" }, 404);
        } catch (err) {
          return jsonResponse({ error: err.message || "Playlist scrape failed" }, 500);
        }
      }

      if (type === "yt_video") {
        const videoId = extractVideoId(targetUrl);
        const clean = stripToVideoUrl(targetUrl);
        let title = "YouTube Video";
        let author = "YouTube";

        // Strategy A: Noembed resolver
        try {
          const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(clean)}`, { signal: AbortSignal.timeout(4000) });
          if (oembed.ok) {
            const d = await oembed.json();
            if (d?.title) {
              title = cleanTitle(d.title);
              author = cleanTitle(d.author_name || "YouTube");
            }
          }
        } catch (e) {}

        // Strategy B: Invidious resolver if title not resolved
        if (title === "YouTube Video" && videoId) {
          const mirrors = ["https://inv.thepixora.com", "https://invidious.f5.si"];
          for (const m of mirrors) {
            try {
              const res = await fetch(`${m}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(3000) });
              if (res.ok) {
                const data = await res.json();
                if (data.title) {
                  title = cleanTitle(data.title);
                  author = cleanTitle(data.author || "YouTube");
                  break;
                }
              }
            } catch (e) {}
          }
        }

        return jsonResponse({
          type: "track",
          youtubeId: videoId,
          title,
          artist: author,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: 0,
          streamUrl: `/api/stream?url=${encodeURIComponent(clean)}`
        });
      }

      return jsonResponse({ error: "Unsupported media URL" }, 400);
    }

    // 10. AI Web & Transcript Scraper
    if (pathname === "/api/scrape") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return jsonResponse({ error: "Missing 'url' parameter" }, 400);
      try {
        const data = await handleScrape(targetUrl);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "Scrape failed" }, 500);
      }
    }

    // 11. Media Stream Proxy
    if (pathname === "/api/stream") {
      const targetUrl = (url.searchParams.get("url") || "").trim();
      if (!targetUrl) return jsonResponse({ error: "url param required" }, 400);
      const vId = extractVideoId(targetUrl);
      if (vId) {
        return Response.redirect(`https://inv.thepixora.com/latest_version?id=${vId}&itag=140`, 302);
      }
      return jsonResponse({ error: "Unable to resolve stream source" }, 400);
    }

    // 12. Universal CORS Proxy
    if (pathname === "/api/proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return textResponse("Missing 'url' parameter", 400);
      try {
        return await handleProxy(targetUrl, request);
      } catch (err) {
        return textResponse(`Proxy Error: ${err.message}`, 500);
      }
    }

    return jsonResponse({ error: "Endpoint not found", path: pathname }, 404);
  }
};
