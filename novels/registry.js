/* 小說註冊表
   新增一部小說時：
   1. 在 novels/ 下建立該小說資料夾（data.js 與 images/）
   2. 在 categories 補上類別（若為新類別）
   3. 在 novels 加一筆
   沒有任何小說的類別不會顯示頁籤。 */
window.NOVEL_REGISTRY = {
  categories: ['冒險', '偵探'],
  novels: [
    { id: 'adventure001', dir: 'novels/adventure001' }
  ]
};
