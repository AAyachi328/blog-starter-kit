'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UploadPDF() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data.result);
      setFileName(data.fileName || '');
    } catch (error) {
      console.error('Error:', error);
      setResult('Une erreur est survenue');
      setFileName('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Créer un Article depuis un PDF</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pdf-upload" className="block text-sm font-medium mb-2">
              Sélectionnez un PDF
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
          </div>
          
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Création en cours...' : 'Créer l\'article'}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Article créé :</h2>
              <p className="whitespace-pre-wrap">{result}</p>
            </div>
            
            {fileName && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h2 className="text-xl font-semibold mb-2 text-green-700">Article sauvegardé !</h2>
                <p className="text-green-600">
                  L'article a été créé avec succès : <code className="bg-green-100 px-2 py-1 rounded">{fileName}</code>
                </p>
                <Link 
                  href={`/posts/${fileName.replace('.md', '')}`}
                  className="mt-2 inline-block text-green-700 hover:text-green-800 underline"
                >
                  Voir l'article
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
} 