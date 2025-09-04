import OpenAI from 'openai';

// AI English Tutor System for Vietnamese Learners
export class AIEnglishTutor {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  // Main conversation handler
  async handleConversation(
    userMessage: string,
    lessonContext: any,
    userLevel: string = 'A2'
  ): Promise<{
    response_vi: string;
    response_en: string;
    feedback: {
      accuracy: number;
      pronunciation_tips: string[];
      stars_earned: number;
      grammar_correction?: string;
      cultural_note?: string;
    };
  }> {
    try {
      const systemPrompt = this.buildSystemPrompt(userLevel, lessonContext);
      const userPrompt = this.buildUserPrompt(userMessage, lessonContext);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        response_vi: aiResponse.response_vi || "Tốt lắm! Hãy tiếp tục luyện tập!",
        response_en: aiResponse.response_en || "Good job!",
        feedback: {
          accuracy: aiResponse.accuracy || 75,
          pronunciation_tips: aiResponse.pronunciation_tips || [],
          stars_earned: this.calculateStars(aiResponse.accuracy || 75),
          grammar_correction: aiResponse.grammar_correction,
          cultural_note: aiResponse.cultural_note
        }
      };
    } catch (error) {
      console.error('AI Tutor Error:', error);
      return this.getFallbackResponse();
    }
  }

  // Build system prompt for Vietnamese English learners
  private buildSystemPrompt(userLevel: string, lessonContext: any): string {
    return `You are ChattyVN, an AI English tutor specifically designed for Vietnamese learners. Your role is to help Vietnamese speakers learn English through interactive conversation.

CRITICAL REQUIREMENTS:
- ALWAYS respond in JSON format with required fields
- Give feedback primarily in Vietnamese (response_vi)
- Provide English model sentences (response_en)
- Address common Vietnamese→English pronunciation challenges
- Be encouraging but honest about mistakes
- Cultural sensitivity: understand Vietnamese learning context

USER LEVEL: ${userLevel}
CURRENT LESSON: ${lessonContext.topic || 'General Practice'}
TARGET PHRASES: ${JSON.stringify(lessonContext.target_phrases || [])}

VIETNAMESE PRONUNCIATION CHALLENGES TO ADDRESS:
- /th/ sound (đặt lưỡi giữa răng)
- /r/ vs /l/ confusion 
- Final consonants (Vietnamese drops many)
- /v/ vs /w/ distinction
- Stress patterns (Vietnamese is syllable-timed)

RESPONSE FORMAT (JSON only):
{
  "response_vi": "Vietnamese feedback/encouragement",
  "response_en": "Correct English model sentence",
  "accuracy": 0-100,
  "pronunciation_tips": ["specific tip 1", "tip 2"],
  "grammar_correction": "if needed",
  "cultural_note": "if relevant"
}

EXAMPLES OF GOOD VIETNAMESE FEEDBACK:
- "Tuyệt vời! Giọng của bạn rõ ràng hơn rồi! ⭐"
- "Gần đúng! Hãy chú ý âm 'th' - đặt lưỡi giữa răng nhé"
- "Perfect! Bạn đã nắm được nhịp điệu của câu rồi!"
- "Tốt! Nhưng nhớ phát âm cuối từ rõ hơn nha"

Be like a patient Vietnamese teacher who understands the cultural context and learning challenges.`;
  }

  private buildUserPrompt(userMessage: string, lessonContext: any): string {
    return `STUDENT INPUT: "${userMessage}"

LESSON CONTEXT: 
- Topic: ${lessonContext.topic || 'General'}
- Target phrase: ${lessonContext.current_target || 'None'}
- Lesson stage: ${lessonContext.stage || 'practice'}

ANALYZE THE STUDENT'S INPUT:
1. Is it attempting the target phrase correctly?
2. What pronunciation challenges does it show?
3. Are there grammar issues?
4. How can I encourage them in Vietnamese while correcting mistakes?
5. What specific tips will help this Vietnamese learner?

Provide JSON response with Vietnamese feedback, English model, accuracy score, and helpful tips.`;
  }

  // Calculate stars based on accuracy
  private calculateStars(accuracy: number): number {
    if (accuracy >= 90) return 3;
    if (accuracy >= 75) return 2;
    if (accuracy >= 60) return 1;
    return 0;
  }

  // Fallback response if AI fails
  private getFallbackResponse() {
    return {
      response_vi: "Tốt lắm! Hãy tiếp tục luyện tập nhé! 💪",
      response_en: "Keep practicing!",
      feedback: {
        accuracy: 70,
        pronunciation_tips: ["Hãy nói chậm và rõ ràng", "Chú ý phát âm từng từ một"],
        stars_earned: 1
      }
    };
  }

  // Evaluate pronunciation specifically
  async evaluatePronunciation(
    targetPhrase: string, 
    userAttempt: string, 
    difficulty: string
  ): Promise<{
    score: number;
    feedback_vi: string;
    tips: string[];
  }> {
    const prompt = `Evaluate this Vietnamese learner's English pronunciation attempt:

TARGET: "${targetPhrase}"
ATTEMPT: "${userAttempt}"
DIFFICULTY: ${difficulty}

Focus on Vietnamese→English pronunciation challenges:
- Missing final consonants
- /th/ substitution with /t/ or /f/
- /r/ vs /l/ confusion
- /v/ vs /w/ errors
- Stress pattern issues

Return JSON:
{
  "score": 0-100,
  "feedback_vi": "Vietnamese feedback",
  "tips": ["specific pronunciation tips in Vietnamese"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      return {
        score: 70,
        feedback_vi: "Tốt! Hãy thử lại để cải thiện thêm nhé!",
        tips: ["Nói chậm và rõ ràng từng từ"]
      };
    }
  }

  // Generate personalized lesson based on user's mistakes
  async generatePersonalizedLesson(
    userWeaknesses: string[],
    completedLessons: string[],
    userLevel: string
  ): Promise<any> {
    const prompt = `Create a personalized English lesson for a Vietnamese learner:

USER LEVEL: ${userLevel}
WEAKNESSES: ${userWeaknesses.join(', ')}
COMPLETED: ${completedLessons.join(', ')}

Focus on Vietnamese learning context. Create 3-5 target phrases addressing their weaknesses.

Return JSON lesson format:
{
  "lesson_id": "personalized_xxx",
  "topic": "lesson topic in English",
  "intro_vi": "Vietnamese introduction",
  "target_phrases": [
    {
      "english": "phrase",
      "vietnamese": "translation",
      "phonetic": "IPA",
      "difficulty": "easy/medium/hard"
    }
  ],
  "cultural_context": "helpful cultural note in Vietnamese"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      return null;
    }
  }
}