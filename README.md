# VocabMaster v2

수능 영어 단어장 + 지문 학습 앱 (React + Vite + Supabase)

---

## 📁 프로젝트 구조

```
vocab-app-v2/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Layout.jsx        # 사이드바 네비게이션
│   │       └── UI.jsx            # Modal, FreqStars, Empty, Confirm, PageHeader
│   ├── hooks/
│   │   ├── useAuth.js            # Supabase Auth
│   │   ├── useWords.js           # 단어 CRUD + SM-2
│   │   ├── usePassages.js        # 지문 CRUD + 번역
│   │   └── useWrongAnswers.js    # 오답노트
│   ├── lib/
│   │   ├── context.jsx           # AuthContext, ToastContext
│   │   ├── sm2.js                # Spaced repetition algorithm
│   │   └── translate.js          # DeepL / Papago 번역
│   ├── pages/
│   │   ├── LoginPage.jsx         # /login
│   │   ├── LibraryPage.jsx       # /library
│   │   ├── VocabPage.jsx         # /vocab
│   │   ├── TestPage.jsx          # /test
│   │   ├── WrongPage.jsx         # /wrong
│   │   ├── StatsPage.jsx         # /stats
│   │   └── AdminPage.jsx         # /admin
│   ├── supabase/
│   │   ├── client.js             # Supabase 클라이언트
│   │   └── schema.sql            # DB 스키마 (Supabase에서 실행)
│   ├── App.jsx                   # React Router 설정
│   ├── main.jsx
│   └── index.css                 # 다크모드 스타일
├── supabase/
│   └── functions/
│       └── translate/
│           └── index.ts          # Papago용 Edge Function (선택)
├── .env.example
├── vite.config.js
└── package.json
```

---

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com) → 새 프로젝트 생성
2. **SQL Editor** → `src/supabase/schema.sql` 전체 내용 붙여넣고 실행
3. **Project Settings → API** → URL과 anon key 복사

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 수정:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_DEEPL_API_KEY=your-deepl-key:fx   # DeepL Free 키 (선택)
```

### 4. DeepL API 키 발급 (무료, 권장)

1. [deepl.com/pro](https://www.deepl.com/pro) → DeepL API Free 가입
2. 월 500,000자 무료
3. API Key 복사 → `.env`의 `VITE_DEEPL_API_KEY`에 입력
4. Free 키는 `:fx`로 끝남 (예: `abc123:fx`)

### 5. 개발 서버 실행

```bash
npm run dev
```

---

## 🌐 배포 (GitHub Pages / Netlify / Vercel)

### Vercel (권장)

```bash
npm run build
# Vercel CLI 또는 GitHub 연동
```

환경 변수를 Vercel 대시보드에서도 설정하세요.

### Netlify

```bash
npm run build
# dist 폴더를 Netlify에 드래그 앤 드롭
```

`netlify.toml` 추가 (SPA 라우팅):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

```bash
npm install --save-dev gh-pages
```

`vite.config.js`에 `base: '/repo-name/'` 추가 후:
```bash
npm run build
npx gh-pages -d dist
```

---

## 🛡️ 관리자 계정

회원가입 시 **사용자 이름을 `vocabmanager`** 로 설정하면 자동으로 `admin` 역할이 부여됩니다.

관리자 기능:
- 전체 사용자 조회
- 사용자별 단어장 조회
- 사용자별 지문 조회
- 사용자 삭제

---

## 📱 지원 브라우저

- Chrome ✅
- Safari ✅ (iOS 포함)
- Edge ✅
- Firefox ✅

---

## 🔧 주요 기능

| 기능 | 설명 |
|------|------|
| 단어장 | CRUD, 수능 빈출도(★★★), SM-2 간격 반복 |
| 지문 | 저장 시 DeepL 자동 번역, 원문↔번역 전환 |
| 테스트 | 객관식 / 빈칸 / 플래시카드 3가지 모드 |
| 오답노트 | 틀린 단어 자동 기록, 해결 처리 |
| 통계 | 학습 현황, 빈출도 분포, 테스트 기록 |
| 관리자 | 사용자 관리 (role=admin) |
| 인증 | Supabase Auth (이메일/비밀번호) |

---

## 🗄️ DB 스키마

- `profiles` — 사용자 프로필 (username, role)
- `words` — 단어 (SM-2 필드 포함, suneung_freq)
- `passages` — 지문 (content + translation)
- `wrong_answers` — 오답 기록
- `test_sessions` — 테스트 세션 기록

모든 테이블에 Row Level Security(RLS) 적용.
