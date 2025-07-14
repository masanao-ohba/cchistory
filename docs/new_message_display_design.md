# 新着メッセージ表示機能 - 設計仕様書

## 設計理念

シンプルで直感的な read/unread 概念による新着メッセージ管理

## 基本概念

- **read**: 新着でない既存メッセージ（初期表示済み、または表示済みにしたメッセージ）
- **unread**: 新着メッセージ（WebSocketで新規検知されたメッセージ）

## 詳細設計

### 1. データ構造

```javascript
// 各グループの状態管理
const groupStates = reactive(new Map()) 
// グループインデックス → { read: Message[], unread: Message[] }

interface GroupState {
  read: Message[]    // 表示済みメッセージ
  unread: Message[]  // 未表示の新着メッセージ
}
```

### 2. 処理フロー

#### 2.1 初期表示時（リロード・初回ロード）
```
1. 全てのメッセージを read に格納
2. unread は空配列で初期化
3. 全メッセージを即座に表示
4. 「新着メッセージ表示」ボタンは非表示
```

#### 2.2 WebSocket更新時（新規メッセージ検知）
```
1. 既存の read メッセージのUUIDセットを作成
2. 新しく受信したメッセージから既存UUIDを除外
3. 除外後の新規メッセージを unread に追加
4. read メッセージのみを表示（unreadは非表示）
5. unread が1件以上あるグループに「新着メッセージ表示」ボタンを表示
```

#### 2.3 「新着メッセージ表示」ボタンクリック時
```
1. 該当グループの unread メッセージを read に移動
2. unread を空配列にクリア
3. 「新着メッセージ表示」ボタンを非表示
4. 全メッセージ（元read + 元unread）を表示
```

### 3. 表示制御

#### 3.1 メッセージ表示
- 各グループで read メッセージのみを表示
- unread メッセージは「新着メッセージ表示」ボタンがクリックされるまで非表示

#### 3.2 ボタン表示条件
- `unread.length > 0` の場合に「新着メッセージ表示 (X件)」ボタンを表示
- ボタンのテキストには unread メッセージ数を表示

### 4. API設計

```javascript
// 新着メッセージマネージャー
export function useNewMessageDisplayManager() {
  const groupStates = reactive(new Map())

  return {
    // 初期状態設定
    setInitialMessages(conversations: Message[][]),
    
    // 新着メッセージ追加
    addNewMessages(conversations: Message[][]),
    
    // 表示用メッセージ取得
    getDisplayMessages(groupIndex: number): Message[],
    
    // 新着メッセージ数取得
    getUnreadCount(groupIndex: number): number,
    
    // 新着メッセージ表示
    showNewMessages(groupIndex: number),
    
    // 新着メッセージ存在チェック
    hasUnreadMessages(groupIndex: number): boolean,
    
    // デバッグ用: 状態確認
    getGroupState(groupIndex: number): GroupState,
    
    // デバッグ用: 全状態確認
    getAllStates(): Map<number, GroupState>
  }
}
```

### 5. 要件仕様

#### 5.1 機能要件
- 初期表示時は全メッセージが即座に表示される
- WebSocket更新時の新着メッセージは「新着メッセージ表示」ボタン経由でのみ表示
- 複数グループが独立して管理される
- グループごとに新着メッセージ数が正確に表示される

#### 5.2 非機能要件
- シンプルで理解しやすい状態管理
- 副作用や予期しない動作がない
- テストが容易
- デバッグが容易

### 6. テスト要件

#### 6.1 ユニットテスト
- 初期状態設定の確認
- 新着メッセージ追加の確認
- 表示切り替えの確認
- グループ独立性の確認

#### 6.2 手動テスト用デバッグ機能
- コンソールコマンドによる新着メッセージシミュレーション
- 現在の read/unread 状態の可視化
- グループ状態のリセット機能

### 7. 実装上の注意点

#### 7.1 メッセージ識別
- UUID による一意識別
- UUID がない場合の適切な処理

#### 7.2 グループ管理
- グループインデックスの一貫性
- グループの追加・削除への対応

#### 7.3 パフォーマンス
- 大量メッセージでの性能劣化防止
- メモリリークの防止

## 実装スケジュール

1. **Phase 1**: useNewMessageDisplayManager の実装
2. **Phase 2**: HomeView.vue への組み込み
3. **Phase 3**: ConversationList.vue の修正
4. **Phase 4**: デバッグ機能の追加
5. **Phase 5**: テスト追加と品質確保