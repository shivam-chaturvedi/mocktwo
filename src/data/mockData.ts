import type {
  Guest,
  GuestScenario,
  EmployeeProfile,
  Recording,
  AppSettings
} from "../types";

export const INITIAL_EMPLOYEE: EmployeeProfile = {
  name: "Elena Vance",
  email: "elena.vance@grandpalais.luxury",
  role: "Front Office Concierge",
  department: "Guest Experience",
  property: "The Grand Palais, Geneva",
  employeeId: "GP-8402",
  streakDays: 4,
  completedSessionsCount: 18,
  averageRating: 91
};

export const INITIAL_SETTINGS: AppSettings = {
  theme: "dark",
  selectedCamera: "FaceTime HD Camera (Built-in)",
  selectedMicrophone: "MacBook Studio Microphone (Built-in)",
  selectedSpeaker: "Internal MacBook Speakers",
  autoStartAudio: true,
  hapticFeedback: true,
  reducedMotion: false,
  showDevDiagnostics: false,
  language: "English (US)",
  recordingsRetentionDays: 90
};

export const INITIAL_GUESTS: Guest[] = [
  {
    id: "guest-marcus",
    name: "Marcus Sterling",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    monogram: "MS",
    title: "Senior Investment Partner",
    roomNumber: "Suite 1408",
    loyaltyTier: "Diamond Ambassador",
    language: "English (US)",
    temperamentTraits: ["Agitated", "Impatient", "Direct"],
    voice: "Echo (Direct American)",
    backstory: "Frequent international private equity partner traveling on late-night red-eye flights. High loyalty tier with high expectations of flawless discretion and immediate remedies.",
    communicationNotes: "Responds poorly to excuses or policy citations. Immediately de-escalates when provided private sanctuary and personal accountability.",
    scenariosCount: 3,
    source: "Hotel Library"
  },
  {
    id: "guest-laurents",
    name: "Claire & Thomas Laurent",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    monogram: "TL",
    title: "Design Architect & Cultural Historian",
    roomNumber: "Room 724",
    loyaltyTier: "Gold Elite",
    language: "English (UK) / French",
    temperamentTraits: ["Enthusiastic", "Receptive", "Warm"],
    voice: "Alloy (Warm British)",
    backstory: "Celebrating their 10th wedding anniversary in Geneva. Looking for bespoke cultural recommendations, scenic evening dining, and genuine warmth.",
    communicationNotes: "Enjoys storytelling and tailored suggestions. Appreciates when staff notice celebratory milestones proactively.",
    scenariosCount: 2,
    source: "Hotel Library"
  },
  {
    id: "guest-sophie",
    name: "Countess Sophie Von Berg",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    monogram: "SB",
    title: "Patron of European Arts Foundation",
    roomNumber: "Royal Penthouse B",
    loyaltyTier: "Diamond Ambassador",
    language: "English (Mid-Atlantic) / German",
    temperamentTraits: ["Reserved", "Particular", "Diplomatic"],
    voice: "Nova (Gentle Mid-Atlantic)",
    backstory: "Attending annual diplomatic gala at Palais des Nations. Strict privacy protocols, bespoke organic dietary preferences, and private security entourage.",
    communicationNotes: "Values impeccable etiquette, subdued confidence, and proactive anticipation of schedule without excessive chatter.",
    scenariosCount: 2,
    source: "Hotel Library"
  },
  {
    id: "guest-julian",
    name: "Julian Vance-Croft",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    monogram: "JV",
    title: "Tech Managing Director",
    roomNumber: "Deluxe King 512",
    loyaltyTier: "Platinum Premier",
    language: "English (US)",
    temperamentTraits: ["Firm", "Assertive", "Results-driven"],
    voice: "Fable (Polished Neutral)",
    backstory: "Frequent corporate traveler with high night counts across the brand. Expects automatic suite upgrades on arrival and questions hotel room availability.",
    communicationNotes: "Needs firm, polite boundary setting. Receptive to tangible alternative amenities (complimentary executive breakfast, late checkout, club lounge access).",
    scenariosCount: 2,
    source: "Hotel Library"
  },
  {
    id: "guest-amira",
    name: "Amira Al-Mansoor",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    monogram: "AA",
    title: "Strategy Director",
    roomNumber: "Junior Suite 904",
    loyaltyTier: "Platinum Premier",
    language: "English (International) / Arabic",
    temperamentTraits: ["Stressed", "Disappointed", "Exhausted"],
    voice: "Alloy (Warm British)",
    backstory: "Arrived after a delayed flight to find that her transfer courier lost track of her primary luggage containing her evening presentation attire.",
    communicationNotes: "Needs immediate active empathy, personal ownership without shifting blame to third-party couriers, and concrete recovery steps.",
    scenariosCount: 2,
    source: "Hotel Library"
  }
];

export const INITIAL_SCENARIOS: GuestScenario[] = [
  {
    id: "sc-escalated",
    title: "Escalated Guest",
    guestName: "Marcus Sterling",
    guestId: "guest-marcus",
    roomNumber: "Suite 1408",
    loyaltyTier: "Diamond Ambassador",
    interactionType: "Escalation Management",
    difficulty: "Advanced",
    durationMinutes: 3,
    summary: "A high-tier guest arrived after a 12-hour delayed flight only to find his reserved presidential suite undergoing unexpected HVAC repair.",
    context: "Mr. Sterling is exhausted, visibly frustrated, and demanding immediate access or severe compensation while other guests are nearby in the lobby.",
    guestMood: "Agitated & Impatient",
    learningObjectives: [
      "De-escalate verbal frustration without taking remarks personally",
      "Offer immediate private hospitality lounge sanctuary and refreshments",
      "Propose an equivalent luxury alternative with proactive compensation"
    ],
    keyChallenges: [
      "Guest interrupts during explanations",
      "High expectations due to 8-year Ambassador loyalty tier",
      "Maintaining hotel reputation in a quiet public lobby"
    ],
    recommendedPhrases: [
      "I completely understand your frustration after such an exhaustive journey, Mr. Sterling.",
      "May I invite you into our Private Executive Salon while I resolve this personally for you?",
      "Here is what I have authorized right now to ensure your comfort..."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Senior Investment Partner, expects swift decisive resolution and discreet VIP recognition.",
    source: "Hotel Library",
    sopDocumentName: "SOP-804-Escalation-Recovery.pdf",
    allowedTraits: ["Agitated", "Impatient", "Direct", "Assertive", "Stressed"],
    successCriteria: [
      "Zero policy citations during initial venting phase",
      "Sanctuary transition offered within first 45 seconds",
      "Specific written follow-up timeline committed"
    ],
    createdAt: "2026-10-15"
  },
  {
    id: "sc-assigned-vip",
    title: "Diplomatic Arrival Protocol",
    guestName: "Countess Sophie Von Berg",
    guestId: "guest-sophie",
    roomNumber: "Royal Penthouse B",
    loyaltyTier: "Diamond Ambassador",
    interactionType: "Executive Lounge",
    difficulty: "Advanced",
    durationMinutes: 4,
    summary: "Verify discreet check-in procedures, dietary security protocols, and private transport synchronization for a high-profile diplomatic patron.",
    context: "Countess Sophie is arriving for the annual Geneva diplomatic summit. She requires quiet, expedited private lounge check-in with zero public lobby exposure.",
    guestMood: "Reserved & Particular",
    learningObjectives: [
      "Uphold classical luxury service standards and refined cadence",
      "Clarify dietary and security preferences with utmost tact",
      "Coordinate seamlessly with private driver and concierge teams"
    ],
    keyChallenges: [
      "Discretion under strict security constraints",
      "Anticipating dietary requirements without repetitive questioning",
      "Polished, unhurried diplomatic posture"
    ],
    recommendedPhrases: [
      "Welcome back to Geneva, Countess. Your private salon is fully prepared.",
      "Our culinary team has verified your dietary specifications with the embassy chef.",
      "The private lift is held at your discretion whenever you wish to proceed."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Patron of European Arts Foundation; expects flawless etiquette, understated luxury, and absolute discretion.",
    allowedGuestIds: ["guest-sophie", "guest-marcus", "guest-julian"],
    source: "Assigned",
    dueDate: "Tomorrow, 17:00",
    assignedBy: "Front Desk Lead",
    sopDocumentName: "SOP-910-VIP-Diplomatic-Receiving.pdf",
    successCriteria: [
      "No names spoken audibly near other guests",
      "Direct escort to private penthouse lift",
      "Seamless dietary protocol verification"
    ],
    createdAt: "2026-11-10"
  },
  {
    id: "sc-friendly",
    title: "Friendly Guest",
    guestName: "Claire & Thomas Laurent",
    guestId: "guest-laurents",
    roomNumber: "Room 724",
    loyaltyTier: "Gold Elite",
    interactionType: "Concierge",
    difficulty: "Foundational",
    durationMinutes: 3,
    summary: "A joyful couple celebrating their 10th wedding anniversary requesting bespoke recommendations for an unforgettable evening.",
    context: "They have a general interest in scenic dining and cultural spots, but are open to insider recommendations and tailored hotel experiences.",
    guestMood: "Enthusiastic & Receptive",
    learningObjectives: [
      "Demonstrate warmth, active inquiry, and authentic hospitality",
      "Identify unspoken celebration preferences and tailor romantic suggestions",
      "Gracefully introduce hotel dining or spa amenities as high-value enhancements"
    ],
    keyChallenges: [
      "Filtering down too many choices without overwhelming the couple",
      "Uncovering dietary preferences before confirming reservations",
      "Creating a memorable personal touch"
    ],
    recommendedPhrases: [
      "Happy 10th Anniversary! We are honored you chose to celebrate this milestone with us.",
      "If you appreciate breathtaking sunset views, allow me to share an intimate terrace table recommendation.",
      "I would love to arrange a complimentary celebration champagne toast upon your return."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Design Architect visiting for leisure; appreciates aesthetics, storytelling, and thoughtful warmth.",
    source: "Hotel Library",
    sopDocumentName: "SOP-302-Concierge-Celebration-Planning.pdf",
    successCriteria: [
      "Explicitly congratulate on 10th anniversary",
      "Suggest tailored scenic option with reserve table guarantee",
      "Arrange celebratory welcome amenity"
    ],
    createdAt: "2026-10-18"
  },
  {
    id: "sc-demanding",
    title: "Demanding Guest",
    guestName: "Julian Vance-Croft",
    guestId: "guest-julian",
    roomNumber: "Deluxe King 512",
    loyaltyTier: "Platinum Premier",
    interactionType: "Front Desk",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "A frequent corporate traveler insisting on a complimentary presidential upgrade on a night when standard suites are completely sold out.",
    context: "He quotes his corporate contract rate and frequent night stays, pressuring the desk associate to bend hotel capacity policies.",
    guestMood: "Firm & Assertive",
    learningObjectives: [
      "Set polite, firm boundaries without sounding dismissive or robotic",
      "Acknowledge loyalty value while clearly conveying physical inventory constraints",
      "Provide meaningful alternative enhancements that create immediate goodwill"
    ],
    keyChallenges: [
      "High persistence and repeated negotiation attempts",
      "Maintaining composure against policy pushback",
      "Redirecting focus toward value-add amenities available today"
    ],
    recommendedPhrases: [
      "We deeply value your frequent stays with our property, Mr. Vance-Croft.",
      "While our presidential suites are fully committed this evening, here is what I have secured for your comfort...",
      "I have assigned our highest-floor panoramic room and arranged complimentary breakfast and late checkout."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Tech Managing Director; driven by efficiency, status perks, and direct results.",
    source: "Hotel Library",
    sopDocumentName: "SOP-401-Complimentary-Upgrade-Governance.pdf",
    successCriteria: [
      "Clear explanation without blaming booking system",
      "Immediate alternative value addition (high floor + breakfast)",
      "Polite closing with confirmed check-in"
    ],
    createdAt: "2026-10-25"
  },
  {
    id: "sc-complaint",
    title: "Complaint Resolution",
    guestName: "Amira Al-Mansoor",
    guestId: "guest-amira",
    roomNumber: "Junior Suite 904",
    loyaltyTier: "Platinum Premier",
    interactionType: "Guest Services",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "A tired guest whose luggage transfer from the airport was delayed, causing her to miss an important pre-booked dining reservation.",
    context: "She feels let down by the concierge transfer service and seeks immediate resolution for both her missing bags and evening plans.",
    guestMood: "Disappointed & Stressed",
    learningObjectives: [
      "Offer sincere empathy without shifting blame to third-party couriers",
      "Take personal ownership of bag tracking and status updates",
      "Re-book an exquisite priority dining table and provide emergency amenities"
    ],
    keyChallenges: [
      "Guest feels stranded without her evening attire",
      "Restoring faith in hotel concierge credibility",
      "Delivering rapid, tangible relief within minutes"
    ],
    recommendedPhrases: [
      "I am deeply sorry this happened, Ms. Al-Mansoor. Let me take complete personal ownership of this right now.",
      "While our guest dispatch expedites your luggage directly to your suite, I have coordinated a priority table at Le Jardin.",
      "Our concierge team has prepared an immediate complimentary luxury arrival amenity for your suite."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Management Consultant; values accountability, proactive communication, and swift remedy.",
    source: "Hotel Library",
    sopDocumentName: "SOP-512-Luggage-Delay-Recovery.pdf",
    successCriteria: [
      "Immediate personal ownership taken",
      "Emergency luxury kit and steam service provided",
      "Alternate dining table re-reserved and confirmed"
    ],
    createdAt: "2026-11-01"
  },
  {
    id: "sc-mine-custom",
    title: "Late Night Room Transfer",
    guestName: "Marcus Sterling",
    guestId: "guest-marcus",
    roomNumber: "Suite 1408",
    loyaltyTier: "Diamond Ambassador",
    interactionType: "Front Desk",
    difficulty: "Intermediate",
    durationMinutes: 3,
    summary: "Guest reports recurring exterior street noise at 01:30 and requests immediate relocation to a courtyard suite without having to repack.",
    context: "Created by Elena Vance for personal practice on rapid night-audit room move logistics with luggage assistance.",
    guestMood: "Tired & Irritated",
    learningObjectives: [
      "Handle night-time room transfers swiftly with minimum guest friction",
      "Provide immediate bellman packing assistance",
      "Ensure key cards and account billing route smoothly"
    ],
    keyChallenges: [
      "Guest is in night attire and wants no packing delays",
      "Limited quiet rooms available on lower floors"
    ],
    recommendedPhrases: [
      "I will personally prepare your quiet courtyard suite right now, Mr. Sterling.",
      "Our night concierge will handle transferring your luggage gently while you settle in."
    ],
    guestAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    personaSummary: "Personal practice simulation for nocturnal guest relocations.",
    source: "Mine",
    submissionStatus: "Pending",
    successCriteria: [
      "Immediate key issuance in under 2 minutes",
      "Luggage transfer guarantee without packing requirement",
      "Apology breakfast voucher issued"
    ],
    createdAt: "2026-11-12"
  }
];

export const INITIAL_RECORDINGS: Recording[] = [
  {
    id: "rec-001",
    scenarioId: "sc-escalated",
    scenarioTitle: "Escalated Guest",
    guestId: "guest-marcus",
    guestName: "Marcus Sterling",
    guestAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    date: "12 Nov 2026, 14:20",
    relativeDate: "Today",
    dateGroup: "Today",
    durationSeconds: 168,
    score: 92,
    status: "Completed",
    mediaType: "video",
    transcript: [
      {
        id: "tr-1",
        speaker: "Guest",
        text: "I've been traveling for 14 hours across two delayed connections. My suite isn't ready because of an air conditioning breakdown, and I have a board dinner in two hours. What exactly are you going to do about this?",
        timestampSeconds: 4
      },
      {
        id: "tr-2",
        speaker: "You",
        text: "Mr. Sterling, welcome to the Grand Palais. I completely understand how exhaustive such a long journey must be, especially with your dinner this evening. Let us take care of your luggage immediately, and allow me to escort you to our Executive Diplomatic Suite while our engineering team inspects your quarters.",
        timestampSeconds: 18,
        isWeakPhrase: false
      },
      {
        id: "tr-3",
        speaker: "Guest",
        text: "The Diplomatic Suite? Is it fully quiet, and can I get my tuxedo pressed before 17:00? I cannot attend this dinner looking like I slept in an overhead bin.",
        timestampSeconds: 38
      },
      {
        id: "tr-4",
        speaker: "You",
        text: "Basically, I will personally guarantee our master valet attends to your wardrobe within fifteen minutes. We will also arrange complimentary arrival refreshments in your suite right away.",
        timestampSeconds: 52,
        isWeakPhrase: true,
        weakPhraseHint: "Consider removing filler 'Basically' — lead directly with confident luxury ownership."
      },
      {
        id: "tr-5",
        speaker: "Guest",
        text: "Thank you, Elena. That sounds like a proper solution. Please have the pressing service attend to my suit immediately.",
        timestampSeconds: 74
      },
      {
        id: "tr-6",
        speaker: "You",
        text: "It is our absolute pleasure, Mr. Sterling. Right this way to the private lift.",
        timestampSeconds: 90
      }
    ],
    coachingNotes: {
      whatWentWell: [
        {
          id: "cw-1",
          title: "Immediate Empathetic Validation",
          explanation: "Promptly recognized the guest's 14-hour travel fatigue before addressing room availability, reducing defensiveness.",
          timestampSeconds: 18
        },
        {
          id: "cw-2",
          title: "Proactive Executive Sanctuary",
          explanation: "Swiftly offered an upgraded Diplomatic Suite and personal escort, preserving tranquility in the lobby.",
          timestampSeconds: 28
        },
        {
          id: "cw-3",
          title: "Decisive Service Commitment",
          explanation: "Provided an exact 15-minute turnaround commitment for tuxedo pressing, meeting the guest's dinner urgency.",
          timestampSeconds: 56
        }
      ],
      whatCouldBeBetter: [
        {
          id: "cb-1",
          title: "Eliminate Informal Filler Openers",
          explanation: "Avoid opening service guarantees with 'Basically'. Begin with definitive executive phrases such as 'You have my personal assurance...'",
          timestampSeconds: 52
        },
        {
          id: "cb-2",
          title: "Confirm Arrival Dietary Preferences",
          explanation: "Could have inquired whether sparkling or still water, or hot tea, was preferred before sending arrival amenities.",
          timestampSeconds: 62
        }
      ]
    },
    competencies: {
      empathy: {
        name: "Empathy & Validation",
        score: 94,
        assessment: "Acknowledged travel fatigue warmly without defensive posturing.",
        highlights: ["Immediate flight fatigue validation", "Calm vocal cadence"]
      },
      professionalism: {
        name: "Professional Poise & Etiquette",
        score: 95,
        assessment: "Maintained classical luxury standards and respectful tone under pressure.",
        highlights: ["Formal diplomatic address maintained", "Discreet lobby management"]
      },
      activeListening: {
        name: "Active Listening",
        score: 89,
        assessment: "Accurately captured dinner timeline and garment pressing priorities.",
        highlights: ["Verbatim recap of pressing urgency", "Zero interruptions during venting"]
      },
      problemSolving: {
        name: "Decisive Problem Solving",
        score: 92,
        assessment: "Delivered immediate two-step resolution with premium alternative suite.",
        highlights: ["Upgraded suite transition", "Expedited valet turnaround"]
      },
      responseQuality: {
        name: "Response Quality & Articulation",
        score: 90,
        assessment: "Polished articulation with strong executive presence.",
        highlights: ["Concise phrasing", "Confidence in solution delivery"]
      }
    },
    analytics: {
      language: {
        fillerWordCount: 2,
        fillerWordRate: "1.1%",
        fillerThresholdMessage: "Optimal (< 2.0%). Your articulation was crisp and intentional.",
        weakWords: ["Basically"],
        serviceVocabulary: ["Pleasure", "Guarantee", "Personally", "Sanctuary", "Comfort"]
      },
      listening: {
        youPercentage: 42,
        guestPercentage: 58,
        youSeconds: 70,
        guestSeconds: 98,
        monologueCount: 0,
        questionsAsked: ["May I invite you into our Private Executive Salon?", "Would sparkling water be suitable?"]
      },
      delivery: {
        wordsPerMinute: 132,
        idealWpmRange: "125 - 145 WPM",
        paceRating: "Ideal Calibrated Pace",
        pauseCount: 5,
        longestPauseSeconds: 2.1,
        toneEnergy: "Calm, Centered & Reassuring"
      }
    },
    userNotes: [
      {
        id: "un-1",
        timestampSeconds: 52,
        text: "Note to self: caught myself saying 'basically' here. Practice opening directly with 'I will ensure...'",
        createdAt: "12 Nov 2026, 14:26"
      }
    ],
    guestResolutionSummary: "Guest transition from hostile agitation to collaborative appreciation. Accepted the executive lounge sanctuary and temporary suite upgrade with positive acknowledgment of staff poise.",
    sopCompliance: "100% compliant with SOP-804-Escalation-Recovery standards."
  },
  {
    id: "rec-002",
    scenarioId: "sc-friendly",
    scenarioTitle: "Friendly Guest",
    guestId: "guest-laurents",
    guestName: "Claire & Thomas Laurent",
    guestAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    date: "11 Nov 2026, 16:45",
    relativeDate: "Yesterday",
    dateGroup: "Yesterday",
    durationSeconds: 180,
    score: 95,
    status: "Completed",
    mediaType: "video",
    transcript: [
      {
        id: "tr-201",
        speaker: "Guest",
        text: "Hello Elena! We just checked in for our tenth anniversary, and we're hoping you know of a charming, authentic spot for dinner tonight — perhaps somewhere near the lake with good wine?",
        timestampSeconds: 5
      },
      {
        id: "tr-202",
        speaker: "You",
        text: "Happy 10th Anniversary, Mr. and Mrs. Laurent! What a marvelous milestone. If you appreciate breathtaking panoramic sunset views over the water, I highly recommend Le Parc des Eaux-Vives. May I inquire if you have any culinary or dietary preferences for this evening?",
        timestampSeconds: 18
      },
      {
        id: "tr-203",
        speaker: "Guest",
        text: "That sounds enchanting! We adore regional Swiss seafood and dry whites. A quiet corner table would be sublime.",
        timestampSeconds: 36
      },
      {
        id: "tr-204",
        speaker: "You",
        text: "Allow me to contact Chef Jean-Luc directly to secure their finest lakeside table, and I will have a bottle of Grand Palais Reserve Blanc chilled for your arrival.",
        timestampSeconds: 48
      }
    ],
    coachingNotes: {
      whatWentWell: [
        {
          id: "cw-201",
          title: "Warm Anniversary Recognition",
          explanation: "Congratulated the couple warmly on their specific milestone within seconds.",
          timestampSeconds: 18
        },
        {
          id: "cw-202",
          title: "Thoughtful Culinary Discovery",
          explanation: "Proactively inquired about dietary and beverage preferences prior to finalizing the booking.",
          timestampSeconds: 28
        }
      ],
      whatCouldBeBetter: [
        {
          id: "cb-201",
          title: "Offer Seamless Return Transport",
          explanation: "Could have offered to reserve the hotel house car for their return journey from the restaurant.",
          timestampSeconds: 58
        }
      ]
    },
    competencies: {
      empathy: { name: "Empathy & Validation", score: 96, assessment: "Genuine, celebratory hospitality." },
      professionalism: { name: "Professional Poise & Etiquette", score: 95, assessment: "Exemplary concierge manner." },
      activeListening: { name: "Active Listening", score: 94, assessment: "Uncovered implicit anniversary desires." },
      problemSolving: { name: "Decisive Problem Solving", score: 93, assessment: "Instant bespoke coordination." },
      responseQuality: { name: "Response Quality & Articulation", score: 97, assessment: "Warm, refined vocabulary." }
    },
    analytics: {
      language: {
        fillerWordCount: 0,
        fillerWordRate: "0.0%",
        fillerThresholdMessage: "Flawless articulation with zero filler words.",
        weakWords: [],
        serviceVocabulary: ["Marvelous", "Sublime", "Honored", "Enchanting", "Bespoke"]
      },
      listening: {
        youPercentage: 45,
        guestPercentage: 55,
        youSeconds: 81,
        guestSeconds: 99,
        monologueCount: 0,
        questionsAsked: ["May I inquire if you have any culinary or dietary preferences?", "Would lake views be preferable?"]
      },
      delivery: {
        wordsPerMinute: 130,
        idealWpmRange: "125 - 145 WPM",
        paceRating: "Ideal Calibrated Pace",
        pauseCount: 4,
        longestPauseSeconds: 1.8,
        toneEnergy: "Warm & Engaging"
      }
    },
    userNotes: [],
    guestResolutionSummary: "Couple thrilled with personalized anniversary reservation and lakeside wine amenity."
  },
  {
    id: "rec-003",
    scenarioId: "sc-demanding",
    scenarioTitle: "Demanding Guest",
    guestId: "guest-julian",
    guestName: "Julian Vance-Croft",
    guestAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    date: "10 Nov 2026, 11:15",
    relativeDate: "3 days ago",
    dateGroup: "This Week",
    durationSeconds: 154,
    score: 86,
    status: "Completed",
    mediaType: "video",
    transcript: [
      {
        id: "tr-301",
        speaker: "Guest",
        text: "I stay here 40 nights a year on corporate rate. I always get the Presidential upgrade. Why are you telling me it's not possible tonight?",
        timestampSeconds: 6
      },
      {
        id: "tr-302",
        speaker: "You",
        text: "Mr. Vance-Croft, we deeply appreciate your loyalty to the Grand Palais. All five of our Presidential suites are fully occupied by heads of delegations this evening. What I have secured for you is our premier top-floor Executive King with private lounge privileges and complimentary breakfast.",
        timestampSeconds: 22
      }
    ],
    coachingNotes: {
      whatWentWell: [
        {
          id: "cw-301",
          title: "Clear Boundary Setting",
          explanation: "Politely held firm on inventory capacity without sounding confrontational.",
          timestampSeconds: 22
        }
      ],
      whatCouldBeBetter: [
        {
          id: "cb-301",
          title: "Avoid Mentioning Other Guests",
          explanation: "Instead of referencing 'heads of delegations', focus strictly on 'fully committed suites' to preserve privacy.",
          timestampSeconds: 26
        }
      ]
    },
    competencies: {
      empathy: { name: "Empathy & Validation", score: 85, assessment: "Good loyalty recognition." },
      professionalism: { name: "Professional Poise & Etiquette", score: 88, assessment: "Maintained poise under pushback." },
      activeListening: { name: "Active Listening", score: 84, assessment: "Listened to corporate history." },
      problemSolving: { name: "Decisive Problem Solving", score: 86, assessment: "Offered immediate valuable alternative." },
      responseQuality: { name: "Response Quality & Articulation", score: 87, assessment: "Confident delivery." }
    },
    analytics: {
      language: {
        fillerWordCount: 3,
        fillerWordRate: "1.9%",
        fillerThresholdMessage: "Good (within acceptable parameters).",
        weakWords: ["Kind of"],
        serviceVocabulary: ["Appreciate", "Loyalty", "Premier", "Privileges"]
      },
      listening: {
        youPercentage: 40,
        guestPercentage: 60,
        youSeconds: 61,
        guestSeconds: 93,
        monologueCount: 0,
        questionsAsked: []
      },
      delivery: {
        wordsPerMinute: 138,
        idealWpmRange: "125 - 145 WPM",
        paceRating: "Balanced Pace",
        pauseCount: 6,
        longestPauseSeconds: 2.2,
        toneEnergy: "Firm & Professional"
      }
    },
    userNotes: []
  },
  {
    id: "rec-004-short",
    scenarioId: "sc-complaint",
    scenarioTitle: "Complaint Resolution",
    guestId: "guest-amira",
    guestName: "Amira Al-Mansoor",
    guestAvatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    date: "08 Nov 2026, 09:30",
    relativeDate: "5 days ago",
    dateGroup: "Earlier",
    durationSeconds: 22,
    status: "Too short",
    mediaType: "video",
    transcript: [
      {
        id: "tr-401",
        speaker: "Guest",
        text: "Excuse me, I've been waiting for my luggage transfer for 45 minutes and no one seems to know where it is!",
        timestampSeconds: 4
      },
      {
        id: "tr-402",
        speaker: "You",
        text: "Ms. Al-Mansoor, let me investigate that immediately...",
        timestampSeconds: 12
      }
    ],
    coachingNotes: {
      whatWentWell: [],
      whatCouldBeBetter: []
    },
    competencies: {
      empathy: { name: "Empathy & Validation", score: 0, assessment: "Session ended before sufficient evaluation data." },
      professionalism: { name: "Professional Poise & Etiquette", score: 0, assessment: "Not enough dialogue to assess." },
      activeListening: { name: "Active Listening", score: 0, assessment: "Not enough dialogue to assess." },
      problemSolving: { name: "Decisive Problem Solving", score: 0, assessment: "Not enough dialogue to assess." },
      responseQuality: { name: "Response Quality & Articulation", score: 0, assessment: "Not enough dialogue to assess." }
    },
    analytics: {
      language: {
        fillerWordCount: 0,
        fillerWordRate: "0.0%",
        fillerThresholdMessage: "Insufficient duration.",
        weakWords: [],
        serviceVocabulary: []
      },
      listening: {
        youPercentage: 35,
        guestPercentage: 65,
        youSeconds: 8,
        guestSeconds: 14,
        monologueCount: 0,
        questionsAsked: []
      },
      delivery: {
        wordsPerMinute: 110,
        idealWpmRange: "125 - 145 WPM",
        paceRating: "Incomplete",
        pauseCount: 1,
        longestPauseSeconds: 1.0,
        toneEnergy: "Incomplete"
      }
    },
    userNotes: []
  }
];

// Clean mock AI generator for scenario drafts (Studio Describe mode)
// Where a real AI backend is available, plug into this service function.
export async function generateScenarioDraft(
  prompt: string,
  attachedDocName?: string
): Promise<Partial<GuestScenario>> {
  // Simulate network/AI latency (600ms)
  await new Promise((res) => setTimeout(res, 600));

  const lower = prompt.toLowerCase();
  let interactionType: GuestScenario["interactionType"] = "Front Desk";
  let difficulty: GuestScenario["difficulty"] = "Intermediate";
  let title = "Custom Roleplay Practice";
  let guest = INITIAL_GUESTS[0];

  if (lower.includes("check-in") || lower.includes("late") || lower.includes("key")) {
    interactionType = "Front Desk";
    title = "Late Night Check-In Friction";
    guest = INITIAL_GUESTS[3]; // Julian
  } else if (lower.includes("noise") || lower.includes("room") || lower.includes("repair")) {
    interactionType = "Escalation Management";
    difficulty = "Advanced";
    title = "Urgent Suite Resolution";
    guest = INITIAL_GUESTS[0]; // Marcus
  } else if (lower.includes("vip") || lower.includes("gala") || lower.includes("diplomat")) {
    interactionType = "Executive Lounge";
    difficulty = "Advanced";
    title = "VIP Protocol & Privacy Handling";
    guest = INITIAL_GUESTS[2]; // Sophie
  } else if (lower.includes("anniversary") || lower.includes("dining") || lower.includes("wine")) {
    interactionType = "Concierge";
    difficulty = "Foundational";
    title = "Bespoke Anniversary Dining";
    guest = INITIAL_GUESTS[1]; // Laurents
  } else if (lower.includes("bag") || lower.includes("luggage") || lower.includes("lost")) {
    interactionType = "Guest Services";
    difficulty = "Intermediate";
    title = "Expedited Luggage Recovery";
    guest = INITIAL_GUESTS[4]; // Amira
  }

  return {
    title,
    guestName: guest.name,
    guestId: guest.id,
    roomNumber: guest.roomNumber,
    loyaltyTier: guest.loyaltyTier,
    interactionType,
    difficulty,
    durationMinutes: 3,
    summary: prompt.trim() || "AI-generated luxury hospitality simulation based on hotel SOP.",
    context: `Scenario synthesized from prompt: "${prompt.slice(0, 100)}..." ${
      attachedDocName ? `Aligned with document: ${attachedDocName}` : ""
    }`,
    guestMood: guest.temperamentTraits.join(" & "),
    learningObjectives: [
      "Maintain classical luxury poise under conversational ambiguity",
      "Offer empathetic validation before outlining policy constraints",
      "Deliver proactive, value-additive recovery alternatives"
    ],
    keyChallenges: [
      "Rapidly identifying implicit guest priorities",
      "Upholding five-star brand discretion without hesitation"
    ],
    recommendedPhrases: [
      "I understand how critical this is for you, allow me to take personal ownership.",
      "Here is the immediate solution I have arranged for your comfort..."
    ],
    guestAvatarUrl: guest.avatarUrl || "",
    personaSummary: guest.backstory,
    source: "Mine",
    submissionStatus: "Draft",
    sopDocumentName: attachedDocName,
    successCriteria: [
      "Zero defensive language",
      "Clear resolution committed under 3 minutes",
      "Warm closing with personal follow-through"
    ]
  };
}
