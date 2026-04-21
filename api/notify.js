// api/notify.js
// Vercel Serverless Function
// 환경변수 필요: KAKAO_REST_API_KEY, KAKAO_REFRESH_TOKEN

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, phone, age, region, marketing, submittedAt } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: '이름과 연락처는 필수입니다.' });
  }

  const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
  const REFRESH_TOKEN = process.env.KAKAO_REFRESH_TOKEN;

  if (!REST_API_KEY || !REFRESH_TOKEN) {
    console.error('카카오 환경변수 누락');
    return res.status(500).json({ success: false, message: '서버 설정 오류' });
  }

  try {
    // 1단계: refresh token으로 새 access token 발급
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: REST_API_KEY,
        refresh_token: REFRESH_TOKEN
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('토큰 발급 실패:', tokenData);
      return res.status(500).json({ success: false, message: '카카오 인증 실패' });
    }

    const accessToken = tokenData.access_token;

    // 2단계: 나에게 보내기 메시지 구성
    const messageText = [
      '📋 새 상담 신청이 접수되었습니다!',
      '',
      `👤 이름: ${name}`,
      `📱 연락처: ${phone}`,
      `🎂 연령대: ${age}`,
      `📍 거주지역: ${region}`,
      `📣 마케팅 동의: ${marketing}`,
      '',
      `🕐 신청시간: ${submittedAt}`,
      '',
      '💡 빠른 연락 부탁드립니다!'
    ].join('\n');

    const template = {
      object_type: 'text',
      text: messageText,
      link: {
        web_url: 'https://thelife-xi.vercel.app',
        mobile_web_url: 'https://thelife-xi.vercel.app'
      },
      button_title: '사이트 바로가기'
    };

    // 3단계: 카카오 나에게 보내기 호출
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(template)
      })
    });

    const kakaoData = await kakaoRes.json();

    if (kakaoData.result_code === 0) {
      return res.status(200).json({ success: true, message: '알림 전송 완료' });
    } else {
      console.error('카카오 전송 실패:', kakaoData);
      return res.status(500).json({ success: false, message: `카카오 오류: ${kakaoData.msg}` });
    }

  } catch (err) {
    console.error('서버 오류:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
