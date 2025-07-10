// import OpenAI from 'openai';
// import multer from 'multer';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Configure OpenAI with explicit API key
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY
// });

// // Configure Multer for file uploads
// const storage = multer.diskStorage({
//     destination: './uploads/',
//     filename: function (req, file, cb) {
//         cb(null, 'image-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10000000 } // 10MB limit
// });

// export const chat = async (req, res) => {
//     try {
//         const userMessage = req.body.message;

//         const completion = await openai.chat.completions.create({
//             model: "gpt-3.5-turbo",
//             messages: [
//                 {
//                     "role": "system",
//                     "content": "You are a helpful assistant."
//                 },
//                 {
//                     "role": "user",
//                     "content": userMessage
//                 }
//             ],
//             max_tokens: 150
//         });

//         const botResponse = completion.choices[0].message.content;

//         res.json({
//             response: botResponse
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({
//             error: 'Something went wrong'
//         });
//     }
// };

// export const uploadImage = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No image file uploaded' });
//         }

//         const imageUrl = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
//         res.json({
//             success: true,
//             imageUrl: imageUrl
//         });
//     } catch (error) {
//         console.error('Error uploading image:', error);
//         res.status(500).json({ error: 'Failed to upload image' });
//     }
// };

// export const analyzeImage = async (req, res) => {
//     try {
//         res.json({
//             response: "I can see the image you uploaded. What would you like to know about it?"
//         });
//     } catch (error) {
//         console.error('Error analyzing image:', error);
//         res.status(500).json({ error: 'Failed to analyze image' });
//     }
// }; 


import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate essential environment variables
if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set in environment variables. Chat functionality will not work.');
}

// Configure Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'image-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // 10MB limit
});

export const chat = async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
            console.error('Gemini API key is missing or empty');
            return res.status(400).json({
                error: 'Gemini API key is not configured properly. Please add a valid API key to the .env file.'
            });
        }

        try {
            // Initialize the Gemini API with the key
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            // For Gemini, we use the gemini-1.5-flash model
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Start a chat session
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: "Hello, you are a helpful assistant." }] },
                    { role: "model", parts: [{ text: "I'm a helpful assistant ready to provide information and assistance." }] }
                ],
                generationConfig: {
                    maxOutputTokens: 2048,
                },
            });

            // Send the message and get a response
            const result = await chat.sendMessage(userMessage);
            const botResponse = await result.response;
            const textResponse = botResponse.text();

            res.json({
                response: textResponse
            });
        } catch (apiError) {
            console.error('Gemini API Error:', apiError.message);
            
            // Check if it's an authentication error
            if (apiError.message && apiError.message.toLowerCase().includes('auth')) {
                return res.status(401).json({
                    error: 'Authentication error with Gemini API. Your API key may be invalid or expired.'
                });
            }
            
            // Handle rate limiting
            if (apiError.message && apiError.message.toLowerCase().includes('rate')) {
                return res.status(429).json({
                    error: 'Rate limit exceeded. Please try again later.'
                });
            }
            
            // Handle internal server errors from the API
            if (apiError.message && apiError.message.toLowerCase().includes('internal')) {
                return res.status(500).json({
                    error: 'Gemini API internal error. This is an issue with the API service, not your code.'
                });
            }
            
            // Handle other API errors with a specific message
            return res.status(500).json({
                error: `Gemini API error: ${apiError.message}`
            });
        }
    } catch (error) {
        console.error('Error in chat controller:', error);
        res.status(500).json({
            error: error.message || 'Something went wrong'
        });
    }
};

export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        // Use a fallback URL if BACKEND_URL is not defined
        const backendUrl = process.env.BACKEND_URL || 'https://campus-connect-1-b62l.onrender.com';
        
        // Validate that we have a Gemini API key before proceeding
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
            console.error('Gemini API key is missing or empty');
            return res.status(400).json({
                error: 'Gemini API key is not configured properly. Please add a valid API key to the .env file.'
            });
        }
        const imageUrl = `${backendUrl}/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
};

export const analyzeImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'No image URL provided' });
        }
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
            console.error('Gemini API key is missing or empty');
            return res.status(400).json({
                error: 'Gemini API key is not configured properly. Please add a valid API key to the .env file.'
            });
        }
        
        // Initialize the Gemini API with the key
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        try {
            // For image analysis, we use the gemini-1.5-flash model which supports vision capabilities
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // Fetch the image data
            const imageResponse = await fetch(imageUrl);
            const imageData = await imageResponse.arrayBuffer();
            
            // Convert to base64
            const base64Image = Buffer.from(imageData).toString('base64');
            
            // Generate content with the image
            const result = await model.generateContent([
                "Describe this image in detail",
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg"
                    }
                }
            ]);
            
            const response = await result.response;
            const textResponse = response.text();
            
            res.json({
                response: textResponse
            });
        } catch (apiError) {
            console.error('Gemini API Error during image analysis:', apiError.message);
            return res.status(500).json({
                error: apiError.message || 'Error analyzing image with Gemini API'
            });
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze image' });
    }
};