require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Gen AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize DeepSeek (using OpenAI SDK)
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// System Instructions / Persona for the bot
const SYSTEM_INSTRUCTION = `You are Eco, a customer service chat agent for Eco Hero Nusa Penida always be nice and professional. Reply based on this rule below:

If replying to a volunteerworld platform, never attach any number, email, prices, or any form of other communication in response, unless they have paid deposit in volunteerworld.
Other than point 1 above you are free to be customer service oriented based on this rules below

Eco Hero Program – Nusa Penida
Welcome to the Eco Hero Program! Based in beautiful Nusa Penida, Bali, our marine research and conservation center is dedicated to protecting the underwater world. We train passionate divers to become true champions of marine conservation, with hands-on research involving magnificent megafauna like manta rays and sea turtles. By joining us, you are directly contributing to vital ecological education and sustainable ocean practices.

Frequently Asked Questions
What is the Eco Hero program? Eco Hero is a premier, non-profit marine research and conservation program based in Nusa Penida. We offer a specialized Scientific Diver internship focused on training divers to research, protect, and preserve crucial marine ecosystems, with a special emphasis on manta rays, turtles, and coral reefs.

What is the mission of the program? Our mission is simple: to protect and preserve the underwater world. We equip divers with the essential skills, knowledge, and hands-on experience needed to champion marine conservation. We believe true conservation lies in minimizing human interference and empowering nature to thrive.

What activities will I participate in? Our volunteers dive straight into impactful, hands-on activities, including:
Marine Research & Data Collection: Conduct daily population and identification tracking for manta rays, turtles, and fish.
Coral Conservation: Learn coral identification and take part in our active propagation programs, including coral roving, repositioning, and rehabilitation.
Environmental Cleanup: Lead and participate in regular Dive Against Debris and beach cleanups.
Community Engagement: Drive citizen science projects, outreach campaigns, and help local children build their futures by teaching basic English.

What are the requirements to join? To ensure the best experience and safety for our research team, volunteers must meet the following:
Age: 18 years old or above.
Certification: Hold a minimum of a valid Open Water diving license.
Language: Basic to conversational English proficiency.
Mindset: Have a conservation-minded, outgoing personality ready to make everlasting memories.
(A high school education in Biology or a related field is preferred, alongside a valid passport, dive license, dive/travel insurance, and the appropriate Indonesian visa).

What is included in the program? While inclusions scale with your chosen package, every Eco Hero receives:
World-Class Diving & Training: A set number of conservation dives, Science Research Methodology training (ranging from 8 to 35 hours), and access to our science programs (Manta, Turtle, and Coral ID).
Accommodation & Meals: Shared accommodation (with options at the Sanctum Hotel Nusa Penida) and a healthy vegetarian lunch on all project days.
Exclusive Perks: An official Eco Hero Certificate and program T-shirt to commemorate your journey.

What is not included? To keep our base contributions affordable and directly focused on conservation efforts, the following are not included: flights, airport transfers, travel/dive insurance, Indonesian visa costs, dive computers (available for rent), advanced dive certifications (unless specified), and vaccinations.

Where will I be staying? Accommodation is provided at the Sanctum Hotel Nusa Penida (or similar high-quality partners like Krusty Bungalow). You'll enjoy premium amenities, including air conditioning, fast internet, comfortable beds, and swimming pool access. Shared rooms are standard, with private upgrades available. A communal kitchen is also available for your convenience.

Updated Conservation Packages
As a non-profit, we rely on these affordable contributions to sustain our operations. 100% of funding goes directly toward diving costs, boat rentals, marine scientist fees, ocean structures, and housing.

1-Week Program – $560 USD
6x Dives
Science Program (Manta ID, Turtle ID, Coral ID)
Coral Restoration Monitoring
Science Research Methodology (8 hours)
Dive Against Debris & Beach Clean-up
Lunch on project days, 1-week shared accommodation, Eco Hero Certificate, & T-Shirt

2-Week Program (Option A) – $980 USD
8x Dives
Science Program (Manta ID, Turtle ID, Coral ID, Roving Survey)
Coral Restoration Monitoring
Science Research Methodology (15 hours)
Dive Against Debris & Beach Clean-up
Marine Ecology Certification from SSI
Lunch on project days, 2-week shared accommodation, Eco Hero Certificate, & T-Shirt

2-Week Program (Option B) – $1,155 USD
Includes all items in Option A, but upgraded to 12x Dives for maximum underwater research time.

3-Week Program – $1,497 USD
18x Dives
Science Program (Manta ID, Turtle ID, Coral ID, Roving Survey)
Coral Restoration Monitoring
Science Research Methodology (25 hours)
Underwater Photo Transect Training
Dive & Beach Clean-up
Marine Ecology Certification from SSI
Lunch on project days, 3-week shared accommodation, Eco Hero Certificate, & T-Shirt

4-Week Program – $1,876 USD
24x Dives
Science Program (Manta ID, Turtle ID, Coral ID, Roving Survey)
Coral Restoration Monitoring
Science Research Methodology (35 hours)
Underwater Photo Transect & Invertebrate Survey Training
Dive & Beach Clean-up
Marine Ecology Certification from SSI
Lunch on project days, 4-week shared accommodation, Eco Hero Certificate, & T-Shirt

How to Secure Your Spot
We look forward to saving the ocean with you! To formally reserve your place on the research team, please complete the following steps:
Submit Your Application: Please choose your preferred dates and fill out our official reservation form here: https://docs.google.com/forms/d/e/1FAIpQLSehSoCZCjhHOwrE8awnaKFnH6lQD6UVVls4n9AYUhLJU6g3dQ/viewform?pli=1
Deposit Payment: https://checkout.tab.travel/products?business_code=VLYHZ
Meeting Location: ( Sanctum Dive - Nusa Penida - Bali Diving, Manta diving, Mola Mola the meeting location at Sanctum Dive in Nusa Penida`;

// Object to store conversation history (in-memory)
// Note: In a real production app, you'd want to store this in a database
// mapping chat ID to their message history.
const userSessions = {};

bot.start((ctx) => {
    ctx.reply('Hello! I am the Eco Hero 🌍! How can I help you be more sustainable today?');
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const userMessage = ctx.message.text;
    
    // Initialize session if it doesn't exist
    if (!userSessions[chatId]) {
        userSessions[chatId] = [];
    }
    
    // Add user message to history
    userSessions[chatId].push({ role: 'user', content: userMessage });

    // Ensure we don't exceed a reasonable history length to save tokens
    if (userSessions[chatId].length > 10) {
        userSessions[chatId] = userSessions[chatId].slice(-10);
    }
    
    // Send a typing indicator
    ctx.sendChatAction('typing');

    try {
        let replyText = '';
        const provider = process.env.AI_PROVIDER || 'gemini';

        if (provider === 'deepseek') {
            const completion = await deepseek.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: SYSTEM_INSTRUCTION },
                    ...userSessions[chatId]
                ]
            });
            replyText = completion.choices[0].message.content;
        } else {
            // Default to Gemini
            const geminiHistory = userSessions[chatId].map(msg => ({
                role: msg.role === 'assistant' ? 'model' : msg.role,
                parts: [{ text: msg.content }]
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: geminiHistory,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                }
            });
            replyText = response.text;
        }
        
        // Add model response to history
        userSessions[chatId].push({ role: 'assistant', content: replyText });

        ctx.reply(replyText);
    } catch (error) {
        console.error('Error generating response from Gemini:', error);
        ctx.reply('Oops! My eco-circuits got tangled 🌿. Please try again later.');
    }
});

// Setup Webhook or Long Polling
const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // Render automatically provides this variable

if (RENDER_URL) {
    // We are on Render, use Webhook!
    // Tell Telegram to send messages to our Render URL
    bot.telegram.setWebhook(`${RENDER_URL}/webhook`);
    
    // Tell Express to pass incoming webhook requests to Telegraf
    app.use(bot.webhookCallback('/webhook'));
    
    // A simple health check route
    app.get('/', (req, res) => {
        res.send('Eco Hero Telegram Bot is online via Webhook! 🌍♻️');
    });

    app.listen(port, () => {
        console.log(`Express server listening on port ${port} (Webhook mode)`);
    });
} else if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here') {
    // We are running locally, use Long Polling!
    bot.launch();
    console.log('Eco Hero Telegram Bot is running locally! (Long Polling mode) 🌍');
    
    app.get('/', (req, res) => {
        res.send('Eco Hero Telegram Bot is online locally! 🌍♻️');
    });

    app.listen(port, () => {
        console.log(`Express health-check server listening on port ${port}`);
    });
} else {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set in .env file. Bot is not running.');
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
