import os
import json
from typing import List, Dict, Optional
from django.conf import settings
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import tiktoken
import PyPDF2
from docx import Document as DocxDocument
from django.utils import timezone
from documents.models import Document, DocumentChunk
from chatbots.models import Chatbot


class RAGService:

    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")

        self.client = OpenAI(api_key=api_key)
        self.embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)

        _tokeniser = tiktoken.get_encoding("cl100k_base")


        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=750,
            chunk_overlap=75,
            length_function=lambda text: len(_tokeniser.encode(text)),
            separators=["\n\n", "\n", " ", ""]
        )


    def extract_text_from_file(self, file_path: str, file_type: str) -> str:

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


    def retrieve_relevant_chunks(
            self,
            chatbot_id: int,
            query: str,
            top_k: int = 5
    ) -> List[Dict]:

        import json
        from django.db import connection

        query_embedding = self.embeddings_model.embed_query(query)

        chatbot = Chatbot.objects.get(id=chatbot_id)

        #  skip the SQL round-trip if there are no eligible chunks at all.
        has_chunks = DocumentChunk.objects.filter(
            document__chatbot=chatbot,
            document__status='completed'
        ).exists()

        if not has_chunks:
            return []

        query_vector = json.dumps(query_embedding)

        sql = """
            SELECT
                dc.id,
                dc.content,
                dc.metadata,
                d.file_name,
                1 - (dc.embedding <=> %s::vector) AS similarity
            FROM document_chunks dc
            INNER JOIN documents d ON dc.document_id = d.id
            WHERE d.chatbot_id = %s
              AND d.status    = 'completed'
              AND dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> %s::vector
            LIMIT %s;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [query_vector, chatbot.id, query_vector, top_k])
            rows = cursor.fetchall()

        return [
            {
                'chunk_id':      row[0],
                'content':       row[1],
                'metadata':      row[2],
                'document_name': row[3],
                'similarity':    float(row[4]),
            }
            for row in rows
        ]


    def generate_response(
            self,
            chatbot: Chatbot,
            user_message: str,
            conversation_history: Optional[List[Dict]] = None,
            model: str = 'gpt-3.5-turbo',
            provider: str = 'openai',
    ) -> Dict:

        try:
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

            client = self._client_for(provider)
            response = client.chat.completions.create(
                model=model,
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

        system_message = (
            f"{system_prompt}\n\n"
            f"{context}\n"
        )
        messages.append({"role": "system", "content": system_message})

        if conversation_history:
            for msg in conversation_history[-5:]:
                messages.append({"role": msg['role'], "content": msg['content']})

        messages.append({"role": "user", "content": user_message})

        return messages


    def generate_response_agentic(
            self,
            chatbot,
            user_message: str,
            conversation_history: Optional[List[Dict]] = None,
    ) -> Dict:
        # claude picks when to search, we just run the search and pass results back
        try:
            import anthropic as _anthropic

            client = _anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

            # build the message list from history then add the new user message
            messages = []
            if conversation_history:
                for msg in conversation_history[-5:]:
                    messages.append({"role": msg['role'], "content": msg['content']})
            messages.append({"role": "user", "content": user_message})

            chunks_used: List[Dict] = []
            total_tokens = 0

            # keep looping until claude finishes or something goes wrong
            while True:
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=chatbot.max_tokens,
                    temperature=chatbot.temperature,
                    system=chatbot.system_prompt,
                    tools=[_SEARCH_TOOL],
                    messages=messages,
                )

                total_tokens += response.usage.input_tokens + response.usage.output_tokens

                if response.stop_reason == "end_turn":
                    # claude finished  grab the text and return
                    text_blocks = [b.text for b in response.content if hasattr(b, 'text')]
                    answer = "\n".join(text_blocks).strip()
                    return {
                        'success': True,
                        'response': answer,
                        'tokens_used': total_tokens,
                        'chunks_used': [
                            {
                                'document': c['document_name'],
                                'similarity': c['similarity'],
                                'content_preview': c['content'][:200] + '...'
                            }
                            for c in chunks_used
                        ]
                    }

                if response.stop_reason == "tool_use":
                    # claude may request multiple searches in a single turn — handle all of them
                    tool_blocks = [
                        b for b in response.content
                        if hasattr(b, 'type') and b.type == "tool_use"
                    ]
                    if not tool_blocks:
                        # stop_reason said tool_use but no block found — bail
                        break

                    # run every search and collect a tool_result for each one
                    tool_results = []
                    for tool_block in tool_blocks:
                        query = tool_block.input.get("query", user_message)
                        chunks = self.retrieve_relevant_chunks(chatbot.id, query, top_k=5)
                        chunks_used.extend(chunks)
                        context = self._build_context(chunks)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_block.id,
                            "content": context,
                        })

                    # every tool_use must have a matching tool_result in the next user turn
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})
                    continue

                # something unexpected stopped the loop
                break

            return {
                'success': False,
                'error': f"Unexpected stop reason: {response.stop_reason}",
                'response': "I'm sorry, I encountered an error processing your request."
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'response': "I'm sorry, I encountered an error processing your request."
            }

    def prepare_prompt(self, chatbot, user_message, conversation_history=None):
        # get RAG chunks and build the prompt for compare
        chunks = self.retrieve_relevant_chunks(chatbot_id=chatbot.id, query=user_message, top_k=5)
        context = self._build_context(chunks)
        messages = self._build_prompt(chatbot.system_prompt, context, user_message, conversation_history)
        chunks_used = [
            {'document': c['document_name'], 'similarity': c['similarity']}
            for c in chunks
        ]
        return messages, chunks_used

    def _client_for(self, provider: str) -> OpenAI:
        # returns an OpenAI-compatible client for OpenAI and Grok
        if provider == 'openai':
            return self.client
        if provider == 'grok':
            key = os.getenv('XAI_API_KEY')
            if not key:
                raise ValueError('XAI_API_KEY is not set')
            return OpenAI(
                base_url='https://api.x.ai/v1',
                api_key=key,
            )
        raise ValueError(f'Provider {provider} does not use the OpenAI-compatible client')

    def call_model(self, messages, model_id: str, provider: str, temperature=0.7, max_tokens=500) -> Dict:
        # Anthropic uses its own SDK; OpenAI and Grok share the openai-compatible path
        try:
            if provider == 'anthropic':
                return self._call_anthropic(messages, model_id, temperature, max_tokens)
            client = self._client_for(provider)
            response = client.chat.completions.create(
                model=model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'tokens_used': response.usage.total_tokens if response.usage else 0,
            }
        except Exception as e:
            return {'success': False, 'error': self._clean_error(e), 'response': None, 'tokens_used': 0}

    def _call_anthropic(self, messages: List[Dict], model_id: str, temperature: float, max_tokens: int) -> Dict:
        # Anthropic messages.create — system message extracted separately
        import anthropic as _anthropic
        key = os.getenv('ANTHROPIC_API_KEY')
        if not key:
            raise ValueError('ANTHROPIC_API_KEY is not set')
        client = _anthropic.Anthropic(api_key=key)

        # separate system prompt from the conversation turns
        system_content = ''
        conversation = []
        for msg in messages:
            if msg['role'] == 'system':
                system_content += msg['content']
            else:
                conversation.append({'role': msg['role'], 'content': msg['content']})

        response = client.messages.create(
            model=model_id,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_content,
            messages=conversation,
        )
        text = ''.join(b.text for b in response.content if hasattr(b, 'text'))
        tokens = response.usage.input_tokens + response.usage.output_tokens
        return {'success': True, 'response': text, 'tokens_used': tokens}

    def _clean_error(self, exc) -> str:
        # map API errors to readable messages
        msg = str(exc)
        if '429' in msg or 'quota' in msg.lower() or 'rate' in msg.lower() or 'exhausted' in msg.lower():
            return 'Quota exceeded — check your billing or try again later.'
        if '401' in msg or 'auth' in msg.lower() or 'api key' in msg.lower():
            return 'Authentication failed — check the API key for this provider.'
        if '404' in msg or 'not found' in msg.lower():
            return 'Model not found — the model ID may be unavailable or deprecated.'
        if '400' in msg or 'invalid' in msg.lower():
            return 'Invalid request — the model may not be available on your current plan.'
        return 'Request failed — the provider returned an error.'


# tell claude about the search tool so it knows it can look things up
_SEARCH_TOOL = {
    "name": "search_documents",
    "description": (
        "Search the uploaded documents for information relevant to the user's question. "
        "Call this whenever the answer may be found in the documents. "
        "You may call it more than once with different queries if needed."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A focused search query to find relevant document content"
            }
        },
        "required": ["query"]
    }
}


rag_service = RAGService()