// Import des dépendances nécessaires
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';
import webpush from 'web-push';
import { getSubscriptions, removeSubscription } from '@/lib/subscriptions';

// Configuration de web-push avec les clés VAPID
webpush.setVapidDetails(
  'mailto:e30m52@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialisation du client OpenAI avec la clé API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fonction pour extraire la date du nom de fichier
function extractDateFromFileName(fileName) {
  // Format attendu: L_equipe_du_Mercredi_16_Octobre_2024
  const months = {
    'janvier': '01', 'fevrier': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'aout': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'decembre': '12'
  };

  try {
    const match = fileName.toLowerCase().match(/(\d{1,2})_([a-z]+)_(\d{4})/i);
    if (match) {
      const [_, day, month, year] = match;
      const monthNum = months[month.toLowerCase()];
      if (monthNum) {
        const formattedDay = day.padStart(2, '0');
        return new Date(`${year}-${monthNum}-${formattedDay}T12:00:00.000Z`);
      }
    }
  } catch (error) {
    console.log('Error extracting date from filename:', error);
  }
  
  return new Date(); // Date actuelle par défaut
}

// Fonction pour générer le frontmatter
function generateFrontmatter(title, originalFileName) {
  console.log('Generating frontmatter with title:', title);
  const date = extractDateFromFileName(originalFileName);
  const excerpt = `Article sur ${title.toLowerCase()}`;
  return `---
title: "${title}"
excerpt: "${excerpt}"
coverImage: "/assets/blog/preview/cover.jpg"
date: "${date.toISOString()}"
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
      instructions: `Vous êtes un assistant spécialisé dans la création d'articles de blog sur le tennis à partir de PDF de journaux sportifs.
      Votre tâche est d'extraire et d'analyser le contenu du PDF pour créer un article structuré sur le tennis.
      
      Instructions spécifiques :
      1. Utilisez l'outil file_search pour lire le contenu du PDF
      2. Créez un article avec des titres courts et accrocheurs
      3. Commencez TOUJOURS par un titre principal de niveau 2 en utilisant '## ' (deux dièses suivis d'un espace)
      4. Structurez le contenu de manière journalistique
      5. Ne mentionnez jamais la source ou le PDF dans le contenu
      6. N'utilisez PAS d'astérisques (**) pour les titres
      7. Le titre principal DOIT être de niveau 2 (##), les sous-titres peuvent être de niveau 3 (###)
      8. Le titre principal doit être la première ligne de votre réponse
      9. Ne conservez PAS les références de source comme 【4:14†source】 dans le texte
      10. Réécrivez le contenu avec vos propres mots sans citer les sources

      Exemple exact de la structure attendue :

## Titre Principal Accrocheur
[Introduction captivante sur le sujet principal]

### Les détails importants
[Développement des points clés]

### La conclusion
[Résumé et perspective]`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
  } catch (error) {
    console.error('Error getting/creating assistant:', error);
    throw error;
  }
}

// Fonction pour attendre
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour uploader le fichier avec retries
async function uploadFileWithRetry(filePath, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}...`);
      const fileStream = fs.createReadStream(filePath);
      const fileUpload = await openai.files.create({
        file: fileStream,
        purpose: 'assistants',
      });
      console.log('File uploaded successfully:', fileUpload.id);
      return fileUpload;
    } catch (error) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * (2 ** (attempt - 1)), 8000); // exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await wait(delay);
      }
    }
  }
  
  throw new Error(`Failed to upload file after ${maxRetries} attempts: ${lastError.message}`);
}

// Fonction pour vérifier le statut du run avec timeout
async function checkRunStatus(threadId, runId, maxAttempts = 180) { // 3 minutes max
  let attempts = 0;
  let lastStatus = '';

  while (attempts < maxAttempts) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId, {
      include: ['step_details.tool_calls[*].file_search.results[*].content']
    });
    
    if (runStatus.status !== lastStatus) {
      console.log(`Run status changed to: ${runStatus.status}`);
      lastStatus = runStatus.status;
    }

    switch (runStatus.status) {
      case 'completed':
        return runStatus;
      case 'failed':
      case 'expired':
      case 'cancelled':
        throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error || 'No error details'}`);
      case 'requires_action':
        console.log('Run requires action:', runStatus.required_action);
        break;
      default:
        // in_progress, queued, etc.
        if (attempts % 10 === 0) { // Log every 10 attempts
          console.log(`Still waiting... Status: ${runStatus.status} (${attempts}/${maxAttempts})`);
        }
    }

    attempts++;
    await wait(1000); // Wait 1 second between checks
  }

  throw new Error(`Timeout after ${maxAttempts} seconds. Last status: ${lastStatus}`);
}

// Fonction pour envoyer une notification pour un nouvel article
async function notifyNewArticle(title, excerpt) {
  const subscriptions = getSubscriptions();
  const notifications = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: `Nouvel Article : ${title}`,
          body: excerpt || 'Un nouvel article vient d\'être publié !'
        })
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      if (error.statusCode === 410) {
        removeSubscription(subscription.endpoint);
      }
    }
  });

  await Promise.all(notifications);
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

    // Upload du fichier vers OpenAI avec retries
    console.log('Uploading file to OpenAI...');
    try {
      fileUpload = await uploadFileWithRetry(tempPath);
      console.log('File uploaded to OpenAI:', fileUpload.id);
    } catch (error) {
      console.error('Error uploading to OpenAI:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to OpenAI. Please try again.' },
        { status: 500 }
      );
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
          content: "Créez un article sur le tennis à partir de ce journal sportif. Utilisez l'outil file_search pour lire le contenu et structurez l'article de manière journalistique.",
          attachments: [{ file_id: fileUpload.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });
    console.log('Thread created:', thread.id);

    // Lancement de l'analyse par l'assistant
    console.log('Starting analysis...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      instructions: "Analysez le PDF et créez un article structuré. Utilisez l'outil file_search pour accéder au contenu."
    });
    console.log('Run created:', run.id);

    try {
      // Attente du résultat avec meilleure gestion du timeout
      console.log('Waiting for completion...');
      const runStatus = await checkRunStatus(thread.id, run.id);
      console.log('Analysis completed successfully');

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

        // Nettoyer les références de source
        const cleanContent = text.value.replace(/【[^】]+】/g, '');
        console.log('Content after cleaning sources:', cleanContent);

        // Extraire le premier titre pour l'utiliser dans le frontmatter
        const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);
        console.log('Lines:', lines);
        
        // Chercher un titre avec #, ##, ### ou **
        let titleLine = lines.find(line => /^#{1,3}\s+/.test(line));
        if (!titleLine) {
          titleLine = lines.find(line => line.startsWith('**') && line.endsWith('**'));
        }
        console.log('Found title line:', titleLine);
        
        if (!titleLine) {
          console.log('No valid title found in response');
          throw new Error('No valid article structure found in response');
        }

        // Extraire le titre sans les #, ## ou ** et les espaces
        const title = titleLine.replace(/^#{1,3}\s*|\*\*/g, '').trim();
        console.log('Final extracted title:', title);

        // Supprimer le titre du contenu car il sera dans le frontmatter
        const contentWithoutTitle = cleanContent.replace(titleLine, '').trim();

        // Générer le contenu complet avec frontmatter
        const fullContent = generateFrontmatter(title, originalName) + contentWithoutTitle;
        
        // Générer le nom du fichier final avec le nom original du PDF
        const date = new Date();
        const sanitizedName = originalName.replace(/\.pdf$/, '');
        const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${sanitizedName}.md`;
        console.log('Generated filename:', fileName);
        
        const outputPath = path.join(process.cwd(), '_posts', fileName);
        console.log('Writing to:', outputPath);
        fs.writeFileSync(outputPath, fullContent, 'utf8');
        console.log('File written successfully');

        // Créer l'extrait pour la notification
        const articleExcerpt = `Article sur ${title.toLowerCase()}`;

        // Envoyer une notification pour le nouvel article
        await notifyNewArticle(title, articleExcerpt);

        return NextResponse.json({
          result: fullContent,
          fileName: fileName
        });
      }

      // Renvoi du résultat simple si pas de citations
      return NextResponse.json({ result: content.text.value });
    } catch (error) {
      console.error('Error processing run:', error);
      return NextResponse.json(
        { error: `Error processing run: ${error.message}` },
        { status: 500 }
      );
    }
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