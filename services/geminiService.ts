
import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts an 8x8 grid of chess pieces into a FEN string.
 */
const gridToFen = (grid: (string | null)[][]): string => {
  let fenRows = [];
  for (let row of grid) {
    let fenRow = "";
    let emptyCount = 0;
    for (let square of row) {
      if (square === null || square === "" || square.toLowerCase() === "empty") {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fenRow += emptyCount;
          emptyCount = 0;
        }
        fenRow += square;
      }
    }
    if (emptyCount > 0) fenRow += emptyCount;
    fenRows.push(fenRow);
  }
  return fenRows.join('/') + " w KQkq - 0 1";
};

export const detectChessPosition = async (base64Image: string): Promise<string> => {
  try {
    // Generate content using the recommended model for complex coding/vision tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            },
            {
              text: `Act as a High-Precision Chess Vision System. 

CRITICAL INSTRUCTION:
First, verify if the image contains a clear 8x8 chessboard.
- If NO chessboard is found, or if the board is extremely blurry, cut off, or unclear, return exactly: {"error": "NO_BOARD"}
- If a chessboard is found, perform the following:

PIECE STYLE (FLAT VECTOR REFERENCE):
- BOARD: Modern flat style.
- WHITE PIECES: Pure white fill, black bold outlines.
- BLACK PIECES: Dark charcoal/gray fill, black bold outlines.

TASK:
1. Scan the 8x8 grid (a8 through h1).
2. For each square, identify the piece or mark it as null.
3. Return the result as a raw 8x8 JSON array of FEN characters:
   White: P, N, B, R, Q, K
   Black: p, n, b, r, q, k
   Empty: null

OUTPUT: Only return the JSON array or the error JSON object.`
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("No response returned from vision model");

    const result = JSON.parse(text);
    
    // Explicitly check for the error signal from the AI model
    if (result && typeof result === 'object' && result.error === "NO_BOARD") {
        throw new Error("NO_BOARD_FOUND");
    }

    if (!Array.isArray(result) || result.length !== 8) {
      throw new Error("Vision core failed to produce a valid 8x8 grid");
    }

    return gridToFen(result);
  } catch (error: any) {
    // Propagate the specific board-not-found error so the UI can show the custom popup
    if (error.message === "NO_BOARD_FOUND") throw error;
    console.error("Gemini Vision Mapping Error:", error);
    throw new Error("GENERAL_DETECTION_ERROR");
  }
};
