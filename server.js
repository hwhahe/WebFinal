const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

mongoose.connect('mongodb+srv://20213013:9W5Oj3N5ETvV4ebl@cluster0.utib0zk.mongodb.net/contest_db?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch((err) => console.error('❌ MongoDB 연결 오류:', err));

mongoose.connection.once('open', () => {
  console.log('✅ 실제 연결된 DB 이름:', mongoose.connection.db.databaseName);
});
// ✅ Contest 모델
const contestSchema = new mongoose.Schema({
  ix: Number,
  title: String,
  read_count: Number,
  img_src: String,
  info: {
    분야: String,
    응모대상: String,
    주최_주관: String,
    후원_협찬: String,
    접수마감일: String,
    총_상금: String,
    일등_상금: String,
    홈페이지: String,
    첨부파일: String
  }
});
const Contest = mongoose.model('Contest', contestSchema, 'contests');

//마감일 계산 로직
const calculateDday = (deadline) => {
  const today = new Date();
  const end = new Date(deadline);
  const diffTime = end - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✨ 폼 데이터를 받기 위한 설정 (중요)
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지
app.get('/', (req, res) => {
  res.render('main(LogX)'); // views/main(LogX).ejs
});

// (로그인O) 메인 페이지: 추천 공모전, 전체 공모전, 키워드 목록
app.get('/mainPage', async (req, res) => {
  try {
    // 추천 공모전: 조회수 많은 순으로 3개
    const recommendedContests = await Contest.find().sort({ read_count: -1 }).limit(3).lean();

    // 전체 공모전
    const contests = await Contest.find().lean();
    console.log(contests);

    // 모든 키워드 목록 (중복 없이)
    const allKeywords = await Contest.distinct('info.분야');

    // D-Day 계산
    recommendedContests.forEach(contest => {
      contest.dday = calculateDday(contest.info.접수마감일);
      contest.prize = contest.info['총 상금'];
      contest.organizer = contest.info['주최/주관'];
    });
    contests.forEach(contest => {
      contest.dday = calculateDday(contest.info.접수마감일);
      contest.prize = contest.info['총 상금'];
      contest.organizer = contest.info['주최/주관'];
    });

    // 예: 사용자별 공부 키워드 (로그인 기반에서 가져오는 값으로 가정) -> 아직 구현이 안됨(더미데이터 넣어뒀습니다)
    const userKeywords = ['영상/UCC/사진', '광고/마케팅'];

    res.render('mainPage', {
      recommendedContests,
      contests,
      userKeywords,
      allKeywords
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류!');
  }
});

// ✅ AJAX: 정렬/필터링
app.get('/contest/filter', async (req, res) => {
  const { filter, keyword } = req.query;
  let contests;

  try {
    if (filter === 'popular') {
      contests = await Contest.find().sort({ read_count: -1 }).lean();
    } else if (filter === 'recent') {
      contests = await Contest.find().sort({ _id: -1 }).lean();
    } else if (filter === 'keyword' && keyword) {
      contests = await Contest.find({
        'info.분야': { $regex: keyword, $options: 'i' }
      }).lean();
    } else {
      contests = await Contest.find().lean();
    }

    contests.forEach(contest => {
      contest.dday = calculateDday(contest.info.접수마감일);
      contest.prize = contest.info['총 상금'];
      contest.organizer = contest.info['주최/주관'];
    });

    res.json(contests);
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류!');
  }
});

// 로그인
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('[로그인]', email, password);
  res.send('로그인 처리됨!');
});

// 회원가입
app.get('/signUp', (req, res) => res.render('signUp'));
app.post('/signUp', (req, res) => {
  const { id, password, email, nickname } = req.body;
  console.log('[회원가입]', { id, password, email, nickname });
  res.send('회원가입 완료!');
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행됨: http://localhost:${PORT}`);
});
