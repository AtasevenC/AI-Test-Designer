
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE } from '../constants';
import type { FormState } from '../types';

export const generateTestCases = async (inputs: FormState): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    if (!inputs.userStory.trim()) {
        throw new Error("User Story cannot be empty.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `${PROMPT_TEMPLATE}\n\nHere is the user's input:\nUSER_STORY: ${inputs.userStory}\nSYSTEM_UNDER_TEST_URL: ${inputs.systemUrl}\nTEST_FOCUS: ${inputs.testFocus}\nDETAIL_LEVEL: ${inputs.detailLevel}\n\nPlease generate the output now.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    });
    
    return response.text;
};
