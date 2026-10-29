'use strict';

// Chapter 1: 사진 -> 열쇠 -> 서랍 -> 종이 조각 -> 암호 -> 일기 -> 시계 -> 휴대폰 -> 추리
const SAVE_KEY = 'room617_detective_v2';
const ITEM = {
  key: ['🗝️', '작은 열쇠'],
  photo: ['📷', '폴라로이드'],
  scrapA: ['📄', '종이 조각 A'],
  scrapB: ['📃', '종이 조각 B'],
  code: ['🧩', '완성된 쪽지'],
  diary: ['📔', '하린의 일기'],
  message: ['📱', '메시지 기록']
};
const $ = id => document.getElementById(id);
const emptyState = () => ({ items: [], selected: [], flags: {}, notes: [], started: false, hintLevel: 0 });

let state = emptyState();
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved) state = { ...emptyState(), ...saved };
} catch (error) {
  console.warn('저장 데이터를 불러오지 못했습니다.', error);
}
state.items = Array.isArray(state.items) ? state.items : [];
state.notes = Array.isArray(state.notes) ? state.notes : [];
state.flags = state.flags || {};
state.selected = [];

let currentPlace = null;
let toastTimer;
const has = id => state.items.includes(id);
const done = id => Boolean(state.flags[id]);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('저장 실패:', error); }
}
function mark(id) { state.flags[id] = true; save(); draw(); }
function note(text) {
  if (!state.notes.includes(text)) { state.notes.push(text); save(); }
}
function say(text) { $('narration').textContent = text; }
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2500);
}
function give(id) {
  if (has(id)) return;
  state.items.push(id);
  save(); draw();
  say(`${ITEM[id][1]}을(를) 보관함에 넣었다.`);
}
function removeItems(ids) {
  state.items = state.items.filter(id => !ids.includes(id));
  state.selected = [];
  save(); draw();
}
function draw() {
  const inventory = $('inventory');
  inventory.replaceChildren();
  if (!state.items.length) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = '보관함이 비어 있다.';
    inventory.append(empty);
  }
  state.items.forEach(id => {
    const button = document.createElement('button');
    button.className = `slot${state.selected.includes(id) ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(state.selected.includes(id)));
    const icon = document.createElement('span'); icon.textContent = ITEM[id][0];
    const name = document.createElement('small'); name.textContent = ITEM[id][1];
    button.append(icon, name);
    button.onclick = () => {
      state.selected = state.selected.includes(id)
        ? state.selected.filter(item => item !== id)
        : state.selected.length >= 2 ? [id] : [...state.selected, id];
      draw();
    };
    inventory.append(button);
  });
  $('selectedInfo').textContent = state.selected.length
    ? `선택: ${state.selected.map(id => ITEM[id][1]).join(' + ')}`
    : done('phoneComplete') && !done('solved')
      ? '증거 수집 완료! 상단 [추리 노트]에서 최종 추리를 진행하세요.'
      : '아이템을 선택한 다음 조사 화면에서 사용하세요.';
  $('combineBtn').disabled = state.selected.length !== 2;
  $('scene').classList.toggle('changed', done('clockSet'));
  $('chapter').textContent = done('clockSet') ? 'CHAPTER 01 · 어긋난 풍경' : 'CHAPTER 01 · 낯선 평온';
  $('time').textContent = done('clockSet') ? '18:18' : '18:17';
  // 완전히 해결한 지점은 더 이상 눌리지 않는다.
  ['rabbit', 'photos', 'bed', 'clock', 'phone', 'door'].forEach(place => {
    const target = document.querySelector(`[data-place="${place}"]`);
    if (target) target.disabled = done(`${place}Complete`);
  });
}
function modal(title, body, actions = [['닫기', closeModal]]) {
  const root = $('modalRoot'); root.replaceChildren();
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  const panel = document.createElement('div'); panel.className = 'modal';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  const heading = document.createElement('h2'); heading.textContent = title;
  const content = document.createElement('p'); content.textContent = body;
  const buttons = document.createElement('div'); buttons.className = 'modal-actions';
  actions.forEach(([label, action]) => {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = action; buttons.append(button);
  });
  panel.append(heading, content, buttons); overlay.append(panel);
  overlay.onclick = event => { if (event.target === overlay) closeModal(); };
  root.append(overlay);
}
function closeModal() { $('modalRoot').replaceChildren(); }

// 각 조사 지점은 배경을 확대해서 별도의 탐색 화면으로 보여준다.
const VIEW = {
  rabbit: { title: '벽의 토끼 그림', position: '10% 19%' },
  photos: { title: '벽에 붙은 사진', position: '18% 43%' },
  desk: { title: '책상과 서랍', position: '0% 51%' },
  clock: { title: '스탠드 옆 시계', position: '40% 54%' },
  window: { title: '창문', position: '78% 28%' },
  bed: { title: '침대', position: '9% 95%' },
  phone: { title: '휴대폰', position: '42% 89%' },
  door: { title: '출입문', position: '100% 50%' }
};
function enter(place) {
  if (done(`${place}Complete`)) return;
  currentPlace = place;
  $('detail').classList.remove('hidden');
  $('detailPhoto').style.backgroundPosition = VIEW[place].position;
  $('detailTitle').textContent = VIEW[place].title;
  renderDetail();
}
function back() {
  currentPlace = null;
  $('detail').classList.add('hidden');
  closeModal();
}
function setDetail(description, actions = []) {
  $('detailDescription').textContent = description;
  const container = $('detailActions'); container.replaceChildren();
  actions.forEach(([label, action]) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = action;
    container.append(button);
  });
}
function finish(place, message) {
  mark(`${place}Complete`);
  back();
  if (message) say(message);
}
function selected(id) { return state.selected.length === 1 && state.selected[0] === id; }

function renderDetail() {
  switch (currentPlace) {
    case 'rabbit':
      setDetail('종이 모서리가 들떠 있다. 뒷면에 무언가 적혀 있는 것 같다.', [
        ['그림 뒤집기', () => {
          note('토끼 그림 뒷면: “처음 만난 날을 기억해. 07.14.”');
          finish('rabbit', '토끼 그림 뒷면의 날짜 07.14를 기록했다.');
        }]
      ]);
      break;
    case 'photos':
      if (!done('photoTaken')) {
        setDetail('세 장의 폴라로이드. 가장 마지막 사진의 뒤쪽에서 금속성 소리가 난다.', [
          ['사진 떼어내기', () => {
            give('photo'); mark('photoTaken');
            note('폴라로이드의 날짜는 07.12, 07.13, 07.14. 마지막 사진 속 시계는 18:18.');
            renderDetail();
          }]
        ]);
      } else if (!has('key') && !done('keyUsed')) {
        setDetail('사진 뒤에서 작은 열쇠가 떨어졌다.', [
          ['열쇠 줍기', () => { give('key'); finish('photos', '사진과 열쇠를 챙겼다.'); }]
        ]);
      } else {
        finish('photos', '사진 조사를 마쳤다.');
      }
      break;
    case 'desk':
      renderDesk();
      break;
    case 'bed':
      setDetail('침대 위 인형 아래로 찢어진 종이의 끝이 보인다.', [
        ['인형 들어 올리기', () => {
          give('scrapB'); note('침대에서 종이 조각 B를 발견했다.');
          finish('bed', '종이 조각 B를 챙겼다.');
        }]
      ]);
      break;
    case 'clock':
      if (!has('diary') && !done('diaryRead')) {
        setDetail('시계는 18:17에 멈춰 있다. 정확한 시간을 알아낼 근거가 더 필요하다.');
      } else {
        setDetail('사진과 일기에 기록된 사건 시각을 비교해 보자.', [
          ['18:16', () => toast('아무 일도 일어나지 않는다.')],
          ['18:17', () => toast('여전히 아무 일도 없다.')],
          ['18:18', () => {
            note('시계를 18:18로 맞추자 방의 빛이 변하고 휴대폰이 울렸다.');
            mark('clockSet'); finish('clock', '딸깍. 조명이 깜빡이고 휴대폰에서 진동이 울렸다.');
          }]
        ]);
      }
      break;
    case 'window':
      setDetail(done('clockSet')
        ? '유리에 비친 방에는 없는 의자가 보인다. 손가락으로 쓴 문장: “그날 왜 돌아오지 않았어?”'
        : '창밖의 노을은 아름답지만 태양은 전혀 움직이지 않는다.', [
          ['관찰 기록하기', () => {
            note(done('clockSet')
              ? '창문에 나타난 문장: “그날 왜 돌아오지 않았어?”'
              : '태양이 움직이지 않는다.');
            back(); say('창문의 이상한 점을 추리 노트에 적었다.');
          }]
        ]);
      break;
    case 'phone':
      if (!done('clockSet')) {
        setDetail('휴대폰의 시각은 18:17. 새로운 메시지는 없다.');
      } else {
        setDetail(`하린의 메시지:
“서윤아, 너 아직도 그 방에 있어?”
“내가 사라진 게 아니야.”
“그날 그 방에서 나오지 못한 건…”`, [
          ['메시지 기록하기', () => {
            give('message'); note('하린의 메시지: 방에서 나오지 못한 사람은 하린이 아닐 수 있다.');
            finish('phone', '메시지를 기록했다. 이제 단서를 연결해 추리할 수 있다.');
          }]
        ]);
      }
      break;
    case 'door':
      if (done('solved')) {
        setDetail(`문이 열렸다. 복도 끝에서 하린이 기다리고 있다.
“이번에는… 나를 알아보겠어?”

CHAPTER 01 CLEAR`, [
          ['챕터 마무리', () => { mark('doorComplete'); back(); modal('CHAPTER 01 CLEAR', '복도의 시계는 여전히 18:17을 가리키고 있었다.\n\n다음 챕터에서 계속된다.'); }]
        ]);
      } else {
        setDetail(`문이 잠겨 있다. 문 너머에서 작은 목소리가 들린다.
“기억해 내야 열릴 거야.”`);
      }
      break;
  }
}
function renderDesk() {
  if (!done('drawerOpen')) {
    setDetail('책상 서랍에 작은 열쇠 구멍이 있다. 보관함에서 맞는 물건을 선택해야 한다.', [
      ['선택한 아이템 사용', () => {
        if (!selected('key')) { toast('맞는 아이템을 하나 선택해야 한다.'); return; }
        removeItems(['key']); mark('keyUsed'); mark('drawerOpen');
        say('작은 열쇠를 사용했다. 서랍이 열렸다.'); renderDesk();
      }]
    ]);
    return;
  }
  if (!done('scrapATaken')) {
    setDetail('열린 서랍 안에 종이 조각과 네 자리 자물쇠 상자가 있다.', [
      ['종이 조각 줍기', () => { give('scrapA'); mark('scrapATaken'); renderDesk(); }]
    ]);
    return;
  }
  if (!done('boxOpen')) {
    setDetail('서랍 안의 상자에는 네 자리 숫자를 입력하는 장치가 있다.', [
      ['암호 상자 열기', () => {
        if (!has('code')) { toast('먼저 찢어진 종이 두 장을 이어 붙여 보자.'); return; }
        modal('네 자리 암호', '이어 붙인 쪽지에 적힌 숫자를 입력하자.', [
          ['입력한 암호 확인', () => {
            const input = $('codeInput');
            if (input && input.value.trim() === '0714') {
              removeItems(['code']); mark('boxOpen'); closeModal(); renderDesk();
              say('암호 상자가 열렸다. 사용한 쪽지는 보관함에서 사라졌다.');
            } else toast('암호가 맞지 않는다.');
          }], ['취소', closeModal]
        ]);
        const input = document.createElement('input');
        input.id = 'codeInput'; input.maxLength = 4; input.inputMode = 'numeric';
        input.placeholder = '••••'; input.setAttribute('aria-label', '네 자리 암호');
        document.querySelector('.modal p').after(input);
      }]
    ]);
    return;
  }
  if (!done('diaryTaken')) {
    setDetail('상자 안에는 낡은 일기장이 놓여 있다.', [
      ['일기장 획득', () => { give('diary'); mark('diaryTaken'); renderDesk(); }]
    ]);
    return;
  }
  if (!done('diaryRead')) {
    setDetail(`하린의 일기:
07.12 — 노을이 너무 예쁘다.
07.13 — 시계가 18:17에 멈췄다.
07.14 — 내가 본 건 사고가 아니었다. 그날은 18:18이었다.`, [
      ['일기 내용 기록', () => {
        note('하린의 일기: 7월 14일 18:18에 사건이 있었다.');
        mark('diaryRead'); mark('deskComplete'); back();
        say('일기의 내용을 기록했다. 이제 시계를 다시 조사해 보자.');
      }]
    ]);
  } else {
    mark('deskComplete'); back();
  }
}
function combine() {
  if (state.selected.length !== 2) return;
  const pair = [...state.selected].sort().join(',');
  if (pair !== 'scrapA,scrapB') { toast('이 두 물건은 조합되지 않는다.'); return; }
  removeItems(['scrapA', 'scrapB']);
  give('code'); note('찢어진 종이를 합치자 “07 | 14”가 나타났다.');
  modal('쪽지 조합 성공', '두 종이 조각이 하나가 되었다.\n\n07 | 14\n\n재료는 사라지고 완성된 쪽지가 보관함에 들어갔다.');
}
function deduction() {
  if (done('solved')) { modal('추리 완료', '서윤은 같은 저녁을 반복하고 있었다. 추리 기록은 노트에 남아 있다. 이제 출입문을 조사하자.'); return; }
  if (!done('diaryRead') || !has('photo') || !done('phoneComplete')) {
    modal('아직 증거가 부족하다', '폴라로이드, 일기, 휴대폰 메시지를 모두 조사해 보자.');
    return;
  }
  modal('최종 추리', '7월 14일 18:18.\n이 방에 갇혀 같은 시간을 반복한 사람은 누구일까?', [
    ['하린', () => modal('추리 실패', '하린은 바깥에서 메시지를 보내고 있다. 다시 생각해 보자.', [['다시 추리', deduction], ['닫기', closeModal]])],
    ['서윤', () => {
      mark('solved'); note('진실: 방에 갇혀 같은 저녁을 반복한 사람은 서윤이었다.');
      removeItems(['photo', 'message', 'diary']);
      closeModal(); say('철컥. 출입문의 잠금장치가 풀렸다.');
      toast('최종 추리 성공! 증거는 노트에 보존됐다. 문을 조사해 보자.');
    }], ['취소', closeModal]
  ]);
}
function showNotes() {
  const evidenceReady = done('diaryRead') && has('photo') && done('phoneComplete');
  const evidenceText = evidenceReady
    ? '세 증거가 준비됐다. 아래의 [최종 추리하기]를 눌러 사건의 진실을 판단하자.\n\n'
    : '사진, 일기, 메시지 기록을 모아 사건 시각과 진술을 비교하자.\n\n';
  const records = state.notes.length
    ? state.notes.map((text, index) => `${index + 1}. ${text}`).join('\n\n')
    : '아직 기록된 증거가 없다.';
  modal('추리 노트', evidenceText + records, [
    ['최종 추리하기', deduction], ['닫기', closeModal]
  ]);
}

function showHint() {
  const hints = [
    !has('key') && !done('keyUsed') ? '벽에 붙은 사진을 자세히 조사해 보자.' :
    !done('drawerOpen') ? '열쇠를 선택한 다음 책상 화면에서 사용하자.' :
    !done('scrapATaken') ? '열린 서랍 안에 아직 챙기지 않은 물건이 있다.' :
    !done('bedComplete') ? '침대의 인형 아래를 살펴보자.' :
    !has('code') && !done('boxOpen') ? '종이 조각 두 개를 선택해 조합하자.' :
    !done('diaryRead') ? '서랍 속 상자와 일기장을 조사하자.' :
    !done('clockSet') ? '사진과 일기의 시간은 18:18을 가리킨다.' :
    !done('phoneComplete') ? '휴대폰에 새로운 메시지가 도착했다.' :
    !done('solved') ? '추리 노트에서 최종 추리를 시도하자.' : '출입문으로 가 보자.',
    '이미 얻은 물건은 보관함에서 선택해 다른 조사 화면에 사용할 수 있다.',
    '모든 단서를 찾았다면 추리 노트의 최종 추리를 선택해 보자.'
  ];
  const level = state.hintLevel % hints.length;
  modal(`힌트 ${level + 1}`, hints[level], [
    ['다음 힌트', () => { state.hintLevel += 1; save(); showHint(); }], ['닫기', closeModal]
  ]);
}
function resetGame() {
  if (!confirm('진행 상황을 지우고 처음부터 시작할까요?')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

document.querySelectorAll('.hot').forEach(button => {
  button.addEventListener('click', () => enter(button.dataset.place));
});
$('backBtn').onclick = back;
$('notesBtn').onclick = showNotes;
$('hintBtn').onclick = showHint;
$('resetBtn').onclick = resetGame;
$('combineBtn').onclick = combine;
$('clearBtn').onclick = () => { state.selected = []; draw(); };
$('startBtn').onclick = () => {
  state.started = true; save(); $('intro').remove();
};
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if ($('modalRoot').children.length) closeModal();
    else if (currentPlace) back();
  }
});
if (state.started) $('intro').remove();
draw();
