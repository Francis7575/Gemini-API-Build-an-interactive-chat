import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "console";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
  temperature: 0.25,  // optional, 0.0 always uses the highest-probability result
  topP: 0.95,         // optional, for nucleus sampling decoding strategy
  topK: 40,           // optional, number of most probable tokens to consider for generation
  maxOutputTokens: 8192, // max number of tokens in the output
  responseMimeType: "application/json", // mime type for the response
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const question = url.searchParams.get("question");

  if (!question) {
    return new Response(
      JSON.stringify({ error: "Question is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // let messages = [{ content: question }];
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [{ text: question }],
        },
      ],
    });

    const result = await chatSession.sendMessage(question);
    
    // If the model responds with a result, return it to the client
    if (result && result.response && result.response.text) {
      const modelResponse = result.response.text(); 
      
      // Try to parse the response if it's a JSON string
      let cleanResponse = modelResponse;
      try {
        const parsedResponse = JSON.parse(modelResponse);
        if (typeof parsedResponse === 'object') {
          cleanResponse = Object.values(parsedResponse)[0] as string;  // Get the first value if it's an object
        }
      } catch (e) {
        // If it's not a JSON object, use the raw response text
        cleanResponse = modelResponse;
      }

      return new Response(
        JSON.stringify({
          resp: [
            { user: question },
            { model: cleanResponse }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to generate a response from the model." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error during API request:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing the request." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
