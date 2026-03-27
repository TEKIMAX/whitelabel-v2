
const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || '47625884-6993c1266ea586561e1b814df'; // Fallback to a demo key if available or empty string
const API_URL = 'https://pixabay.com/api/';

interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  // Add other properties if needed
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export const searchPixabayImages = async (query: string): Promise<string[]> => {
  if (!PIXABAY_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_URL}?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=20`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch images from Pixabay');
    }

    const data: PixabayResponse = await response.json();
    return data.hits.map((hit) => hit.webformatURL);
  } catch (error) {
    return [];
  }
};
