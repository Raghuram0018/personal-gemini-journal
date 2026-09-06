import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Book, BookReadingSession, BookHighlight, BookJournalLink, BookGoalLink } from '../../types';
import { searchBundledBooks, getBundledBooks, BundledBookData } from '../../data/bundledBooks';

// Convert BundledBookData to Book type format for Shelf & Reader
export function convertBundledBookToBook(bundled: BundledBookData, uid: string = 'guest'): Book {
  return {
    id: bundled.id,
    userId: uid,
    title: bundled.title,
    authors: bundled.authors,
    categories: bundled.categories,
    description: bundled.description,
    coverUrl: bundled.coverUrl,
    publisher: bundled.publisher,
    publishedDate: bundled.publishedDate,
    publicDomain: true,
    pageCount: bundled.pageCount,
    chapters: bundled.chapters,
    currentChapterIndex: 0,
    readingPosition: 0,
    readingStatus: 'want_to_read',
    progress: 0,
    currentPage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
    learnings: [],
    readingSessions: [],
    highlights: [],
    journalLinks: [],
    goalLinks: [],
  };
}

// Fetch all books for the authenticated user from Firestore
export async function getBooksForUser(uid: string): Promise<Book[]> {
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'books');
    const snapshot = await getDocs(ref);
    
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Find matching bundled book to ensure chapters exist if not persisted in doc
        const bundledMatch = getBundledBooks().find(b => b.id === doc.id || b.id === data.externalId);

        return {
          id: doc.id,
          userId: uid,
          title: data.title || (bundledMatch?.title || ''),
          authors: data.authors || (bundledMatch?.authors || []),
          categories: data.categories || (bundledMatch?.categories || []),
          readingStatus: data.readingStatus || 'want_to_read',
          progress: data.progress || 0,
          currentPage: data.currentPage || 0,
          pageCount: data.pageCount || (bundledMatch?.pageCount || 100),
          externalId: data.externalId || doc.id,
          isbn: data.isbn,
          description: data.description || (bundledMatch?.description || ''),
          coverUrl: data.coverUrl || (bundledMatch?.coverUrl || ''),
          publisher: data.publisher || (bundledMatch?.publisher || 'Public Domain'),
          publishedDate: data.publishedDate || (bundledMatch?.publishedDate || ''),
          publicDomain: true,
          chapters: data.chapters || (bundledMatch?.chapters || []),
          currentChapterIndex: data.currentChapterIndex !== undefined ? data.currentChapterIndex : 0,
          readingPosition: data.readingPosition || 0,
          notes: data.notes || [],
          learnings: data.learnings || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          completedAt: data.completedAt,
          rating: data.rating,
          review: data.review,
          keyLearnings: data.keyLearnings || [],
          readingSessions: data.readingSessions || [],
          highlights: data.highlights || [],
          journalLinks: data.journalLinks || [],
          goalLinks: data.goalLinks || [],
          futureMoodLinks: data.futureMoodLinks || [],
          futureMemoryLinks: data.futureMemoryLinks || []
        } as Book;
      });
    }

    return [];
  } catch (err) {
    console.error('[booksService] Firestore getBooksForUser error:', err);
    return [];
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleanObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj;
  }
  return obj;
}

// Save or Update a single Book in Firestore
export async function saveBook(uid: string, book: Book): Promise<void> {
  if (!uid || !book.id) return;
  try {
    let updatedBook = {
      ...book,
      userId: uid,
      updatedAt: new Date().toISOString()
    };
    
    // Deep sanitize to remove all undefined values which are rejected by Firestore
    updatedBook = sanitizeForFirestore(updatedBook);

    const docRef = doc(db, 'users', uid, 'books', book.id);
    await setDoc(docRef, updatedBook, { merge: true });
  } catch (err) {
    console.error('[booksService] Firestore saveBook error:', err);
    throw err;
  }
}

// Delete a Book from Firestore
export async function deleteBook(uid: string, bookId: string): Promise<void> {
  if (!uid || !bookId) return;
  try {
    const docRef = doc(db, 'users', uid, 'books', bookId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[booksService] Firestore deleteBook error:', err);
    throw err;
  }
}

// Local Bundled Search (Offline, zero network API dependency)
export function searchBooks(query: string = '', category: string = 'all'): { books: Book[] } {
  const matchedBundled = searchBundledBooks(query, category);
  const books = matchedBundled.map(b => convertBundledBookToBook(b));
  return { books };
}

// Proxied AI Learning Note Generator via backend
export async function generateHighlightLearning(payload: {
  text: string;
  bookTitle: string;
  bookAuthor: string;
}): Promise<{
  mainIdea: string;
  learningTakeaway: string;
  explanation: string;
  tags: string[];
}> {
  try {
    const res = await fetch('/api/books/generate-learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Proxy generate learning returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[booksService] generateHighlightLearning using local fallback:', err);
    return {
      mainIdea: payload.text.slice(0, 60) + '...',
      learningTakeaway: 'Key insight captured from reading session.',
      explanation: `Reflecting on: "${payload.text}"`,
      tags: ['Reading', 'Reflection', 'Core Concept']
    };
  }
}

// Proxied AI Chat Companion via backend
export async function chatAboutBooks(payload: {
  message: string;
  books: Book[];
}): Promise<{
  text: string;
  sources: Array<{ id: string; title: string; type: string; page?: string }>;
}> {
  try {
    const res = await fetch('/api/books/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Proxy chat returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[booksService] chatAboutBooks using local fallback:', err);
    
    // Provide intelligent offline companion response
    const activeBooks = payload.books.map(b => b.title).join(', ');
    return {
      text: `### AI Book Companion (Offline Mode)\n\nI am currently operating offline. I can see you have **${payload.books.length}** book(s) on your shelf${activeBooks ? `: *${activeBooks}*` : ''}.\n\n*Question:* "${payload.message}"\n\nTo explore more about your book's chapters, highlights, and notes, ensure you are connected to the network or continue taking highlights and personal notes in the Reader!`,
      sources: payload.books.slice(0, 2).map(b => ({ id: b.id, title: b.title, type: 'Book' }))
    };
  }
}
