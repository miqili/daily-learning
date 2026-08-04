# API 参考

## 基本信息

| 项 | 值 |
| --- | --- |
| Base URL | `http://localhost:3000/api/v1` |
| 认证方式 | JWT Bearer Token |
| 响应格式 | `{ code, message, data }` |
| 全局前缀 | `/api/v1` |

除注册和登录外，所有接口需在 Header 中携带：

```
Authorization: Bearer <JWT>
```

## Auth — 账户

### POST /auth/register

注册新用户。

**请求体：**

```json
{
  "username": "string",
  "password": "string",
  "exam_date": "2026-10-24"   // 可选
}
```

**响应 data：**

```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "demo",
    "role": "USER",
    "exam_date": "2026-10-24",
    "plan_start_date": null
  }
}
```

### POST /auth/login

登录。

**请求体：**

```json
{
  "username": "string",
  "password": "string"
}
```

**响应：** 同 register

### GET /auth/me

获取当前登录用户信息。需 JWT。

---

## Tasks — 70 天计划

### POST /tasks/init-plan

初始化 70 天备考计划（会清除旧计划）。需 JWT。

**请求体：**

```json
{
  "exam_date": "2026-10-24"
}
```

**响应 data：**

```json
{
  "plan_start_date": "2026-08-16",
  "exam_date": "2026-10-24",
  "total_tasks_created": 210
}
```

### GET /tasks/summary

获取计划全局摘要。需 JWT。

**响应 data：**

```json
{
  "exam_date": "2026-10-24",
  "plan_start_date": "2026-08-16",
  "current_day": 15,
  "completed_tasks": 42,
  "total_tasks": 210,
  "progress": 20,
  "days_remaining": 55,
  "initialized": true
}
```

### GET /tasks/day/:dayNumber

获取指定天任务。`dayNumber` 范围 1–70。需 JWT。

**响应 data：**

```json
{
  "day_number": 15,
  "task_date": "2026-08-30",
  "tasks": [
    {
      "id": 43,
      "subject": "POLITICS",
      "content": "背诵新时代思想简答条目...",
      "target_tag": "新时代思想",
      "is_completed": false,
      "completed_at": null
    }
  ]
}
```

### PATCH /tasks/:id/completion

更新任务完成状态。需 JWT。

**请求体：**

```json
{
  "is_completed": true
}
```

---

## Questions — 题库

### GET /questions/search

搜索题目。需 JWT。

**Query 参数：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| subject | string | POLITICS / ENGLISH / MATH |
| tag | string | 考点标签（模糊） |
| keyword | string | 题干或标签关键词 |
| limit | number | 返回条数，默认 20 |

**响应 data：**

```json
{
  "total": 5,
  "list": [
    {
      "id": 1,
      "paper_id": 1,
      "subject": "MATH",
      "year": 2025,
      "question_type": "SINGLE",
      "point_tag": "求导公式",
      "content": "2025 年高数（一）求导公式练习示例...",
      "options": [{ "key": "A", "text": "0" }],
      "answer": "C",
      "score": 5
    }
  ]
}
```

### GET /questions/papers

获取试卷列表。需 JWT。

### GET /questions/papers/:id

获取试卷详情（含题目，**不含 answer**）。需 JWT。

---

## Exams — 模考

### POST /exams/:paperId/submit

提交模考答卷。需 JWT。

**请求体：**

```json
{
  "answers": {
    "1": "C",
    "2": "A"
  },
  "subjective_score": 30,
  "time_spent_secs": 5400
}
```

**响应 data：**

```json
{
  "record_id": 1,
  "objective_score": 10,
  "subjective_score": 30,
  "total_score": 40,
  "total_questions": 2,
  "correct_count": 1,
  "wrong_question_ids": [2],
  "message": "客观题已自动批改，错题已自动推送到错题消灭队列！"
}
```

---

## Mistakes — 错题

### GET /mistakes/review-queue

获取到期复习队列（mastery_level < 4 且 next_review_at <= now）。需 JWT。

**响应 data：**

```json
{
  "total": 3,
  "list": [
    {
      "id": 1,
      "mastery_level": 0,
      "next_review_at": "2026-08-03T12:00:00.000Z",
      "review_count": 0,
      "user_notes": null,
      "question": {
        "id": 2,
        "subject": "MATH",
        "year": 2025,
        "point_tag": "求导公式",
        "content": "...",
        "options": [...],
        "answer": "C"
      }
    }
  ]
}
```

### PATCH /mistakes/:id/review

提交复习结果。需 JWT。

**请求体：**

```json
{
  "correct": true,
  "notes": "已理解复合求导链式法则"
}
```

**响应 data：** 更新后的错题记录（结构同 review-queue 中的 list 项）

---

## 错误响应

NestJS 标准 HTTP 状态码：

| 状态码 | 场景 |
| --- | --- |
| 400 | 参数校验失败 |
| 401 | 未登录或 JWT 无效 |
| 404 | 资源不存在 |
| 409 | 用户名冲突 |

错误体示例：

```json
{
  "statusCode": 400,
  "message": "dayNumber 仅支持 1 至 70。",
  "error": "Bad Request"
}
```
