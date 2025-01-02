// Import des dépendances nécessaires
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

// Initialisation du client OpenAI avec la clé API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fonction pour obtenir ou créer un assistant OpenAI
async function getOrCreateAssistant() {
  try {
    // Récupération de la liste des assistants existants
    const assistants = await openai.beta.assistants.list();
    // Recherche d'un assistant existant nommé "PDF Analyzer"
    const pdfAnalyzer = assistants.data.find(assistant => 
      assistant.name === "PDF Analyzer"
    );

    // Si l'assistant existe déjà, on le retourne
    if (pdfAnalyzer) {
      return pdfAnalyzer;
    }

    // Sinon, on crée un nouvel assistant
    return await openai.beta.assistants.create({
      name: "PDF Analyzer",
      instructions: "Vous êtes un assistant spécialisé dans l'analyse de documents PDF. Votre tâche est de lire les PDF soumis et d'en fournir une analyse détaillée et structurée.",
      model: "gpt-4o",
      tools: [{ type: "file_search" }] // Activation de l'outil de recherche dans les fichiers
    });
  } catch (error) {
    console.error('Error getting/creating assistant:', error);
    throw error;
  }
}

// Gestionnaire de route POST pour l'API
export async function POST(request) {
  let tempPath = null; // Variable pour stocker le chemin du fichier temporaire
  
  try {
    // Récupération des données du formulaire
    const data = await request.formData();
    const file = data.get('pdf');

    // Vérification de la présence d'un fichier
    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file uploaded' },
        { status: 400 }
      );
    }

    // Création du dossier temporaire s'il n'existe pas
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Sauvegarde temporaire du fichier PDF
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = path.join(tempDir, file.name);
    fs.writeFileSync(tempPath, buffer);

    // Upload du fichier vers OpenAI
    const fileUpload = await openai.files.create({
      file: fs.createReadStream(tempPath),
      purpose: 'assistants', // Spécifie que le fichier sera utilisé avec les assistants
    });

    // Récupération ou création de l'assistant
    const assistant = await getOrCreateAssistant();

    // Création d'un thread avec le message initial et le fichier attaché
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Pouvez-vous analyser ce PDF et me donner un résumé détaillé ?",
          attachments: [{ file_id: fileUpload.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });

    // Lancement de l'analyse par l'assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      additional_instructions: "Utilisez l'outil file_search pour analyser le contenu du PDF et fournir un résumé détaillé.",
    });

    // Attente et vérification de la complétion de l'analyse
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60; // 60 secondes maximum d'attente

    // Boucle de polling pour vérifier l'état de l'analyse
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attente d'1 seconde entre chaque vérification
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, {
        include: ['step_details.tool_calls[*].file_search.results[*].content']
      });
      attempts++;

      // Vérification des erreurs potentielles
      if (runStatus.status === 'failed' || runStatus.status === 'expired') {
        throw new Error(`Assistant run ${runStatus.status}`);
      }
    } while (runStatus.status !== 'completed' && attempts < maxAttempts);

    // Vérification du timeout
    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for assistant response');
    }

    // Récupération des messages et du résultat
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    // Vérification de la présence d'une réponse
    if (!lastMessage || !lastMessage.content || !lastMessage.content[0]) {
      throw new Error('No response from assistant');
    }

    // Traitement de la réponse et des citations
    const content = lastMessage.content[0];
    if (content.type === 'text') {
      const { text } = content;
      const citations = [];

      // Traitement des annotations et citations
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

      // Renvoi du résultat avec les citations
      return NextResponse.json({
        result: text.value,
        citations: citations.length > 0 ? citations : undefined
      });
    }

    // Renvoi du résultat simple si pas de citations
    return NextResponse.json({ result: content.text.value });
  } catch (error) {
    // Gestion des erreurs
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: `Error processing PDF: ${error.message}` },
      { status: 500 }
    );
  } finally {
    // Nettoyage : suppression du fichier temporaire
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
  }
}