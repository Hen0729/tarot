# Firebase 設定（跨裝置同步）

## 1. 建立專案

1. 打開 [Firebase Console](https://console.firebase.google.com/)
2. 新增專案 → 新增 **Web App**
3. 複製 `firebaseConfig` 物件

## 2. 啟用服務

- **Authentication** → Sign-in method → 啟用 **Email/Password**
- **Firestore Database** → 建立資料庫（可先選測試模式，再改規則）
- **Storage** → 建立（同樣先測試模式再改規則）

## 3. 授權網域

Authentication → Settings → Authorized domains 加入：

- `hen0729.github.io`
- `localhost`（本機測試）

## 4. 填入設定

任選一種：

**A.** 編輯 `index.html` 裡的 `FIREBASE_CONFIG`  
**B.** 網站右上角「雲端設定」貼上整段 JSON（存在本機，不進 Git）

## 5. 安全規則（建議）

### Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### Storage

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 6. 使用

1. 打開 https://hen0729.github.io/tarot/
2. 註冊一組 Email／密碼並登入
3. 上傳牌面、抽牌紀錄會同步到雲端
4. 換裝置用同一帳號登入即可拉取
