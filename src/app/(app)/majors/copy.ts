export const majorsCopy = {
  en: {
    title: "Major Explorer", intro: "Choosing a major? See which departments' students are helping freshmen, what they help with, and the seniors you can meet.",
    helpers: (n: number) => `${n} ${n === 1 ? "helper" : "helpers"}`, helped: (n: number) => `${n} people helped`, perks: (n: number) => `${n} ${n === 1 ? "perk" : "perks"}`,
    top: "Most helped", none: "No departments to show yet. Add your department in your profile and offer a topic!", open: "Open",
    deptHelpers: "Students who help", noHelpers: "No helpers yet.", deptPerks: "Meet someone from this department", noPerks: "No perks from this department yet.",
    claim: "Claim with credits", claimed: "Claimed", ask: "Ask a senior about this major", askNote: "Opens the ask form with “Choosing a major” selected.",
    feedback: { claimed: "Claimed! Check your wallet.", already: "You've already claimed this.", credit: "Not enough credits once your open requests are counted.",
      full: "All places are taken.", unavailable: "Couldn't claim. Please try again.", login: "Please sign in again.", "": "" } as Record<string, string>,
    all: "← All departments", unavailable: "Couldn't load Major Explorer. Please try again.", back: "← HelpLoop", entered: (y: number) => `Entered ${y}`,
  },
  ko: {
    title: "전공 탐색", intro: "전공을 고민 중인가요? 어느 학과 학생들이 신입생을 돕고 있는지, 무엇을 돕는지, 만날 수 있는 선배를 확인해 보세요.",
    helpers: (n: number) => `도우미 ${n}명`, helped: (n: number) => `${n}명을 도움`, perks: (n: number) => `혜택 ${n}개`,
    top: "많이 도운 과목", none: "아직 보여 줄 학과가 없어요. 프로필에 학과를 입력하고 주제를 골라 주세요!", open: "보기",
    deptHelpers: "도와주는 학생", noHelpers: "아직 도우미가 없어요.", deptPerks: "이 학과 사람 만나기", noPerks: "아직 이 학과의 혜택이 없어요.",
    claim: "크레딧으로 신청", claimed: "신청 완료", ask: "이 전공에 대해 선배에게 묻기", askNote: "‘전공 선택 상담’이 선택된 요청 양식이 열려요.",
    feedback: { claimed: "신청했어요! 지갑을 확인해 주세요.", already: "이미 신청했어요.", credit: "진행 중인 요청을 빼면 크레딧이 부족해요.",
      full: "정원이 찼어요.", unavailable: "신청하지 못했어요. 다시 시도해 주세요.", login: "다시 로그인해 주세요.", "": "" } as Record<string, string>,
    all: "← 전체 학과", unavailable: "전공 탐색을 불러오지 못했어요. 다시 시도해 주세요.", back: "← HelpLoop", entered: (y: number) => `${y}학번`,
  },
};
