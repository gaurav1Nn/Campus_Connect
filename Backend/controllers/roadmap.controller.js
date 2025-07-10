
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate essential environment variables
if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set in environment variables. Roadmap generation will not work.');
}

export const generateRoadmap = async (req, res) => {
    try {
        const { topic } = req.body;

        // Validate topic input
        if (!topic) {
            return res.status(400).json({
                success: false,
                message: "Topic is required"
            });
        }

        // Validate API key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
            console.error('Gemini API key is missing or empty');
            return res.status(500).json({
                success: false,
                message: 'Gemini API key is not configured properly. Please add a valid API key to the .env file.'
            });
        }

        // Create the prompt
        const prompt = `Generate a comprehensive roadmap for learning ${topic}. Include all necessary topics, concepts, and steps from beginner to advanced levels.

        The roadmap should be structured EXACTLY in this JSON format:
        [
            {
                "title": "${topic} Roadmap",
                "sections": [
                    {
                        "title": "Section Title",
                        "items": [
                            "Item 1",
                            "Item 2"
                        ]
                    }
                ]
            }
        ]
        
        Important: Provide ONLY the JSON array, no markdown, no code blocks, no additional text. Just the raw JSON.`;

        try {
            // Initialize the Gemini API with the key
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            // Use the gemini-1.5-flash model
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Configure the generation
            const generationConfig = {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
            };

            // Start a chat session
            const chat = model.startChat({
                generationConfig,
                history: [
                    { 
                        role: "user", 
                        parts: [{ text: "You are an AI roadmap generator. Always respond with valid JSON arrays containing roadmap data. Never include markdown code blocks or any other text." }] 
                    },
                    { 
                        role: "model", 
                        parts: [{ text: "I'll generate roadmaps in valid JSON format only, without any markdown or additional text." }] 
                    }
                ],
            });

            // Send the message and get a response
            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            let content = response.text();

            // Clean the response to ensure it's valid JSON
            // Remove any markdown code blocks if present
            content = content.replace(/```json\s*/g, '');
            content = content.replace(/```\s*/g, '');
            content = content.trim();

            // Find the JSON array in the content
            const jsonStart = content.indexOf('[');
            const jsonEnd = content.lastIndexOf(']') + 1;
            
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                content = content.substring(jsonStart, jsonEnd);
            }

            try {
                const parsedContent = JSON.parse(content);
                
                // Validate the structure
                if (!Array.isArray(parsedContent)) {
                    throw new Error('Response is not an array');
                }

                res.json({
                    success: true,
                    data: parsedContent
                });
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Raw content:', content);
                
                // Fallback response
                const fallbackRoadmap = [{
                    title: `${topic} Roadmap`,
                    sections: [
                        {
                            title: "Getting Started",
                            items: ["Unfortunately, we couldn't generate a detailed roadmap at this time.", "Please try again later."]
                        }
                    ]
                }];

                res.json({
                    success: true,
                    data: fallbackRoadmap,
                    warning: 'Generated with fallback data due to parsing error'
                });
            }
        } catch (apiError) {
            console.error('Gemini API Error:', apiError);
            
            // Check for specific API errors
            if (apiError.message?.includes('API key')) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid API key'
                });
            }
            
            if (apiError.message?.includes('quota')) {
                return res.status(429).json({
                    success: false,
                    message: 'API quota exceeded. Please try again later.'
                });
            }

            throw apiError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        console.error('Error generating roadmap:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating roadmap',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};