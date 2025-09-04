import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { AIEnglishTutor } from './ai/tutor'
import { getLessonById, getDailyLesson, lessonDatabase } from './lessons/lessonData'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// Initialize AI Tutor (you'll need to set OPENAI_API_KEY environment variable)
let aiTutor: AIEnglishTutor | null = null;

// Initialize AI Tutor with API key
function initializeAI(apiKey?: string) {
  if (apiKey) {
    aiTutor = new AIEnglishTutor(apiKey);
    console.log('✅ AI Tutor initialized successfully');
  } else {
    console.log('⚠️ OpenAI API key not provided - using fallback responses');
  }
}

// API Routes for AI English Tutor
app.get('/api/hello', (c) => {
  const aiStatus = aiTutor ? 'AI Ready' : 'Demo Mode';
  return c.json({ 
    message: 'Hello from ChattyVN AI English Tutor!',
    status: aiStatus,
    version: '1.0.0'
  })
})

app.get('/api/lesson/daily', (c) => {
  const day = parseInt(c.req.query('day') || '1');
  const lesson = getDailyLesson(day);
  
  if (!lesson) {
    return c.json({ error: 'Lesson not found' }, 404);
  }
  
  return c.json(lesson);
})

app.get('/api/lesson/:id', (c) => {
  const lessonId = c.req.param('id');
  const lesson = getLessonById(lessonId);
  
  if (!lesson) {
    return c.json({ error: 'Lesson not found' }, 404);
  }
  
  return c.json(lesson);
})

app.get('/api/lessons', (c) => {
  const level = c.req.query('level');
  let lessons = Object.values(lessonDatabase);
  
  if (level) {
    lessons = lessons.filter(l => l.level === level);
  }
  
  return c.json({ lessons });
})

app.post('/api/chat', async (c) => {
  try {
    const { message, lesson_context, user_level = 'A2' } = await c.req.json();
    
    if (!message || !lesson_context) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Use AI Tutor if available, otherwise fallback
    if (aiTutor) {
      const response = await aiTutor.handleConversation(
        message,
        lesson_context,
        user_level
      );
      return c.json(response);
    } else {
      // Fallback response when AI is not available
      const fallbackResponse = generateFallbackResponse(message, lesson_context);
      return c.json(fallbackResponse);
    }
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return c.json({ 
      error: 'Internal server error',
      response_vi: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!',
      response_en: 'Sorry, please try again!'
    }, 500);
  }
})

app.post('/api/pronunciation', async (c) => {
  try {
    const { target_phrase, user_attempt, difficulty = 'medium' } = await c.req.json();
    
    if (!target_phrase || !user_attempt) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (aiTutor) {
      const evaluation = await aiTutor.evaluatePronunciation(
        target_phrase,
        user_attempt,
        difficulty
      );
      return c.json(evaluation);
    } else {
      // Fallback pronunciation scoring
      const score = calculateBasicScore(target_phrase, user_attempt);
      return c.json({
        score,
        feedback_vi: score >= 80 ? 'Tuyệt vời! 🎉' : 'Tốt! Hãy thử lại nhé 💪',
        tips: ['Nói chậm và rõ ràng', 'Chú ý phát âm từng từ']
      });
    }
    
  } catch (error) {
    console.error('Pronunciation API Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

app.post('/api/lesson/personalized', async (c) => {
  try {
    const { user_weaknesses, completed_lessons, user_level } = await c.req.json();
    
    if (aiTutor) {
      const personalizedLesson = await aiTutor.generatePersonalizedLesson(
        user_weaknesses || [],
        completed_lessons || [],
        user_level || 'A2'
      );
      return c.json(personalizedLesson || { error: 'Could not generate lesson' });
    } else {
      return c.json({ error: 'AI not available for personalized lessons' }, 503);
    }
    
  } catch (error) {
    console.error('Personalized Lesson Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

// Helper function for fallback responses
function generateFallbackResponse(message: string, lessonContext: any) {
  const messageLength = message.length;
  const hasTargetWords = lessonContext.target_phrases?.some((phrase: any) => 
    message.toLowerCase().includes(phrase.english.toLowerCase().split(' ')[0])
  );
  
  let accuracy = 70;
  let response_vi = "Tốt lắm! Hãy tiếp tục luyện tập!";
  let tips = ["Nói chậm và rõ ràng"];
  
  if (hasTargetWords) {
    accuracy = 85;
    response_vi = "Xuất sắc! Bạn đã sử dụng đúng từ vựng! ⭐";
    tips = ["Phát âm rất tốt!", "Hãy chú ý nhịp điệu câu"];
  }
  
  if (messageLength < 5) {
    accuracy = 60;
    response_vi = "Hãy thử nói câu đầy đủ hơn nhé!";
    tips = ["Nói thêm chi tiết", "Sử dụng câu hoàn chỉnh"];
  }
  
  return {
    response_vi,
    response_en: "Good job!",
    feedback: {
      accuracy,
      pronunciation_tips: tips,
      stars_earned: Math.floor(accuracy / 30),
      grammar_correction: accuracy < 70 ? "Try using complete sentences" : null
    }
  };
}

// Basic scoring for pronunciation fallback
function calculateBasicScore(target: string, attempt: string): number {
  const targetWords = target.toLowerCase().split(' ');
  const attemptWords = attempt.toLowerCase().split(' ');
  
  let matches = 0;
  targetWords.forEach(word => {
    if (attemptWords.some(aw => aw.includes(word) || word.includes(aw))) {
      matches++;
    }
  });
  
  return Math.min(90, Math.max(40, (matches / targetWords.length) * 100));
}

// Initialize AI on startup
try {
  const apiKey = process.env.OPENAI_API_KEY || 
                 (typeof Deno !== 'undefined' ? Deno.env.get('OPENAI_API_KEY') : undefined);
  initializeAI(apiKey);
} catch (error) {
  console.log('AI initialization skipped - no API key');
}

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

            let currentLesson = null;
            let userStats = { totalStars: 3, streak: 1, completedPhrases: 0 };

            // Load lesson data
            async function loadLesson() {
                try {
                    const response = await axios.get('/api/lesson/daily?day=1');
                    currentLesson = response.data;
                    updateLessonInfo(currentLesson);
                    startLesson();
                } catch (error) {
                    console.error('Failed to load lesson:', error);
                }
            }

            // Update lesson info display
            function updateLessonInfo(lesson) {
                document.querySelector('h2').textContent = \`Bài \${lesson.lesson_id.split('_')[1]}: \${lesson.topic}\`;
                document.querySelector('.text-sm.text-gray-600').textContent = 
                    \`Học \${lesson.target_phrases.length} câu thông dụng - Level \${lesson.level}\`;
            }

            // Start lesson with AI introduction
            function startLesson() {
                if (!currentLesson) return;
                
                addMessage(currentLesson.intro_vi, 'ai');
                
                setTimeout(() => {
                    const firstPhrase = currentLesson.target_phrases[0];
                    addMessage(\`Hãy nghe và nhắc lại câu đầu tiên: "\${firstPhrase.english}"\`, 'ai', null, firstPhrase);
                }, 1500);
            }

            // Send message function with AI integration
            async function sendMessage() {
                const input = document.getElementById('text-input');
                const message = input.value.trim();
                
                if (!message) return;

                // Add user message to chat
                addMessage(message, 'user');
                input.value = '';

                // Show typing indicator
                addTypingIndicator();

                try {
                    // Prepare lesson context
                    const lessonContext = {
                        lesson_id: currentLesson?.lesson_id || 'day_1_greetings',
                        topic: currentLesson?.topic || 'Greetings',
                        target_phrases: currentLesson?.target_phrases || [],
                        current_target: getCurrentTargetPhrase()
                    };

                    // Send to AI API with enhanced context
                    const response = await axios.post('/api/chat', {
                        message: message,
                        lesson_context: lessonContext,
                        user_level: 'A2'
                    });

                    // Remove typing indicator
                    removeTypingIndicator();

                    // Update user stats
                    if (response.data.feedback.stars_earned > 0) {
                        userStats.totalStars += response.data.feedback.stars_earned;
                        updateStatsDisplay();
                    }

                    // Add AI response with enhanced feedback
                    addMessage(response.data.response_vi, 'ai', response.data.feedback);

                    // Show English model if provided
                    if (response.data.response_en && response.data.response_en !== 'Good job!') {
                        setTimeout(() => {
                            addMessage(\`📝 Model: "\${response.data.response_en}"\`, 'ai-model');
                        }, 800);
                    }

                    // Progress to next phrase if accuracy is high
                    if (response.data.feedback.accuracy >= 80) {
                        setTimeout(() => suggestNextPhrase(), 2000);
                    }
                    
                } catch (error) {
                    removeTypingIndicator();
                    console.error('Error:', error);
                    addMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 😅', 'ai');
                }
            }

            // Get current target phrase for context
            function getCurrentTargetPhrase() {
                if (!currentLesson) return null;
                return currentLesson.target_phrases[userStats.completedPhrases] || 
                       currentLesson.target_phrases[0];
            }

            // Suggest next phrase
            function suggestNextPhrase() {
                if (!currentLesson) return;
                
                const nextIndex = userStats.completedPhrases + 1;
                if (nextIndex < currentLesson.target_phrases.length) {
                    const nextPhrase = currentLesson.target_phrases[nextIndex];
                    userStats.completedPhrases++;
                    addMessage(\`Tuyệt vời! Bây giờ thử câu này: "\${nextPhrase.english}"\`, 'ai', null, nextPhrase);
                } else {
                    addMessage('🎉 Hoàn thành bài học! Bạn đã làm rất tốt! Hẹn gặp lại ngày mai nhé!', 'ai');
                }
                
                updateProgressBar();
            }

            // Update progress bar
            function updateProgressBar() {
                const progress = (userStats.completedPhrases / (currentLesson?.target_phrases.length || 5)) * 100;
                document.querySelector('.bg-blue-500.h-2').style.width = \`\${Math.min(100, progress)}%\`;
            }

            // Update stats display
            function updateStatsDisplay() {
                document.querySelector('.flex.items-center span:last-child').textContent = 
                    \`\${userStats.totalStars} sao\`;
            }

            // Add typing indicator
            function addTypingIndicator() {
                const indicator = document.createElement('div');
                indicator.id = 'typing-indicator';
                indicator.className = 'chat-bubble';
                indicator.innerHTML = \`
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-3">
                            <div class="flex space-x-1">
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                            </div>
                        </div>
                    </div>
                \`;
                
                document.getElementById('chat-container').appendChild(indicator);
                document.getElementById('chat-container').scrollTop = 
                    document.getElementById('chat-container').scrollHeight;
            }

            // Remove typing indicator
            function removeTypingIndicator() {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.remove();
            }

            function addMessage(content, sender, feedback = null, phraseData = null) {
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
                } else if (sender === 'ai-model') {
                    messageDiv.innerHTML = \`
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-book text-white text-sm"></i>
                            </div>
                            <div class="bg-green-50 border-l-4 border-green-400 rounded-lg p-3 max-w-xs">
                                <p class="text-sm text-green-800">\${content}</p>
                            </div>
                        </div>
                    \`;
                } else {
                    let starsHtml = '';
                    let accuracyHtml = '';
                    let tipsHtml = '';
                    let audioButton = '';
                    
                    if (feedback) {
                        if (feedback.stars_earned > 0) {
                            starsHtml = \` \${'⭐'.repeat(feedback.stars_earned)}\`;
                        }
                        
                        if (feedback.accuracy) {
                            const color = feedback.accuracy >= 80 ? 'text-green-600' : 
                                         feedback.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600';
                            accuracyHtml = \`<div class="mt-2 text-xs \${color}">📊 Độ chính xác: \${feedback.accuracy}%</div>\`;
                        }
                        
                        if (feedback.pronunciation_tips && feedback.pronunciation_tips.length > 0) {
                            tipsHtml = \`
                                <div class="mt-2 text-xs text-blue-600">
                                    💡 \${feedback.pronunciation_tips.join(' • ')}
                                </div>
                            \`;
                        }
                        
                        if (feedback.grammar_correction) {
                            tipsHtml += \`
                                <div class="mt-1 text-xs text-purple-600">
                                    ✏️ \${feedback.grammar_correction}
                                </div>
                            \`;
                        }
                    }
                    
                    if (phraseData) {
                        audioButton = \`
                            <button onclick="playPhrase('\${phraseData.english}')" 
                                    class="mt-2 bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600">
                                🔊 Nghe phát âm
                            </button>
                        \`;
                    }
                    
                    messageDiv.innerHTML = \`
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-robot text-white text-sm"></i>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                                <p class="text-sm">\${content}\${starsHtml}</p>
                                \${accuracyHtml}
                                \${tipsHtml}
                                \${audioButton}
                            </div>
                        </div>
                    \`;
                }

                container.appendChild(messageDiv);
                container.scrollTop = container.scrollHeight;
            }

            // Enhanced audio function for phrases
            function playPhrase(text) {
                if (speechSynthesis.speaking) {
                    speechSynthesis.cancel();
                }
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                utterance.pitch = 1.0;
                
                // Try to use a native English voice
                const voices = speechSynthesis.getVoices();
                const englishVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && voice.name.includes('Google')
                ) || voices.find(voice => voice.lang.startsWith('en'));
                
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
                
                speechSynthesis.speak(utterance);
            }

            // Initialize lesson on page load
            window.addEventListener('load', () => {
                loadLesson();
            });

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
