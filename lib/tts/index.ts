// Swap providers here. Anything implementing TTSProvider works.
import { elevenlabs } from './elevenlabs';
export interface TTSOptions { voiceId: string; speed: number }
export interface TTSProvider { synthesize(text: string, o: TTSOptions): Promise<Buffer> }
export const tts: TTSProvider = elevenlabs;
