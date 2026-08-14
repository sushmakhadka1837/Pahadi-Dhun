// ===== पहाडी धुन · Song list =====
// Naya song thapna: { id: "YouTube VIDEO ID (11 characters)", title: "गीतको नाम", artist: "गायक/गायिका", rotation: "deuda | bihati | saajh | raat", lyrics: "गीतका शब्द (optionally)" }
// VIDEO ID bhetna: youtube.com bata share garera "watch?v=XXXXXXXXXXX" ko X wala part.
// lyrics: optional — line-by-line rakhna sakinchha. lyrics nabhaye YouTube lyrics search link dekhincha.

var ROTATIONS = [
  { key: "bihati", ne: "बिहानी", en: "Morning Oldies", from: 5, to: 10, blurb: "Morning classics — Narayan Gopal, Aruna Lama, Gopal Yonjan. With tea and the morning sun." },
  { key: "deuda",  ne: "ड्यौड़ा",  en: "Deuda Noon",    from: 10, to: 17, blurb: "Sudurpaschim's deuda — the village chautari, salleijo and celebration. The daytime tune." },
  { key: "saajh",  ne: "साँझ",    en: "Evening Oldies", from: 17, to: 22, blurb: "Old songs for the evening — tea, madal and forgotten voices." },
  { key: "raat",   ne: "गहिरो रात", en: "Deep Night",   from: 22, to: 5,  blurb: "The quiet of the night — new deuda and slow tunes, like a radio from a far settlement." }
];

var SONGS = [
  { id: "2_JKbtuB61o", title: "हिमाल सरी", artist: "नारायण गोपाल र अरुणा लामा · गोपाल योञ्जन", rotation: "bihati", tags: [ "evergreen"] },
  { id: "LFR4eMQzUr4", title: "केही मिठो बात गर", artist: "नारायण गोपाल", rotation: "bihati", tags: [ "evergreen"] },
  { id: "i5convKzdLs", title: "गल्ती हजार हुन्छन्", artist: "नारायण गोपाल · गोपाल योञ्जन", rotation: "bihati", tags: ["old"] },
  { id: "DQnVbMNUfBQ", title: "फूललाई सोधेँ", artist: "अरुणा लामा", rotation: "bihati", tags: ["old", "evergreen"] },
  { id: "YjgC4rmKLtM", title: "दुईटा फूल देउरालीमा", artist: "नारायण गोपाल", rotation: "bihati", tags: [ "evergreen"] },

  { id: "RGv7-d3uOXM", title: "सुदूरपश्चिम स्वर्ग सरि", artist: "महेश कुमार औजी र गौरी भट्ट", rotation: "deuda", tags: ["deuda"] },

  { id: "qz_8mDk-Sv0", title: "ओ साली कि खेल्दे ड्यौड़ा", artist: "भरत भट्ट, गौरी भट्ट र झलक भट्ट", rotation: "deuda", tags: ["deuda"] },
  { id: "vo7Lh-_83os", title: "मसुरडाँडी", artist: "चक्र बम, रोहित डेउबा र गौरी भट्ट", rotation: "deuda", tags: ["deuda"] },
  { id: "Uiti-CRxmLE", title: "डोटेली ड्यौड़ा", artist: "विजयसेन ओझा", rotation: "deuda", tags: ["deuda"] },
  { id: "rqpctJG3r2A", title: "हानेर नजरकी तिर", artist: "रेश बिसी र रेखा जोशी", rotation: "deuda", tags: ["dohori"] },
  { id: "uLR6d0j-83U", title: "न्याउल्या", artist: "१३२ भन्दा बढी कलाकारहरू", rotation: "deuda", tags: ["deuda", ] },
  { id: "7KYCBRApCQk", title: "राई झुमा", artist: "परम्परागत देउडा", rotation: "deuda", tags: ["deuda", "old", ] },

  { id: "3-kDw_KIypU", title: "New Deuda Songs Jukebox 2081", artist: "Bishnu Majhi, Raju Pariyar, Gorakh Thapa, Dipa Rokaya, Bhuwan Dahal & Mahesh Kumar Auji", rotation: "deuda", tags: ["deuda", ] },
  { id: "Fvzhn7bNvQU", title: "रामजी खाँड · Songs Collection 2082 Jukebox", artist: "रामजी खाँड", rotation: "deuda", tags: ["deuda"] },
  { id: "hvqfW3Vud8M", title: "झम्क्यो डालिमा", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "xn9wUfa5g8Y", title: "चुलिया फुलिया", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "8N3rL6uHnZg", title: "ओ बाजा झुम्राउली", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "frPawjVs6N8", title: "ऐसेलु पाक्याका वन", artist: "भुवन दाहाल, शंकर सिंह विष्ट र चन्दनी मल्ल", rotation: "deuda", tags: ["deuda"] },
  { id: "7s4DMG3HmC8", title: "रानी वन घसारी", artist: "शंकर सिंह विष्ट र चन्दनी मल्ल", rotation: "deuda", tags: ["deuda"] },
  { id: "TQOgqfis0bQ", title: "ब्यान्तारो आइगयो", artist: "भुवन दाहाल र दीपा रोकाया", rotation: "deuda", tags: ["deuda"] },
  { id: "Gby0-BdyYkk", title: "कि फुलै न फुलौ", artist: "राजाराम भट्ट", rotation: "deuda", tags: ["deuda"] },
  { id: "nSvMHTyydP8", title: "Bombai Jane Rail", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "xigQ-SQH8sE", title: "Kathadaina · Jukebox Vol. 1", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "xigQ-SQH8sE", title: "Agadichhan Ram Chandra · Jukebox Vol. 1", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },
  { id: "xigQ-SQH8sE", title: "Baal Keshari · Jukebox Vol. 1", artist: "नन्द कृष्ण जोशी", rotation: "deuda", tags: ["deuda"] },

  { id: "E2A5YLSPliM", title: "हेरना हेर कान्छा", artist: "अरुणा लामा र जितेन्द्र बर्देवा", rotation: "saajh", tags: [ "evergreen", ] },
  { id: "8uIaRZrB6Jk", title: "पोहोर साल खुसी", artist: "अरुणा लामा", rotation: "saajh", tags: ["old", ] },

  { id: "ayRlE-xdaRE", title: "आँखामा मेरो", artist: "अरुणा लामा", rotation: "saajh", tags: ["old", "evergreen"] },
  { id: "ftjIrijCRU4", title: "गोपाल योञ्जन · Jukebox Vol 3", artist: "गोपाल योञ्जन", rotation: "saajh", tags: ["old", ] },
  { id: "7ofFfa0TIFA", title: "गोपाल योञ्जन · Hits Vol 2", artist: "गोपाल योञ्जन", rotation: "saajh", tags: ["old", ] },

  { id: "nuiQNVVyjjM", title: "झिक्कै झिक्कै माया", artist: "बालेन शाह", rotation: "raat", tags: ["modern"] },
  { id: "Owg-NzcfAkw", title: "जाउ पाटा", artist: "नवराज कलौनी र पुष्पा बोहोरा", rotation: "deuda", tags: ["deuda"] },
  { id: "AoqRRXud37o", title: "काठमाडौँ बसियाकी", artist: "रोहित बिष्ट र लक्ष्मी नेपाली", rotation: "raat", tags: ["dohori"] },
  { id: "0DbIE8446aE", title: "के लाग्यो बाजाको माया", artist: "निरुता खत्री", rotation: "raat", tags: ["dohori"] },
  { id: "0qINEfgn3Dg", title: "असारै महिनामा", artist: "प्रशान्त तामाङ", rotation: "saajh", tags: ["old", "evergreen", ] },






  
{ title: "फूललाई सोधेँ", artist: "अरुणा लामा", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "आँखामा मेरो", artist: "अरुणा लामा", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "एक्लै बस्दा", artist: "अरुणा लामा", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "घुम्तीमा नआऊ है", artist: "प्रेमध्वज प्रधान", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "गोरेटो त्यो गाउँको", artist: "प्रेमध्वज प्रधान", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "यो यस्तो पनि हुँदो रैछ", artist: "फत्तेमान", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "हजार आँखा हेर्ने", artist: "भक्तराज आचार्य", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "माया मेरी साँझ", artist: "भक्तराज आचार्य", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "दोष कसैको", artist: "अरुण थापा", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "ऋतुहरूमा तिमी", artist: "अरुण थापा", rotation: "saajh", tags: ["old", "evergreen"] },

{ title: "उकाली ओरालीहरूमा", artist: "तारादेवी", rotation: "saajh", tags: ["old", "evergreen"] },

  { id: "", title: "लालुपाते नुग्यो", artist: "राजु परियार", rotation: "dohori", tags: ["dohori", "old", "evergreen"] },

{ id: "", title: "हातमा रातो झोला", artist: "राजु परियार", rotation: "dohori", tags: ["dohori", "old"] },

{ id: "", title: "धागो राम्रो रेशम किराको", artist: "राजु परियार", rotation: "dohori", tags: ["dohori", "old"] },

{ id: "", title: "तिमीलाई चिनो", artist: "राजु परियार", rotation: "dohori", tags: ["dohori", "old"] },

{ id: "", title: "उही खोलीमा पानी", artist: "राजन गुरुङ र देवी घर्ती", rotation: "dohori", tags: ["dohori", "old", "evergreen"] },
];
