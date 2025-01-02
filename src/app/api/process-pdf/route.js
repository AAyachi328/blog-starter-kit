// Import des dépendances nécessaires
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

// Initialisation du client OpenAI avec la clé API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fonction pour générer le frontmatter
function generateFrontmatter(title) {
  console.log('Generating frontmatter with title:', title);
  const date = new Date().toISOString();
  return `---
title: "${title}"
excerpt: "Article généré à partir d'un PDF"
coverImage: "/assets/blog/preview/cover.jpg"
date: "${date}"
author:
  name: "Sarah Chen"
  picture: "/assets/blog/authors/jj.jpeg"
ogImage:
  url: "/assets/blog/preview/cover.jpg"
---\n\n`;
}

// Fonction pour obtenir ou créer un assistant OpenAI
async function getOrCreateAssistant() {
  try {
    console.log('Fetching assistants list...');
    const assistants = await openai.beta.assistants.list();
    const pdfAnalyzer = assistants.data.find(assistant => 
      assistant.name === "PDF Analyzer"
    );

    if (pdfAnalyzer) {
      console.log('Found existing assistant:', pdfAnalyzer.id);
      return pdfAnalyzer;
    }

    console.log('Creating new assistant...');
    return await openai.beta.assistants.create({
      name: "PDF Analyzer",
      instructions: `Vous êtes un assistant spécialisé dans la création d'articles de blog à partir de PDF de journaux sportifs.
      Votre tâche est d'extraire et d'analyser le contenu du PDF pour créer un article structuré.
      
      Instructions spécifiques :
      1. Utilisez l'outil file_search pour lire le contenu du PDF
      2. Créez un article avec des titres courts et accrocheurs
      3. Commencez TOUJOURS par un titre de niveau 2 (##)
      4. Structurez le contenu de manière journalistique
      5. Ne mentionnez jamais la source ou le PDF dans le contenu, exemple : 【4:14†source】

      Exemple exact de la structure attendue :

## Titre Principal Accrocheur
[Introduction captivante sur le sujet principal]

### Les détails importants
[Développement des points clés]

## La conclusion
[Résumé et perspective]`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
  } catch (error) {
    console.error('Error getting/creating assistant:', error);
    throw error;
  }
}

// Gestionnaire de route POST pour l'API
export async function POST(request) {
  let tempPath = null;
  let fileUpload = null;
  
  try {
    console.log('Starting PDF processing...');
    const data = await request.formData();
    const file = data.get('pdf');

    // Vérification détaillée du fichier
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No PDF file uploaded' },
        { status: 400 }
      );
    }

    // Log des informations du fichier
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      console.log('Empty file received');
      return NextResponse.json(
        { error: 'The file is empty' },
        { status: 400 }
      );
    }

    // Création du dossier temporaire s'il n'existe pas
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      console.log('Creating temp directory:', tempDir);
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Sauvegarde temporaire du fichier PDF avec un nom unique
    const uniqueId = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const tempFileName = `${uniqueId}-${originalName}`;
    tempPath = path.join(tempDir, tempFileName);
    
    try {
      const bytes = await file.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) {
        throw new Error('Empty file buffer');
      }
      console.log('File buffer size:', bytes.byteLength);
      
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(tempPath, buffer);
      console.log('Temporary file saved:', tempPath, 'Size:', buffer.length);

      // Vérifier que le fichier a bien été écrit
      const stats = fs.statSync(tempPath);
      console.log('Saved file size:', stats.size);

      if (stats.size === 0) {
        throw new Error('File was saved but is empty');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json(
        { error: 'Failed to process the uploaded file' },
        { status: 500 }
      );
    }

    // Upload du fichier vers OpenAI avec un nouveau stream
    console.log('Uploading file to OpenAI...');
    let fileStream;
    try {
      fileStream = fs.createReadStream(tempPath);
      fileUpload = await openai.files.create({
        file: fileStream,
        purpose: 'assistants',
      });
      console.log('File uploaded to OpenAI:', fileUpload.id);
    } catch (error) {
      console.error('Error uploading to OpenAI:', error);
      throw error;
    } finally {
      if (fileStream) {
        fileStream.destroy();
      }
    }

    // Récupération ou création de l'assistant
    const assistant = await getOrCreateAssistant();
    console.log('Using assistant:', assistant.id);

    // Création d'un thread avec le message initial et le fichier attaché
    console.log('Creating thread...');
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Créez un article à partir de ce journal sportif. Utilisez l'outil file_search pour lire le contenu et structurez l'article de manière journalistique.",
          attachments: [{ file_id: fileUpload.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });
    console.log('Thread created:', thread.id);

    // Lancement de l'analyse par l'assistant
    console.log('Starting analysis...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
      //additional_instructions: "Utilisez l'outil file_search pour analyser le contenu du PDF et fournir un résumé détaillé.",
    });
    console.log('Run created:', run.id);

    // Attente et vérification de la complétion de l'analyse
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60; // 60 secondes maximum d'attente

    console.log('Waiting for completion...');
    // Boucle de polling pour vérifier l'état de l'analyse
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attente d'1 seconde entre chaque vérification
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, {
        include: ['step_details.tool_calls[*].file_search.results[*].content']
      });
      attempts++;
      console.log(`Status check ${attempts}: ${runStatus.status}`);

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
    console.log('Getting messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    // Vérification de la présence d'une réponse
    if (!lastMessage || !lastMessage.content || !lastMessage.content[0]) {
      throw new Error('No response from assistant');
    }

    // Traitement de la réponse et création du fichier markdown
    console.log('Processing response...');
    const content = lastMessage.content[0];
    if (content.type === 'text') {
      const { text } = content;
      
      // Log de la réponse brute pour déboguer
      console.log('Raw response:', text.value);
      
      // Vérifier si la réponse contient un message d'erreur
      if (text.value.includes("n'arrive pas à extraire") || text.value.includes("plus de détails")) {
        console.log('Assistant could not read the file content');
        
        // Créer un article par défaut
        const defaultContent = `## Article en cours de traitement
        
Le contenu de cet article est en cours de préparation. Merci de votre patience.

### Mise à jour à venir
Le contenu sera bientôt disponible avec tous les détails.`;
        
        const title = "Article en cours de traitement";
        const fullContent = generateFrontmatter(title) + defaultContent;
        
        // Générer le nom du fichier
        const date = new Date();
        const sanitizedName = originalName.replace(/\.pdf$/, '');
        const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${sanitizedName}.md`;
        
        const outputPath = path.join(process.cwd(), '_posts', fileName);
        fs.writeFileSync(outputPath, fullContent, 'utf8');
        
        return NextResponse.json({
          result: fullContent,
          fileName: fileName
        });
      }

      // Extraire le premier titre pour l'utiliser dans le frontmatter
      const lines = text.value.split('\n');
      const titleLine = lines.find(line => line.trim().startsWith('## '));
      
      if (!titleLine) {
        console.log('No valid title found in response, using default title');
        const title = "Article en cours de traitement";
        const fullContent = generateFrontmatter(title) + text.value;
        
        const date = new Date();
        const sanitizedName = originalName.replace(/\.pdf$/, '');
        const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${sanitizedName}.md`;
        
        const outputPath = path.join(process.cwd(), '_posts', fileName);
        fs.writeFileSync(outputPath, fullContent, 'utf8');
        
        return NextResponse.json({
          result: fullContent,
          fileName: fileName
        });
      }

      const title = titleLine.replace(/^##\s*/, '').trim();
      console.log('Extracted title:', title);

      // Générer le contenu complet avec frontmatter
      const fullContent = generateFrontmatter(title) + text.value;
      
      // Générer le nom du fichier final avec le nom original du PDF
      const date = new Date();
      const sanitizedName = originalName.replace(/\.pdf$/, '');
      const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${sanitizedName}.md`;
      console.log('Generated filename:', fileName);
      
      const outputPath = path.join(process.cwd(), '_posts', fileName);
      console.log('Writing to:', outputPath);
      fs.writeFileSync(outputPath, fullContent, 'utf8');
      console.log('File written successfully');

      return NextResponse.json({
        result: fullContent,
        fileName: fileName
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
    // Nettoyage des fichiers
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        console.log('Cleaning up temp file:', tempPath);
        fs.unlinkSync(tempPath);
        console.log('Temp file cleanup successful');
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
    
    // Nettoyage du fichier sur OpenAI
    if (fileUpload) {
      try {
        console.log('Cleaning up OpenAI file:', fileUpload.id);
        await openai.files.del(fileUpload.id);
        console.log('OpenAI file cleanup successful');
      } catch (error) {
        console.error('Error cleaning up OpenAI file:', error);
      }
    }
  }
}