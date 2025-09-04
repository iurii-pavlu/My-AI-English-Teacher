// English Lesson Data for Vietnamese Learners
export interface Phrase {
  id: number;
  english: string;
  vietnamese: string;
  phonetic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  common_mistakes: string[];
}

export interface Lesson {
  lesson_id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  topic: string;
  intro_vi: string;
  target_phrases: Phrase[];
  cultural_context?: string;
  vietnamese_challenges: string[];
}

// Lesson Database for Vietnamese English Learners
export const lessonDatabase: Record<string, Lesson> = {
  "day_1_greetings": {
    lesson_id: "day_1_greetings",
    level: "A2",
    topic: "Greetings & Introductions",
    intro_vi: "Chào mừng đến với ChattyVN! Hôm nay chúng ta sẽ học cách chào hỏi và giới thiệu bản thân một cách tự nhiên. Đây là những câu bạn sẽ dùng hàng ngày!",
    target_phrases: [
      {
        id: 1,
        english: "Hello, nice to meet you!",
        vietnamese: "Xin chào, rất vui được gặp bạn!",
        phonetic: "/həˈloʊ naɪs tu mit yu/",
        difficulty: "easy",
        common_mistakes: ["Phát âm 'nice' thành /naɪt/", "Quên âm cuối 'you'"]
      },
      {
        id: 2,
        english: "My name is John.",
        vietnamese: "Tên tôi là John.",
        phonetic: "/maɪ neɪm ɪz dʒɑn/",
        difficulty: "easy",
        common_mistakes: ["Nhấn sai trọng âm trong 'name'"]
      },
      {
        id: 3,
        english: "Where are you from?",
        vietnamese: "Bạn đến từ đâu?",
        phonetic: "/wɛr ɑr yu frʌm/",
        difficulty: "medium",
        common_mistakes: ["Phát âm 'where' thành 'were'", "Quên âm /r/ cuối 'are'"]
      },
      {
        id: 4,
        english: "I'm from Vietnam.",
        vietnamese: "Tôi đến từ Việt Nam.",
        phonetic: "/aɪm frʌm viˈɛtnɑm/",
        difficulty: "easy",
        common_mistakes: ["Nhấn trọng âm sai ở 'Vietnam'"]
      },
      {
        id: 5,
        english: "Have a great day!",
        vietnamese: "Chúc bạn một ngày tuyệt vời!",
        phonetic: "/hæv ə greɪt deɪ/",
        difficulty: "medium",
        common_mistakes: ["Phát âm 'have' thành /həv/", "Nối âm giữa các từ"]
      }
    ],
    cultural_context: "Trong văn hóa phương Tây, việc chào hỏi thường ngắn gọn hơn Việt Nam. Không cần hỏi 'ăn cơm chưa?' mà chỉ cần 'How are you?' là đủ.",
    vietnamese_challenges: [
      "Âm /θ/ trong 'thank' - đặt lưỡi giữa răng",
      "Âm cuối trong tiếng Anh phải phát âm rõ",
      "Trọng âm từ khác với tiếng Việt"
    ]
  },

  "day_2_daily_activities": {
    lesson_id: "day_2_daily_activities",
    level: "A2", 
    topic: "Daily Activities",
    intro_vi: "Hôm nay chúng ta học cách nói về các hoạt động hàng ngày. Đây là những câu bạn sẽ dùng để kể về cuộc sống của mình!",
    target_phrases: [
      {
        id: 6,
        english: "I wake up at 7 AM.",
        vietnamese: "Tôi thức dậy lúc 7 giờ sáng.",
        phonetic: "/aɪ weɪk ʌp æt ˈsɛvən eɪ ɛm/",
        difficulty: "easy",
        common_mistakes: ["Phát âm 'wake' thành 'work'"]
      },
      {
        id: 7,
        english: "I have breakfast with my family.",
        vietnamese: "Tôi ăn sáng cùng gia đình.",
        phonetic: "/aɪ hæv ˈbrɛkfəst wɪθ maɪ ˈfæməli/",
        difficulty: "medium",
        common_mistakes: ["Âm /θ/ trong 'with'", "Phát âm 'breakfast'"]
      },
      {
        id: 8,
        english: "I go to work by motorbike.",
        vietnamese: "Tôi đi làm bằng xe máy.",
        phonetic: "/aɪ goʊ tu wɜrk baɪ ˈmoʊtərˌbaɪk/",
        difficulty: "medium",
        common_mistakes: ["Nối âm 'go to'", "Trọng âm 'motorbike'"]
      },
      {
        id: 9,
        english: "I finish work at 5 PM.",
        vietnamese: "Tôi tan làm lúc 5 giờ chiều.",
        phonetic: "/aɪ ˈfɪnɪʃ wɜrk æt faɪv pi ɛm/",
        difficulty: "easy",
        common_mistakes: ["Âm /ʃ/ cuối 'finish'"]
      },
      {
        id: 10,
        english: "I watch TV after dinner.",
        vietnamese: "Tôi xem TV sau bữa tối.",
        phonetic: "/aɪ wɑtʃ ti vi ˈæftər ˈdɪnər/",
        difficulty: "medium",
        common_mistakes: ["Phát âm 'watch' vs 'wash'", "Âm /r/ cuối 'after'"]
      }
    ],
    cultural_context: "Người phương Tây thường có lịch trình cố định và đúng giờ hơn. Việc nói về thời gian cụ thể rất quan trọng trong giao tiếp.",
    vietnamese_challenges: [
      "Thì hiện tại đơn với 'I' không cần chia động từ",
      "Giới từ thời gian: 'at' cho giờ, 'on' cho ngày",
      "Âm cuối phải phát âm rõ ràng"
    ]
  },

  "day_3_food_ordering": {
    lesson_id: "day_3_food_ordering",
    level: "A2",
    topic: "Ordering Food",
    intro_vi: "Học cách gọi món ăn tại nhà hàng! Những câu này rất hữu ích khi bạn du lịch hoặc ăn tại các nhà hàng quốc tế.",
    target_phrases: [
      {
        id: 11,
        english: "Can I see the menu, please?",
        vietnamese: "Cho tôi xem thực đơn được không?",
        phonetic: "/kæn aɪ si ðə ˈmɛnju pliz/",
        difficulty: "medium",
        common_mistakes: ["Âm /θ/ trong 'the'", "Intonation câu hỏi"]
      },
      {
        id: 12,
        english: "I'd like to order pho.",
        vietnamese: "Tôi muốn gọi phở.",
        phonetic: "/aɪd laɪk tu ˈɔrdər foʊ/",
        difficulty: "easy",
        common_mistakes: ["Rút gọn 'I would'", "Phát âm 'pho'"]
      },
      {
        id: 13,
        english: "How spicy is this dish?",
        vietnamese: "Món này cay cỡ nào?",
        phonetic: "/haʊ ˈspaɪsi ɪz ðɪs dɪʃ/",
        difficulty: "medium",
        common_mistakes: ["Âm /aɪ/ trong 'spicy'", "Âm /ʃ/ cuối 'dish'"]
      },
      {
        id: 14,
        english: "The bill, please.",
        vietnamese: "Tính tiền, xin lỗi.",
        phonetic: "/ðə bɪl pliz/",
        difficulty: "easy",
        common_mistakes: ["Âm /θ/ trong 'the'"]
      },
      {
        id: 15,
        english: "This food is delicious!",
        vietnamese: "Món ăn này ngon quá!",
        phonetic: "/ðɪs fud ɪz dɪˈlɪʃəs/",
        difficulty: "medium",
        common_mistakes: ["Trọng âm 'delicious'", "Âm /ʃ/ trong 'delicious'"]
      }
    ],
    cultural_context: "Ở phương Tây, khách hàng thường được phục vụ nhanh chóng và không cần gọi 'anh chị ơi' như ở Việt Nam. Chỉ cần nói 'excuse me' là đủ.",
    vietnamese_challenges: [
      "Câu hỏi lịch sự với 'Can I...?' 'Could you...?'",
      "Cách rút gọn 'I would' thành 'I'd'",
      "Intonation đi lên ở cuối câu hỏi"
    ]
  }
};

// Get lesson by ID
export function getLessonById(lessonId: string): Lesson | null {
  return lessonDatabase[lessonId] || null;
}

// Get daily lesson sequence
export function getDailyLesson(day: number): Lesson | null {
  const lessonIds = Object.keys(lessonDatabase);
  const index = (day - 1) % lessonIds.length;
  return lessonDatabase[lessonIds[index]] || null;
}

// Get lessons by level
export function getLessonsByLevel(level: string): Lesson[] {
  return Object.values(lessonDatabase).filter(lesson => lesson.level === level);
}

// Search lessons by topic
export function searchLessonsByTopic(topic: string): Lesson[] {
  return Object.values(lessonDatabase).filter(lesson => 
    lesson.topic.toLowerCase().includes(topic.toLowerCase())
  );
}