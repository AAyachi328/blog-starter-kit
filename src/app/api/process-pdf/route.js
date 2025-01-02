import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to get or create an assistant
async function getOrCreateAssistant() {
  try {
    const assistants = await openai.beta.assistants.list();
    const pdfAnalyzer = assistants.data.find(assistant => 
      assistant.name === "PDF Analyzer"
    );

    if (pdfAnalyzer) {
      return pdfAnalyzer;
    }

    return await openai.beta.assistants.create({
      name: "PDF Analyzer",
      instructions: "Vous êtes un assistant spécialisé dans l'analyse de documents PDF. Votre tâche est de lire les PDF soumis et d'en fournir une analyse détaillée et structurée.",
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
  } catch (error) {
    console.error('Error getting/creating assistant:', error);
    throw error;
  }
}

export async function POST(request) {
  let tempPath = null;
  
  try {
    const data = await request.formData();
    const file = data.get('pdf');

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file uploaded' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Save the file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = path.join(tempDir, file.name);
    fs.writeFileSync(tempPath, buffer);

    // Upload the file to OpenAI
    const fileUpload = await openai.files.create({
      file: fs.createReadStream(tempPath),
      purpose: 'assistants',
    });

    // Get or create the assistant
    const assistant = await getOrCreateAssistant();

    // Create a thread with the initial message and file attachment
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Pouvez-vous analyser ce PDF et me donner un résumé détaillé ?",
          attachments: [{ file_id: fileUpload.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });

    // Create and run the assistant with step details included
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Utilisez l'outil file_search pour analyser le contenu du PDF et fournir un résumé détaillé.",
    });

    // Poll for the run completion and include step details
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60;

    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, {
        include: ['step_details.tool_calls[*].file_search.results[*].content']
      });
      attempts++;

      if (runStatus.status === 'failed' || runStatus.status === 'expired') {
        throw new Error(`Assistant run ${runStatus.status}`);
      }
    } while (runStatus.status !== 'completed' && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for assistant response');
    }

    // Get the messages with citations
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || !lastMessage.content || !lastMessage.content[0]) {
      throw new Error('No response from assistant');
    }

    // Process the response with citations if available
    const content = lastMessage.content[0];
    if (content.type === 'text') {
      const { text } = content;
      const citations = [];

      if (text.annotations) {
        let index = 0;
        for (const annotation of text.annotations) {
          text.value = text.value.replace(annotation.text, `[${index}]`);
          if (annotation.file_citation) {
            const citedFile = await openai.files.retrieve(annotation.file_citation.file_id);
            citations.push(`[${index}] ${citedFile.filename}`);
          }
          index++;
        }
      }

      return NextResponse.json({
        result: text.value,
        citations: citations.length > 0 ? citations : undefined
      });
    }

    return NextResponse.json({ result: content.text.value });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: `Error processing PDF: ${error.message}` },
      { status: 500 }
    );
  } finally {
    // Clean up the temp file
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
  }
} 