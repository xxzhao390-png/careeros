# CareerOS API 规范

## 1. 通用规则

- 所有业务接口都在服务端识别当前用户。
- 客户端不能指定或覆盖 `user_id`。
- 请求和响应使用 JSON，文件上传除外。
- 错误响应包含可读提示 `error` 和稳定错误码 `code`。

错误示例：

```json
{
  "error": "请先登录后再使用 CareerOS",
  "code": "UNAUTHORIZED"
}
```

## 2. 当前接口

| 方法 | 地址 | 用途 |
|---|---|---|
| `GET` | `/api/v1/auth/me` | 获取当前登录用户 |
| `GET` | `/api/items` | 获取当前用户全部业务记录 |
| `POST` | `/api/items` | 新建一条业务记录 |
| `PATCH` | `/api/items/:id` | 修改当前用户的一条记录 |
| `DELETE` | `/api/items/:id` | 删除当前用户的一条记录 |
| `POST` | `/api/files` | 上传文件到当前用户空间 |
| `GET` | `/api/files/:key` | 读取当前用户拥有的文件 |
| `POST` | `/api/v1/ai/jd` | 将 JD 整理为结构化字段 |
| `POST` | `/api/v1/ai/notes` | 生成随手记整理建议 |

## 3. 新建记录示例

```json
{
  "kind": "job",
  "title": "AI 产品运营",
  "data": {
    "company": "示例公司",
    "status": "未分析"
  }
}
```

后端自动补充记录编号、当前用户编号、创建时间和更新时间。

## 4. AI 安全规则

- 输入长度有限制。
- 每位用户每天最多成功调用 20 次。
- 模型输出必须经过字段白名单和长度校验。
- 整理结果先预览，用户确认后才应用。
- API Key 只保存在部署环境，不返回浏览器。
