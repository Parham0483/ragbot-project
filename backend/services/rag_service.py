import os
import json
from typing import List, Dict, Optional
from django.conf import settings
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import PyPDF2
from docx import Document as DocxDocument
from django.utils import timezone
from documents.models import Document, DocumentChunk
from chatbots.models import Chatbot


class RAGService:

    def __init__(self):
        # Initialize OpenAI client
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")

        self.client = OpenAI(api_key=api_key)
        self.embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)

        # Text splitter configuration
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,  # Characters per chunk
            chunk_overlap=50,  # Overlap to maintain context
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )


    def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """Extract text from different file types"""
        try:
            if file_type == 'pdf':
                return self._extract_from_pdf(file_path)
            elif file_type == 'docx':
                return self._extract_from_docx(file_path)
            elif file_type in ['txt', 'md']:
                return self._extract_from_text(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            raise Exception(f"Failed to extract text: {str(e)}")

    def _extract_from_pdf(self, file_path: str) -> str:

        text = []
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
        return "\n\n".join(text)

    def _extract_from_docx(self, file_path: str) -> str:

        doc = DocxDocument(file_path)
        text = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text.append(paragraph.text)
        return "\n\n".join(text)

    def _extract_from_text(self, file_path: str) -> str:

        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()

    def process_document(self, document_id: int) -> Dict:

        try:
            document = Document.objects.get(id=document_id)
            document.status = 'processing'
            document.save()

            file_path = document.file.path
            text = self.extract_text_from_file(file_path, document.file_type)

            if not text.strip():
                raise ValueError("No text could be extracted from document")

            chunks = self.text_splitter.split_text(text)

            if not chunks:
                raise ValueError("Document splitting produced no chunks")

            document_chunks = []
            for idx, chunk_text in enumerate(chunks):
                # Generate embedding for this chunk
                embedding = self.embeddings_model.embed_query(chunk_text)

                chunk = DocumentChunk(
                    document=document,
                    content=chunk_text,
                    chunk_index=idx,
                    embedding=embedding,
                    metadata={
                        'char_count': len(chunk_text),
                        'chunk_number': idx + 1,
                        'total_chunks': len(chunks)
                    }
                )
                document_chunks.append(chunk)

            DocumentChunk.objects.bulk_create(document_chunks)

            document.status = 'completed'
            document.chunk_count = len(chunks)
            document.processed_at = timezone.now()
            document.save()

            return {
                'success': True,
                'document_id': document_id,
                'chunks_created': len(chunks),
                'total_characters': len(text)
            }

        except Exception as e:
            # Mark document as failed
            document.status = 'failed'
            document.error_message = str(e)
            document.save()

            return {
                'success': False,
                'document_id': document_id,
                'error': str(e)
            }


    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:

        import math

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def retrieve_relevant_chunks(
            self,
            chatbot_id: int,
            query: str,
            top_k: int = 5
    ) -> List[Dict]:

        query_embedding = self.embeddings_model.embed_query(query)

        # Step 2: Get all chunks for this chatbot's documents
        chatbot = Chatbot.objects.get(id=chatbot_id)
        all_chunks = DocumentChunk.objects.filter(
            document__chatbot=chatbot,
            document__status='completed'
        ).select_related('document')

        if not all_chunks.exists():
            return []

        chunk_scores = []
        for chunk in all_chunks:
            if chunk.embedding:
                similarity = self.cosine_similarity(query_embedding, chunk.embedding)
                chunk_scores.append({
                    'chunk': chunk,
                    'similarity': similarity,
                    'content': chunk.content,
                    'document_name': chunk.document.file_name,
                    'metadata': chunk.metadata
                })

        chunk_scores.sort(key=lambda x: x['similarity'], reverse=True)
        return chunk_scores[:top_k]


    def generate_response(
            self,
            chatbot: Chatbot,
            user_message: str,
            conversation_history: Optional[List[Dict]] = None
    ) -> Dict:

        try:
            #  Retrieve relevant chunks
            relevant_chunks = self.retrieve_relevant_chunks(
                chatbot_id=chatbot.id,
                query=user_message,
                top_k=5
            )

            context = self._build_context(relevant_chunks)


            prompt = self._build_prompt(
                system_prompt=chatbot.system_prompt,
                context=context,
                user_message=user_message,
                conversation_history=conversation_history
            )

            #  Call OpenAI
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=prompt,
                temperature=chatbot.temperature,
                max_tokens=chatbot.max_tokens
            )

            ai_message = response.choices[0].message.content
            tokens_used = response.usage.total_tokens

            return {
                'success': True,
                'response': ai_message,
                'tokens_used': tokens_used,
                'chunks_used': [
                    {
                        'document': chunk['document_name'],
                        'similarity': chunk['similarity'],
                        'content_preview': chunk['content'][:200] + '...'
                    }
                    for chunk in relevant_chunks
                ]
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'response': "I'm sorry, I encountered an error processing your request."
            }

    def _build_context(self, relevant_chunks: List[Dict]) -> str:

        if not relevant_chunks:
            return "No relevant information found in uploaded documents."

        context_parts = []
        for i, chunk in enumerate(relevant_chunks, 1):
            context_parts.append(
                f"[Source {i} - {chunk['document_name']}]\n{chunk['content']}\n"
            )

        return "\n---\n".join(context_parts)

    def _build_prompt(
            self,
            system_prompt: str,
            context: str,
            user_message: str,
            conversation_history: Optional[List[Dict]] = None
    ) -> List[Dict]:


        messages = []

        # System message with context
        system_message = f"""{system_prompt}

You have access to the following information from uploaded documents:
{context}
"""
        messages.append({"role": "system", "content": system_message})


        if conversation_history:
            for msg in conversation_history[-5:]:
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })


        messages.append({"role": "user", "content": user_message})

        return messages



rag_service = RAGService()