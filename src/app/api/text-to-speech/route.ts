import { NextResponse } from 'next/server';
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { getPostBySlug } from '@/lib/api';

type Voice = 'alloy' | 'onyx';

export async function POST(request: Request) {
  try {
    const { slug, voice = 'onyx' } = await request.json();
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const post = getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const speechFile = path.resolve(`./public/audio/${slug}-${voice}.mp3`);
    
    // Ensure the audio directory exists
    const audioDir = path.resolve("./public/audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as Voice,
      input: post.content.slice(0, 4096), // OpenAI has a limit on input length
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    return NextResponse.json({ 
      success: true, 
      audioUrl: `/audio/${slug}-${voice}.mp3` 
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
} 