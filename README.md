# 韓哥的小說庫

本專案計畫將數篇具有多結局的互動式小說製作成網頁應用。

互動式小說: 從初始篇章開始，每章最後都有一個選擇題，讓玩家必須帶入故事主人公去做出抉擇。故事會依照玩家的選擇內容進入對應的篇章，直至進入其中一個結局而結束。

**線上閱讀 → https://howard-han.github.io/dynamic_novel/**

目前收錄:

| 類別 | 小說 | 篇章 / 結局 |
|---|---|---|
| 冒險 | 失去記憶的我，如何在這座奇異的島上生存? | 19 / 10 |

## 本機預覽

純 HTML/CSS/JS，沒有建置流程、不依賴 `fetch`，直接用瀏覽器開啟 `index.html` 即可。
若想用伺服器跑: `python -m http.server 8321`，再開 `http://localhost:8321`。

## 專案結構

```
index.html                  首頁 / 訊息框 / 閱讀頁 / 過場的 DOM
assets/css/style.css        深色閱讀風樣式 (含手機版)
assets/js/engine.js         劇情引擎: 旗標、分支、條件段落
assets/js/app.js            書架、訊息框、閱讀流程、過場動畫
novels/registry.js          小說註冊表
novels/<id>/data.js         該小說的全文與路由 (網站讀這份)
novels/<id>/images/         該小說的結局圖
novel/<類別>/<小說>/        寫作原稿 (設定、劇情樹狀圖、文本 md)
.claude/                    專案規則、skill 與 agent
```

`novel/` 是寫作用的原稿，`novels/` 是網站實際讀取的資料。兩者需手動保持同步——文本改了，`data.js` 也要跟著改。

## 如何新增一部小說

每部小說都是獨立的，新增時不需要改動既有小說或引擎。流程分成寫作與上線兩段。

### 一、寫作 (在 `novel/` 底下)

1. 建立 `novel/<類別>/<小說名>/`，放入 6 個檔案。前 4 個要先寫好內容，後 2 個先留空白:
   `主要設定.md`、`必要要素設定.md`、`角色設定.md`、`結局設定.md`、`篇章文本.md`、`結局文本.md`
   格式規範見 `.claude/rules/novel_folders.md`。
2. 執行 `/novel-precheck` 確認檔案齊全、設定有內容、文本為空白。
3. 執行 `/story-tree` 製作劇情樹狀圖: 篇章節點、選擇題、旗標、結局判定，討論定案後存成該資料夾的 `劇情樹狀圖.md`。
4. 執行 `/write-chapters` 依劇情圖撰寫各篇章與結局文本，完成後回補 `主要設定.md` 的小說簡介。
   寫作規則 (字數下限、篇章結尾的抉擇心理、劇情解鎖時機) 見 `.claude/rules/writing_details.md`。

隨時可用 `story-validator` agent 做獨立審查，檢查結局可達性、旗標一致性、字數與劇情衝突。

### 二、上線 (在 `novels/` 底下)

5. 建立 `novels/<id>/data.js`，把文本與路由轉成引擎的資料格式 (見下節)，結局圖放進 `novels/<id>/images/`。
6. 在 `novels/registry.js` 加一筆:

```js
window.NOVEL_REGISTRY = {
  categories: ['冒險', '偵探'],
  novels: [
    { id: 'adventure001', dir: 'novels/adventure001' }
  ]
};
```

`categories` 決定頁籤順序；沒有任何小說的類別不會顯示頁籤，所以可以先把未來的類別寫進去。

## data.js 的資料格式

```js
window.NOVEL_DATA['<id>'] = {
  id, category, title, intro,
  start: 'c01',                      // 初始篇章
  chapters: { c01: { ... } },
  endings:  { e01: { ... } }
};
```

**篇章**

```js
c05: {
  num: '篇章05', title: '草叢中的刀刃',
  enterSet: ['metAdele'],            // 進入此章即設定的旗標
  text: [
    '一般段落……',
    { if: 'adele', text: '只在旗標成立時顯示的段落' }
  ],
  question: '面對愛戴兒的要求，你要怎麼做？',
  options: [ ... ]
}
```

**結局**: `num`、`title`、`image` (相對於該小說資料夾)、`text` (同樣支援條件段落)。

**選項**的四種寫法:

```js
{ label: '...', to: 'c07' }                          // 直接前往
{ label: '...', set: ['adele'], to: 'c07' }          // 設旗標後前往
{ label: '...', requires: 'momAlong', to: 'c11' }    // 旗標成立時才顯示此選項
{ label: '...', branch: [                            // 依旗標決定去向，由上而下取第一個成立的
    { if: ['adele', 'rescued'], to: 'e10' },
    { if: 'adele', to: 'e09' },
    { to: 'e08' }                                    // 無條件 = 預設
] }
```

`branch` 的每一條也可以帶自己的 `set`，用來表達「條件成立才設旗標」(例如救援成功)。

**條件**在選項、分支、段落通用，共三個鍵:

| 鍵 | 意義 |
|---|---|
| `if` | 旗標名稱，或陣列 (全部成立) |
| `ifAny` | 陣列，任一成立 |
| `ifNot` | 旗標名稱，不成立時 |

旗標是布林值、只增不減，玩家按「重新再讀一次」時全部清空。

> 注意 `enterSet` 與條件段落的先後順序: `enterSet` 在渲染前就生效，所以同一章裡不能用 `ifNot` 去判斷自己 `enterSet` 設定的旗標。冒險001 的篇章15 就是這種情況 (伊凡未同行時才現身)，因此那章的旗標改設在兩個選項上，而非 `enterSet`。

## 設計風格與開發規則

網站的 UI/UX 規格 (書架、訊息框、過場動畫、結局呈現) 定義在 `CLAUDE.md` 的「設計風格」一節；程式開發規則見 `.claude/rules/coding_rules.md`。
