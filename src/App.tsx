import { useState, useEffect } from 'react';
import OpenAI from 'openai';
import './App.css';

export default function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [finalResponse, setFinalResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const highlightKeywords = (text: string) => {
    const keywords = text.match(/\b\w+\b/g) || [];
    return keywords.map(word => ({
      word,
      isKey: word.length > 3 && !['what', 'how', 'why', 'when', 'where', 'which', 'who', 'the', 'and', 'that', 'this'].includes(word.toLowerCase())
    }));
  };

  const generateSuggestions = async () => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "Generate 5 alternative, clearer versions of the following query. Return only the queries, one per line, without any numbering or prefixes."
        }, {
          role: "user",
          content: query
        }],
      });

      const suggestedQueries = response.choices[0].message.content?.split('\n')
        .filter(q => q.trim())
        .map(q => q.replace(/^\d+\.\s*/, '')) || [];
      setSuggestions(suggestedQueries);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(generateSuggestions, 1000);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleProcess = async () => {
    const finalQuery = selectedSuggestion !== null ? suggestions[selectedSuggestion] : query;

    try {
      setIsLoading(true);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: finalQuery
        }],
      });

      setFinalResponse(response.choices[0].message.content || '');
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderHighlightedText = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      const isKeyword = word.length > 3 && 
        !['what', 'how', 'why', 'when', 'where', 'which', 'who', 'the', 'and', 'that', 'this'].includes(word.toLowerCase());
      return isKeyword ? 
        <span key={index} className="keyword">{word}</span> : 
        <span key={index}>{word}</span>;
    });
  };

  return (
    <main className="container">
      <h1>AI Query Assistant</h1>
      <div className="query-input">
        <div className="input-wrapper">
          <div className="highlighted-input" aria-hidden="true">
            {renderHighlightedText(query)}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query..."
          />
        </div>
        <button onClick={handleProcess} disabled={isLoading}>
          Process Query
        </button>
      </div>

      {isLoading && <div className="loading">Generating suggestions...</div>}

      {suggestions.length > 0 && (
        <div className="suggestions">
          <h2>Suggested Queries:</h2>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion ${selectedSuggestion === index ? 'selected' : ''}`}
              onClick={() => {
                setSelectedSuggestion(index);
                setQuery(suggestion);
              }}
            >
              {renderHighlightedText(suggestion)}
            </div>
          ))}
        </div>
      )}

      {finalResponse && (
        <div className="response">
          <h2>Response:</h2>
          <p>{finalResponse}</p>
        </div>
      )}
    </main>
  );
}