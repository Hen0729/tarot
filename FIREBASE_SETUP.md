# Firebase 設定（跨裝置同步）

## 1. 建立專案

1. 打開 [Firebase Console](https://console.firebase.google.com/)
2. 新增專案 → 新增 **Web App**（暱稱隨意；**不要勾** Firebase 託管）
3. 註冊後複製畫面上的 `firebaseConfig`

## 2. 寫進程式

編輯 `index.html`，找到：

```js
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  ...
};
```

把值換成你複製的那組，存檔後 `git push`。

## 3. 啟用服務

- **Authentication** → 登入方式 → 啟用 **Email/Password**
- **Firestore** → 建立資料庫
- **Storage** → 建立

## 4. 授權網域

Authentication → Settings → Authorized domains 加入：`hen0729.github.io`

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

打開 https://hen0729.github.io/tarot/ → **登入雲端** → 註冊／登入。
