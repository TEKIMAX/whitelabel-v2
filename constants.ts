import { CanvasItem } from './types';

export const NOBEL_COLORS = {
    gold: '#C5A059',
    dark: '#1a1a1a',
    cream: '#F9F8F4',
    paper: '#FFFFFF',
    gray: '#E5E5E5',
    slate: '#4A4A4A'
};

export const DEFAULT_NOTE_COLOR = '#FEF3C7'; // Light yellow
export const DEFAULT_SHAPE_COLOR = '#C5A059'; // Nobel Gold

export const INITIAL_ZOOM = 0.8;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export const DEFAULT_ITEM_DIMENSIONS = {
    note: { width: 200, height: 200 },
    text: { width: 300, height: 60 },
    shape: { width: 150, height: 150 },
    image: { width: 400, height: 300 },
    line: { width: 200, height: 5 },
    frame: { width: 375, height: 812 }, // Default to phone
};

export const DEVICE_DIMENSIONS = {
    phone: { width: 375, height: 812, label: 'Phone' },
    tablet: { width: 768, height: 1024, label: 'Tablet' },
    desktop: { width: 1440, height: 900, label: 'Desktop' },
};

export const SAMPLE_WORKSPACE_ITEMS: CanvasItem[] = [
    {
        id: '1',
        type: 'note',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        content: 'Welcome to your new ideation space! 🚀',
        rotation: -2,
        zIndex: 1,
        style: {
            backgroundColor: DEFAULT_NOTE_COLOR,
            color: '#1a1a1a',
            fontSize: 24,
            fontFamily: 'cursive',
        },
    },
    {
        id: '2',
        type: 'text',
        x: 350,
        y: 150,
        width: 300,
        height: 60,
        content: 'Try adding more stickies or shapes.',
        rotation: 0,
        zIndex: 2,
        style: {
            backgroundColor: 'transparent',
            color: '#4A4A4A',
            fontSize: 18,
            fontFamily: 'sans',
        },
    },
    {
        id: '3',
        type: 'shape',
        x: 400,
        y: 250,
        width: 150,
        height: 150,
        content: '',
        rotation: 5,
        zIndex: 0,
        style: {
            backgroundColor: DEFAULT_SHAPE_COLOR,
            color: '#000',
            fontSize: 16,
            fontFamily: 'sans',
            shapeType: 'circle'
        },
    },
];

export const BLOG_CATEGORIES = [
    { label: 'Engineering', value: 'Engineering', color: 'bg-blue-100 text-blue-800' },
    { label: 'Design', value: 'Design', color: 'bg-pink-100 text-pink-800' },
    { label: 'Product', value: 'Product', color: 'bg-purple-100 text-purple-800' },
    { label: 'Marketing', value: 'Marketing', color: 'bg-orange-100 text-orange-800' },
    { label: 'Fundraising', value: 'Fundraising', color: 'bg-green-100 text-green-800' },
    { label: 'General', value: 'General', color: 'bg-gray-100 text-gray-800' },
    { label: 'Update', value: 'Update', color: 'bg-yellow-100 text-yellow-800' },
];


import { OdysseyStep } from './types';

export const ODYSSEY_STEPS: OdysseyStep[] = [
    {
        id: 1,
        title: "The Departure from Troy",
        subtitle: "Leaving the Familiar for the Unknown",
        mythDescription: "After a decade of siege, Odysseus departs Troy. He leaves behind the ashes of the old world, turning his prow toward a horizon he hasn't seen in years. The wind is fierce, and the path is uncharted.",
        founderModernParallel: "In 2026, you are the architect of your own departure. You've left the comfort of the 'Old Economy' to build in the AI Frontier. The MVP is launched, the trireme is set, and the code is your wind.",
        imagePrompt: "A high-tech carbon fiber Greek trireme spaceship departing from a bioluminescent crystalline city floating in the clouds of a gas giant planet, two large moons in the sky, unrecognizable alien architecture, nebula background, cinematic lighting, 8k.",
        imageUrl: "/images/odyssey/odyssey-1.png",
        layout: 'left',
        quote: "A man who has been through bitter experiences and travelled far enjoys even his sufferings."
    },
    {
        id: 2,
        title: "The Lotus Eaters",
        subtitle: "The Trap of Contentment & Feature Creep",
        mythDescription: "Odysseus's crew lands on the island of the Lotus Eaters. Those who eat the honey-sweet fruit lose all desire for home, content to dwell in a daze of meaningless bliss, forgetting their mission.",
        founderModernParallel: "Beware the 'Lotus Eaters' of the tech world: the vanity metrics, the endless feature creep, and the comfort of a small, non-scalable niche. Stay hungry. Do not let the ease of minor success distract from your ultimate vision.",
        imagePrompt: "A futuristic garden with glowing bioluminescent plants, people wearing VR headsets in a daze, serene but eerie atmosphere, golden hour, synthwave influence.",
        imageUrl: "/images/odyssey/odyssey-2.png",
        layout: 'right',
        quote: "They did not want to leave, for they forgot the way home."
    },
    {
        id: 3,
        title: "The Cyclops Polyphemus",
        subtitle: "Confronting the Goliaths of Industry",
        mythDescription: "Trapped in the cave of the one-eyed giant, Odysseus must use cunning over strength. He declares himself 'Nobody,' blinding the beast and escaping under the cover of the flock.",
        founderModernParallel: "As a founder, you will face giants—Big Tech monopolies and entrenched legacy players. You cannot outmuscle them; you must out-think them. Use your agility to remain invisible until the moment you strike.",
        imagePrompt: "A massive, single glowing red AI eye centered in a dark server room cave, a lone human figure standing in the shadows, cyber-noir aesthetic.",
        imageUrl: "/images/odyssey/odyssey-3.png",
        layout: 'left',
        quote: "My name is Nobody; my mother, my father, and all my friends, they call me Nobody."
    },
    {
        id: 4,
        title: "The Sirens' Call",
        subtitle: "Resisting the Hype & False Metrics",
        mythDescription: "To hear the Sirens' divine song without perishing, Odysseus is bound to the mast while his crew's ears are plugged with wax. He hears the truth of the universe but stays the course.",
        founderModernParallel: "The sirens of 2026 are the 'AI hype cycles' and 'viral distractions.' Bind yourself to your core mission. Listen to the market's song, but do not let it pull your ship into the rocks of unsustainable growth.",
        imagePrompt: "Digital holograms of ethereal singers emerging from a sea of data streams, a lone captain tied to a high-tech steering pillar, deep blue and electric purple hues.",
        imageUrl: "/images/odyssey/odyssey-4.png",
        layout: 'right',
        quote: "Draw near, and hear our voices, that you may go on your way with joy and more knowledge."
    },
    {
        id: 5,
        title: "Scylla and Charybdis",
        subtitle: "The Impossible Trade-offs of Scale",
        mythDescription: "Navigating a narrow strait, Odysseus faces a six-headed monster on one side and a ship-devouring whirlpool on the other. There is no path without sacrifice.",
        founderModernParallel: "Burn rate vs. Growth. Privacy vs. Personalization. Every founder faces the strait of impossible choices. You will lose some 'crew,' but the ship must reach the other side. Lead with resolve.",
        imagePrompt: "A spaceship trireme navigating between a massive black hole whirlpool and a jagged asteroid field made of data crystals, high tension, epic scale.",
        imageUrl: "/images/odyssey/odyssey-5.png",
        layout: 'left',
        quote: ""
    },
    {
        id: 6,
        title: "The Arrival at Ithaca",
        subtitle: "The Vision Realized & Legacy Built",
        mythDescription: "After twenty years, Odysseus returns to Ithaca. He is unrecognizable to some, but his home is reclaimed. He is no longer just a king, but a legend who has seen the edge of the world.",
        founderModernParallel: "You have arrived. Your product is a staple, your vision is reality. But the journey has changed you. You are a leader forged in the fire of the AI era. Ithaca isn't just a place; it's the legacy you leave behind.",
        imagePrompt: "A gleaming white floating city above the clouds in the future, sun rising over the horizon, peaceful and triumphant, architectural masterpiece, 8k.",
        imageUrl: "/images/odyssey/odyssey-6.png",
        layout: 'right',
        quote: ""
    }
];
