# Firebase 設定（跨裝置同步）

網站不顯示登入畫面：在 `index.html` 填好設定後會**自動登入並同步**。

## 1. 建立專案

1. [Firebase Console](https://console.firebase.google.com/) 新增專案
2. 新增 **Web App**（不要勾託管）→ 複製 `firebaseConfig`
3. Authentication → 啟用 **Email/Password**
4. 建立 **Firestore**、**Storage**
5. Authentication → Settings → Authorized domains 加入 `hen0729.github.io`

## 2. 寫進 index.html

找到並填入：

```js
const FIREBASE_CONFIG = { /* 貼上 Console 的 config */ };
const FIREBASE_AUTH = {
  email: "你的信箱@example.com",
  password: "你的密碼",
};
```

存檔後 `git push`。首次開啟網站會自動註冊／登入該帳號並同步。

## 3. 安全規則（建議）

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

注意：帳密寫在前端原始碼裡，只適合**單人私用**網站；不要用重要密碼。
