import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// API Routes for AI English Tutor
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from ChattyVN AI English Tutor!' })
})

app.get('/api/lesson/daily', (c) => {
  return c.json({
    lesson_id: "day_1_greetings",
    level: "A2",
    topic: "Greetings & Introductions",
    intro_vi: "Chào mừng đến với bài học đầu tiên! Hôm nay chúng ta sẽ học cách chào hỏi.",
    target_phrases: [
      {
        id: 1,
        english: "Hello, nice to meet you!",
        vietnamese: "Xin chào, rất vui được gặp bạn!",
        phonetic: "/həˈloʊ naɪs tu mit yu/"
      }
    ]
  })
})

app.post('/api/chat', async (c) => {
  const { message, lesson_context } = await c.req.json()
  
  // Mock AI response for demo
  return c.json({
    response_vi: "Tuyệt vời! Bạn đã phát âm đúng! ⭐",
    response_en: "Great job!",
    feedback: {
      accuracy: 85,
      pronunciation_tips: ["Nhớ phát âm 'th' rõ ràng hơn"],
      stars_earned: 2
    }
  })
})

// Main page - AI English Tutor Interface
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ChattyVN - AI English Tutor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .chat-bubble {
            animation: slideIn 0.3s ease-out;
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Header -->
            <div class="gradient-bg text-white p-6 text-center">
                <div class="max-w-md mx-auto">
                    <div class="flex items-center justify-center mb-4">
                        <i class="fas fa-robot text-4xl mr-3"></i>
                        <div>
                            <h1 class="text-2xl font-bold">ChattyVN</h1>
                            <p class="text-sm opacity-90">AI English Tutor cho người Việt</p>
                        </div>
                    </div>
                    <div class="bg-white/20 rounded-lg p-3 mb-4">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center">
                                <i class="fas fa-fire text-orange-300 mr-2"></i>
                                Streak: 1 ngày
                            </span>
                            <span class="flex items-center">
                                <i class="fas fa-star text-yellow-300 mr-2"></i>
                                3 sao
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Interface -->
            <div class="max-w-md mx-auto bg-white min-h-screen">
                <!-- Lesson Info -->
                <div class="p-4 bg-blue-50 border-b">
                    <h2 class="font-semibold text-gray-800">Bài 1: Chào hỏi & Giới thiệu</h2>
                    <p class="text-sm text-gray-600">Học 5 câu thông dụng nhất</p>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: 20%"></div>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div id="chat-container" class="p-4 space-y-4 min-h-96">
                    <!-- AI Message -->
                    <div class="chat-bubble">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-robot text-white text-sm"></i>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                                <p class="text-sm">Xin chào! Tôi là ChattyVN. Hãy nghe và nhắc lại câu này nhé:</p>
                                <div class="mt-2 bg-blue-500 text-white rounded p-2 text-center">
                                    <p class="font-semibold">"Hello, nice to meet you!"</p>
                                    <button onclick="playAudio()" class="mt-1 text-xs underline">
                                        <i class="fas fa-play mr-1"></i>Phát âm
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4">
                    <div class="flex space-x-2">
                        <button id="voice-btn" class="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <input 
                            type="text" 
                            id="text-input" 
                            placeholder="Hoặc gõ câu trả lời..."
                            class="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                        <button onclick="sendMessage()" class="bg-blue-500 text-white p-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let isRecording = false;
            let recognition;

            // Initialize speech recognition
            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = false;
                
                recognition.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    document.getElementById('text-input').value = transcript;
                    sendMessage();
                };
                
                recognition.onerror = function(event) {
                    console.log('Speech recognition error:', event.error);
                    stopRecording();
                };
            }

            // Voice recording
            document.getElementById('voice-btn').addEventListener('click', function() {
                if (!isRecording) {
                    startRecording();
                } else {
                    stopRecording();
                }
            });

            function startRecording() {
                if (recognition) {
                    recognition.start();
                    isRecording = true;
                    document.getElementById('voice-btn').innerHTML = '<i class="fas fa-stop"></i>';
                    document.getElementById('voice-btn').classList.add('animate-pulse');
                }
            }

            function stopRecording() {
                if (recognition && isRecording) {
                    recognition.stop();
                    isRecording = false;
                    document.getElementById('voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
                    document.getElementById('voice-btn').classList.remove('animate-pulse');
                }
            }

            // Send message function
            async function sendMessage() {
                const input = document.getElementById('text-input');
                const message = input.value.trim();
                
                if (!message) return;

                // Add user message to chat
                addMessage(message, 'user');
                input.value = '';

                try {
                    // Send to AI API
                    const response = await axios.post('/api/chat', {
                        message: message,
                        lesson_context: { lesson_id: 'day_1_greetings' }
                    });

                    // Add AI response
                    addMessage(response.data.response_vi, 'ai', response.data.feedback);
                    
                } catch (error) {
                    console.error('Error:', error);
                    addMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!', 'ai');
                }
            }

            function addMessage(content, sender, feedback = null) {
                const container = document.getElementById('chat-container');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-bubble';

                if (sender === 'user') {
                    messageDiv.innerHTML = \`
                        <div class="flex justify-end">
                            <div class="bg-blue-500 text-white rounded-lg p-3 max-w-xs">
                                <p class="text-sm">\${content}</p>
                            </div>
                        </div>
                    \`;
                } else {
                    let starsHtml = '';
                    if (feedback && feedback.stars_earned) {
                        starsHtml = '⭐'.repeat(feedback.stars_earned);
                    }
                    
                    messageDiv.innerHTML = \`
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-robot text-white text-sm"></i>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                                <p class="text-sm">\${content} \${starsHtml}</p>
                                \${feedback ? \`<div class="mt-2 text-xs text-gray-600">Độ chính xác: \${feedback.accuracy}%</div>\` : ''}
                            </div>
                        </div>
                    \`;
                }

                container.appendChild(messageDiv);
                container.scrollTop = container.scrollHeight;
            }

            // Play audio function
            function playAudio() {
                const utterance = new SpeechSynthesisUtterance("Hello, nice to meet you!");
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                speechSynthesis.speak(utterance);
            }

            // Enter key to send message
            document.getElementById('text-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        </script>
    </body>
    </html>
  `)
})

export default app
