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

// Main page - Complete ChattyVN Interface with Bottom Navigation
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
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body {
            background: #1a1f36;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .chatty-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .dark-card {
            background: #252a42;
            border-radius: 16px;
          }
          .bottom-nav {
            background: #1a1f36;
            border-top: 1px solid #2d3348;
          }
          .nav-item.active {
            color: #667eea;
          }
          .setting-item {
            background: #252a42;
            border-radius: 12px;
            margin-bottom: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: between;
            cursor: pointer;
            transition: all 0.2s;
          }
          .setting-item:hover {
            background: #2d3348;
          }
          .premium-gradient {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          }
          .chat-bubble {
            animation: slideIn 0.3s ease-out;
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .hidden { display: none; }
        </style>
    </head>
    <body>
        <div class="max-w-sm mx-auto bg-[#1a1f36] min-h-screen relative">
            
            <!-- Profile Page -->
            <div id="profile-page" class="page hidden">
                <div class="p-6">
                    <div class="text-center mb-6">
                        <div class="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <i class="fas fa-user text-white text-2xl"></i>
                        </div>
                        <h2 class="text-xl font-bold mb-2">Yuriy Pavlu</h2>
                        <p class="text-gray-400">Level A2 • Frontend Developer</p>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="text-center dark-card p-4">
                            <div class="text-2xl font-bold text-blue-400">127</div>
                            <div class="text-xs text-gray-400">Ngày học</div>
                        </div>
                        <div class="text-center dark-card p-4">
                            <div class="text-2xl font-bold text-yellow-400">1,247</div>
                            <div class="text-xs text-gray-400">Sao tổng</div>
                        </div>
                        <div class="text-center dark-card p-4">
                            <div class="text-2xl font-bold text-green-400">89%</div>
                            <div class="text-xs text-gray-400">Chính xác</div>
                        </div>
                    </div>
                    
                    <div class="dark-card p-4 mb-4">
                        <h3 class="font-semibold mb-3">🎯 Mục tiêu tuần này</h3>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm">Học 50 câu mới</span>
                            <span class="text-blue-400 text-sm">32/50</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: 64%"></div>
                        </div>
                    </div>
                    
                    <div class="dark-card p-4">
                        <h3 class="font-semibold mb-3">🏆 Thành tích</h3>
                        <div class="grid grid-cols-4 gap-3">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-yellow-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <i class="fas fa-fire text-white"></i>
                                </div>
                                <div class="text-xs">7 ngày</div>
                            </div>
                            <div class="text-center">
                                <div class="w-12 h-12 bg-purple-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <i class="fas fa-star text-white"></i>
                                </div>
                                <div class="text-xs">Xuất sắc</div>
                            </div>
                            <div class="text-center">
                                <div class="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <i class="fas fa-microphone text-white"></i>
                                </div>
                                <div class="text-xs">Giọng hay</div>
                            </div>
                            <div class="text-center opacity-50">
                                <div class="w-12 h-12 bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <i class="fas fa-lock text-gray-400"></i>
                                </div>
                                <div class="text-xs">Locked</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stars Page -->
            <div id="stars-page" class="page hidden">
                <div class="p-6">
                    <h1 class="text-2xl font-bold mb-6 text-center">⭐ Sao của bạn</h1>
                    
                    <div class="text-center mb-8">
                        <div class="text-6xl font-bold text-yellow-400 mb-2">1,247</div>
                        <p class="text-gray-400">Tổng số sao tích lũy</p>
                    </div>
                    
                    <div class="dark-card p-4 mb-6">
                        <h3 class="font-semibold mb-4">📊 Thống kê hàng ngày</h3>
                        <canvas id="starsChart" width="300" height="150"></canvas>
                    </div>
                    
                    <div class="dark-card p-4 mb-4">
                        <h3 class="font-semibold mb-3">🎁 Đổi quà</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center">
                                    <div class="w-10 h-10 bg-blue-500 rounded-lg mr-3 flex items-center justify-center">
                                        <i class="fas fa-crown text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium">Premium 1 ngày</div>
                                        <div class="text-xs text-gray-400">Mở khóa tất cả tính năng</div>
                                    </div>
                                </div>
                                <button class="bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm font-semibold">50 ⭐</button>
                            </div>
                            <div class="flex justify-between items-center">
                                <div class="flex items-center">
                                    <div class="w-10 h-10 bg-purple-500 rounded-lg mr-3 flex items-center justify-center">
                                        <i class="fas fa-robot text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium">Avatar mới</div>
                                        <div class="text-xs text-gray-400">Thay đổi hình đại diện</div>
                                    </div>
                                </div>
                                <button class="bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm font-semibold">100 ⭐</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Saved Page -->
            <div id="saved-page" class="page hidden">
                <div class="p-6">
                    <h1 class="text-2xl font-bold mb-6 text-center">💾 Đã lưu</h1>
                    
                    <div class="dark-card p-4 mb-4">
                        <h3 class="font-semibold mb-3">📚 Câu đã thành thạo</h3>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium">Hello, nice to meet you!</div>
                                    <div class="text-sm text-gray-400">Xin chào, rất vui được gặp bạn!</div>
                                </div>
                                <button onclick="playPhrase('Hello, nice to meet you!')" class="text-blue-400">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium">My name is John.</div>
                                    <div class="text-sm text-gray-400">Tên tôi là John.</div>
                                </div>
                                <button onclick="playPhrase('My name is John.')" class="text-blue-400">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dark-card p-4 mb-4">
                        <h3 class="font-semibold mb-3">🔄 Cần ôn lại</h3>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium text-yellow-400">Where are you from?</div>
                                    <div class="text-sm text-gray-400">Bạn đến từ đâu? • Độ chính xác: 67%</div>
                                </div>
                                <button class="text-yellow-400">
                                    <i class="fas fa-redo"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dark-card p-4">
                        <h3 class="font-semibold mb-3">📖 Bài học yêu thích</h3>
                        <div class="space-y-3">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-green-500 rounded-lg mr-3 flex items-center justify-center">
                                    <i class="fas fa-heart text-white text-sm"></i>
                                </div>
                                <div>
                                    <div class="font-medium">Greetings & Introductions</div>
                                    <div class="text-sm text-gray-400">Hoàn thành: 100%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Page -->
            <div id="settings-page" class="page">
                <div class="p-6">
                    <!-- Premium CTA -->
                    <div onclick="showSubscription()" class="premium-gradient p-4 rounded-xl mb-6 cursor-pointer">
                        <div class="flex items-center">
                            <i class="fas fa-heart text-white text-xl mr-3"></i>
                            <div class="flex-1">
                                <div class="font-semibold text-white">Nâng cấp không giới hạn</div>
                                <div class="text-blue-100 text-sm">Mở khóa tất cả tính năng AI</div>
                            </div>
                            <i class="fas fa-chevron-right text-white"></i>
                        </div>
                    </div>
                    
                    <!-- Settings Menu -->
                    <div class="space-y-2">
                        <div class="setting-item" onclick="alert('Mời bạn bè')">
                            <i class="fas fa-user-friends text-blue-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Mời bạn bè</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="alert('Tặng subscription')">
                            <i class="fas fa-gift text-green-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Tặng subscription</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showModeSelection()">
                            <i class="fas fa-users text-orange-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Chế độ học</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showVoiceSettings()">
                            <i class="fas fa-microphone text-purple-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Thay đổi giọng ChattyVN</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showLevelSettings()">
                            <i class="fas fa-chart-bar text-indigo-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Thay đổi trình độ</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showSpeedSettings()">
                            <i class="fas fa-tachometer-alt text-green-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Tốc độ giọng nói</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showTopics()">
                            <i class="fas fa-list text-cyan-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Chọn chủ đề</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        
                        <div class="setting-item" onclick="showHelp()">
                            <i class="fas fa-question-circle text-yellow-400 text-lg mr-4"></i>
                            <div class="flex-1">
                                <div class="font-medium">Hướng dẫn sử dụng</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Page (Default) -->
            <div id="chat-page" class="page hidden pb-20">
                <!-- Header -->
                <div class="chatty-gradient p-6 text-center">
                    <div class="flex items-center justify-center mb-4">
                        <i class="fas fa-robot text-3xl mr-3"></i>
                        <div>
                            <h1 class="text-xl font-bold">ChattyVN</h1>
                            <p class="text-sm opacity-90">AI English Tutor</p>
                        </div>
                    </div>
                    <div class="bg-white/20 rounded-lg p-3">
                        <div class="flex justify-between items-center text-sm">
                            <span class="flex items-center">
                                <i class="fas fa-fire text-orange-300 mr-2"></i>
                                Streak: 1 ngày
                            </span>
                            <span class="flex items-center">
                                <i class="fas fa-star text-yellow-300 mr-2"></i>
                                <span id="total-stars">3</span> sao
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Lesson Info -->
                <div class="p-4 bg-[#252a42] border-b border-gray-700">
                    <h2 class="font-semibold mb-1">Bài 1: Chào hỏi & Giới thiệu</h2>
                    <p class="text-sm text-gray-400 mb-2">Học 5 câu thông dụng nhất - Level A2</p>
                    <div class="w-full bg-gray-700 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full transition-all duration-500" style="width: 20%"></div>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div id="chat-container" class="p-4 space-y-4 min-h-96"></div>

                <!-- Input Area -->
                <div class="fixed bottom-16 left-0 right-0 max-w-sm mx-auto bg-[#252a42] border-t border-gray-700 p-4">
                    <div class="flex space-x-2">
                        <button id="voice-btn" class="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <input 
                            type="text" 
                            id="text-input" 
                            placeholder="Gõ câu trả lời..."
                            class="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                        <button onclick="sendMessage()" class="bg-blue-500 text-white p-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Subscription Modal -->
            <div id="subscription-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-[#1a1f36] rounded-xl max-w-sm w-full p-6">
                        <div class="text-center mb-6">
                            <div class="w-20 h-20 mx-auto mb-4">
                                <img src="data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#ff6b6b"/><path d="M35 45 L45 55 L65 35" stroke="white" stroke-width="4" fill="none"/></svg>')}" alt="Premium" class="w-full h-full">
                            </div>
                            <h2 class="text-2xl font-bold text-purple-400 mb-2">ChattyVN Unlimited</h2>
                        </div>
                        
                        <div class="space-y-3 mb-6">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-400 mr-3"></i>
                                <span class="text-sm">Tin nhắn và audio không giới hạn</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-400 mr-3"></i>
                                <span class="text-sm">Giải thích lỗi, dịch và đánh giá phát âm</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-400 mr-3"></i>
                                <span class="text-sm">Học nhanh hơn 7.5x!</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-400 mr-3"></i>
                                <span class="text-sm">Hủy bất cứ lúc nào</span>
                            </div>
                        </div>
                        
                        <div class="space-y-3 mb-6">
                            <div class="border border-gray-600 rounded-lg p-4">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-semibold">Unlimited</div>
                                        <div class="text-sm text-gray-400">Monthly subscription</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-gray-400 line-through text-sm">$19.98</div>
                                        <div class="text-blue-400 font-bold">$9.99</div>
                                        <div class="text-xs text-gray-400">per month</div>
                                    </div>
                                    <div class="bg-red-500 text-white text-xs px-2 py-1 rounded">-50%</div>
                                </div>
                            </div>
                            
                            <div class="border-2 border-blue-500 rounded-lg p-4 relative">
                                <div class="absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded">Recommended</div>
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-semibold">Unlimited</div>
                                        <div class="text-sm text-gray-400">Annual subscription</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-gray-400 line-through text-sm">$249.95</div>
                                        <div class="text-blue-400 font-bold">$49.99</div>
                                        <div class="text-xs text-gray-400">per year</div>
                                    </div>
                                    <div class="bg-red-500 text-white text-xs px-2 py-1 rounded">-80%</div>
                                </div>
                            </div>
                        </div>
                        
                        <button class="w-full premium-gradient text-white py-3 rounded-lg font-semibold mb-4">
                            Tiếp tục
                        </button>
                        
                        <button onclick="closeSubscription()" class="w-full text-gray-400 text-center">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            <!-- Bottom Navigation -->
            <div class="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bottom-nav">
                <div class="flex">
                    <button onclick="showPage('profile')" class="flex-1 py-3 text-center nav-item" id="nav-profile">
                        <i class="fas fa-user text-xl mb-1 block"></i>
                        <span class="text-xs">Profile</span>
                    </button>
                    <button onclick="showPage('stars')" class="flex-1 py-3 text-center nav-item" id="nav-stars">
                        <i class="fas fa-star text-xl mb-1 block"></i>
                        <span class="text-xs">Stars</span>
                    </button>
                    <button onclick="showPage('saved')" class="flex-1 py-3 text-center nav-item" id="nav-saved">
                        <i class="fas fa-bookmark text-xl mb-1 block"></i>
                        <span class="text-xs">Saved</span>
                    </button>
                    <button onclick="showPage('settings')" class="flex-1 py-3 text-center nav-item active" id="nav-settings">
                        <i class="fas fa-cog text-xl mb-1 block"></i>
                        <span class="text-xs">Settings</span>
                    </button>
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

            // Navigation System
            function showPage(pageId) {
                // Hide all pages
                document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
                
                // Show selected page
                document.getElementById(\`\${pageId}-page\`).classList.remove('hidden');
                
                // Update navigation
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.getElementById(\`nav-\${pageId}\`).classList.add('active');
                
                // Initialize page-specific content
                if (pageId === 'stars') initStarsChart();
                if (pageId === 'chat') initChat();
            }

            // Subscription Modal
            function showSubscription() {
                document.getElementById('subscription-modal').classList.remove('hidden');
            }

            function closeSubscription() {
                document.getElementById('subscription-modal').classList.add('hidden');
            }

            // Settings Functions
            function showModeSelection() {
                alert('Chế độ học:\\n- Mới bắt đầu (A1)\\n- Cơ bản (A2) ✓\\n- Trung cấp (B1)');
            }

            function showVoiceSettings() {
                alert('Giọng nói:\\n- Emma (Nữ, Anh) ✓\\n- John (Nam, Anh)\\n- Sarah (Nữ, Mỹ)');
            }

            function showLevelSettings() {
                alert('Trình độ hiện tại: A2\\nBạn có thể thay đổi trong Profile');
            }

            function showSpeedSettings() {
                alert('Tốc độ giọng nói:\\n- Chậm (0.7x)\\n- Bình thường (1.0x) ✓\\n- Nhanh (1.3x)');
            }

            function showTopics() {
                alert('Chủ đề:\\n- Chào hỏi ✓\\n- Ăn uống\\n- Mua sắm\\n- Du lịch');
            }

            function showHelp() {
                alert('Hướng dẫn sử dụng ChattyVN:\\n1. Nghe câu mẫu\\n2. Nhắc lại bằng giọng nói\\n3. Nhận phản hồi từ AI\\n4. Tích lũy sao để mở khóa');
            }

            // Stars Chart
            function initStarsChart() {
                const ctx = document.getElementById('starsChart');
                if (!ctx || ctx.chart) return; // Prevent reinitializing

                ctx.chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
                        datasets: [{
                            label: 'Sao kiếm được',
                            data: [12, 19, 8, 15, 25, 18, 22],
                            borderColor: '#fbbf24',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { 
                                beginAtZero: true,
                                grid: { color: '#374151' },
                                ticks: { color: '#9ca3af' }
                            },
                            x: { 
                                grid: { color: '#374151' },
                                ticks: { color: '#9ca3af' }
                            }
                        }
                    }
                });
            }

            // Initialize chat when needed
            function initChat() {
                if (currentLesson) return; // Already loaded
                loadLesson();
            }

            // Initialize lesson on page load
            window.addEventListener('load', () => {
                // Start with settings page visible (matching Chatty behavior)
                showPage('settings');
            });

            // Play audio function
            function playAudio() {
                const utterance = new SpeechSynthesisUtterance("Hello, nice to meet you!");
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                speechSynthesis.speak(utterance);
            }

            // Enter key to send message (only when in chat)
            document.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !document.getElementById('chat-page').classList.contains('hidden')) {
                    sendMessage();
                }
            });

            // Quick access for testing
            window.chattyVN = { showPage, showSubscription, initChat };
            
            // Add floating chat button for easy access
            window.goToChat = () => showPage('chat');
        </script>
    </body>
    </html>
  `)
})

export default app
