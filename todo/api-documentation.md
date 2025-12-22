# AI Agent 平台接口文档

## 目录
- [1. 基础说明](#1-基础说明)
- [2. 用户管理接口](#2-用户管理接口)
- [3. Agent 配置接口](#3-agent-配置接口)
- [4. Agent 管理接口](#4-agent-管理接口)
- [5. 公共接口](#5-公共接口)

---

## 1. 基础说明

### 1.1 统一响应格式

所有接口（除SSE流式接口外）均使用统一的响应格式：

```json
{
  "code": "0000",      // 响应码："0000"成功，其他为错误码
  "info": "操作成功",   // 响应信息
  "data": {}          // 响应数据（根据具体接口返回）
}
```

**响应码说明：**
- `0000`: 操作成功
- `0001`: 业务错误
- `0002`: 系统错误
- `0003`: 参数错误
- `0401`: 未授权（未登录）
- `0403`: 禁止访问
- `0404`: 资源不存在

### 1.2 认证说明

除公共接口外，所有接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer {token}
```

Token 在用户登录或注册成功后返回。

### 1.3 跨域配置

所有接口均已配置 CORS，支持跨域访问：
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## 2. 用户管理接口

### 2.1 发送邮箱验证码

**接口地址：** `POST /client/user/email/sendCode`

**接口说明：** 发送邮箱验证码，用于邮箱注册。支持 IP、邮箱、设备指纹三重限流。

**请求参数：**

```json
{
  "email": "test@example.com",              // 必填，邮箱地址
  "deviceId": "device-fingerprint-12345"    // 可选，设备指纹（用于限流）
}
```

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": null
}
```

**使用场景：**
1. 用户在注册页面输入邮箱地址
2. 点击"发送验证码"按钮
3. 前端调用此接口发送验证码
4. 用户在邮箱中查收验证码

**错误示例：**

```json
{
  "code": "0001",
  "info": "发送频繁，请60秒后再试",
  "data": null
}
```

---

### 2.2 邮箱注册

**接口地址：** `POST /client/user/email/register`

**接口说明：** 使用邮箱和验证码注册新用户

**请求参数：**

```json
{
  "email": "test@example.com",              // 必填，邮箱地址
  "code": "123456",                         // 必填，6位数字验证码
  "password": "password123",                // 必填，密码（6-20字符）
  "username": "testuser",                   // 可选，用户名（不填则根据邮箱自动生成）
  "deviceId": "device-fingerprint-12345"    // 可选，设备指纹
}
```

**字段验证规则：**
- `email`: 必须是有效的邮箱格式
- `code`: 必须是6位数字
- `password`: 长度6-20个字符
- `username`: 可选，长度不超过20个字符，只能包含字母、数字和下划线

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": {
    "id": 12345,                            // 用户ID
    "username": "testuser",                 // 用户名
    "email": "test@example.com",           // 邮箱
    "phone": null,                          // 手机号
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // JWT Token
  }
}
```

**使用场景：**
1. 用户输入邮箱、验证码、密码等信息
2. 点击"注册"按钮
3. 前端调用此接口完成注册
4. 注册成功后获取 Token，保存至本地存储
5. 跳转到主页面

---

### 2.3 用户登录

**接口地址：** `POST /client/user/login`

**接口说明：** 用户登录，支持用户名/邮箱/手机号登录

**请求参数：**

```json
{
  "account": "testuser",                    // 必填，账号（用户名/邮箱/手机号）
  "password": "password123"                 // 必填，密码
}
```

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": {
    "id": 12345,                            // 用户ID
    "username": "testuser",                 // 用户名
    "email": "test@example.com",           // 邮箱
    "phone": "13800138000",                 // 手机号
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // JWT Token
  }
}
```

**使用场景：**
1. 用户在登录页面输入账号和密码
2. 点击"登录"按钮
3. 前端调用此接口完成登录
4. 登录成功后获取 Token，保存至本地存储（localStorage/sessionStorage）
5. 跳转到主页面

**错误示例：**

```json
{
  "code": "0001",
  "info": "用户名或密码错误",
  "data": null
}
```

---

### 2.4 获取当前用户信息

**接口地址：** `GET /client/user/info`

**接口说明：** 获取当前登录用户的详细信息

**请求参数：** 无（从 Token 中解析用户ID）

**请求头：**

```
Authorization: Bearer {token}
```

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": {
    "id": 12345,                            // 用户ID
    "username": "testuser",                 // 用户名
    "email": "test@example.com",           // 邮箱
    "phone": "13800138000",                 // 手机号
    "token": null                           // 此接口不返回新token
  }
}
```

**使用场景：**
1. 用户登录后，在个人中心页面展示用户信息
2. 页面加载时验证用户登录状态
3. 刷新用户信息

---

## 3. Agent 配置接口

这组接口主要用于拖拉拽编辑器的配置信息获取。

### 3.1 查询节点类型列表

**接口地址：** `GET /client/agent/config/node-types`

**接口说明：** 获取所有可用的节点类型及其支持的配置项，用于拖拉拽组件库

**请求参数：** 无

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": [
    {
      "nodeType": "LLM_NODE",                     // 节点类型枚举值
      "nodeTypeValue": 1,                         // 节点类型数值
      "nodeName": "大语言模型",                    // 节点展示名称
      "description": "调用大语言模型进行推理",      // 节点描述
      "icon": "🤖",                               // 节点图标（可以是emoji或图标类名）
      "supportedConfigs": [                       // 支持的配置项列表
        "MODEL",                                  // 模型配置
        "USER_PROMPT",                            // 用户提示词
        "TIMEOUT"                                 // 超时配置
      ]
    },
    {
      "nodeType": "ROUTER_NODE",
      "nodeTypeValue": 2,
      "nodeName": "路由节点",
      "description": "根据条件路由到不同分支",
      "icon": "🔀",
      "supportedConfigs": [
        "MODEL",
        "USER_PROMPT"
      ]
    },
    {
      "nodeType": "TOOL_CALL_NODE",
      "nodeTypeValue": 3,
      "nodeName": "工具调用",
      "description": "调用外部工具或API",
      "icon": "🔧",
      "supportedConfigs": [
        "MCP_TOOL",
        "TIMEOUT"
      ]
    }
  ]
}
```

**使用场景：**
1. **拖拽组件库初始化**：在编辑器左侧展示可拖拽的节点列表
2. **节点分类展示**：根据节点类型分组展示
3. **节点图标渲染**：使用 `icon` 字段渲染节点图标
4. **配置面板显示**：当用户选中某个节点后，根据 `supportedConfigs` 显示对应的配置项

**前端实现示例：**

```javascript
// 获取节点类型列表
const nodeTypes = await fetch('/client/agent/config/node-types', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());

// 渲染组件库
nodeTypes.data.forEach(nodeType => {
  // 创建可拖拽的节点组件
  const nodeComponent = {
    id: nodeType.nodeType,
    label: nodeType.nodeName,
    icon: nodeType.icon,
    description: nodeType.description,
    supportedConfigs: nodeType.supportedConfigs
  };
  
  // 添加到组件库
  addToComponentPalette(nodeComponent);
});
```

---

### 3.2 查询配置项定义

**接口地址：** `GET /client/agent/config/config-definitions`

**接口说明：** 获取配置项的类型定义和可选值列表（如模型列表、Advisor列表等）

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configType | String | 否 | 配置类型（MODEL/ADVISOR/MCP_TOOL等），不传则返回所有 |

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": [
    {
      "configType": "MODEL",                      // 配置项类型
      "configName": "模型配置",                    // 配置项名称
      "options": [                                // 可选值列表
        {
          "id": "gpt-4",                          // 选项ID
          "name": "GPT-4",                        // 选项名称
          "type": "openai",                       // 选项类型（提供商）
          "extra": {                              // 扩展属性
            "maxTokens": 8192,
            "supportsStreaming": true,
            "costPerToken": 0.00003
          }
        },
        {
          "id": "gpt-3.5-turbo",
          "name": "GPT-3.5 Turbo",
          "type": "openai",
          "extra": {
            "maxTokens": 4096,
            "supportsStreaming": true,
            "costPerToken": 0.000002
          }
        },
        {
          "id": "deepseek-chat",
          "name": "DeepSeek Chat",
          "type": "deepseek",
          "extra": {
            "maxTokens": 4096,
            "supportsStreaming": true
          }
        }
      ]
    },
    {
      "configType": "ADVISOR",
      "configName": "Advisor配置",
      "options": [
        {
          "id": "message-chat-memory",
          "name": "消息记忆",
          "type": "memory",
          "extra": {
            "description": "保存聊天历史记录"
          }
        },
        {
          "id": "vector-store-retriever",
          "name": "向量检索记忆",
          "type": "memory",
          "extra": {
            "description": "基于向量相似度检索历史记录"
          }
        }
      ]
    },
    {
      "configType": "MCP_TOOL",
      "configName": "MCP工具配置",
      "options": [
        {
          "id": "web-search",
          "name": "网页搜索",
          "type": "search",
          "extra": {
            "description": "搜索互联网信息",
            "requiredParams": ["query"]
          }
        },
        {
          "id": "weather-query",
          "name": "天气查询",
          "type": "weather",
          "extra": {
            "description": "查询天气信息",
            "requiredParams": ["location"]
          }
        }
      ]
    }
  ]
}
```

**使用场景：**
1. **动态下拉框**：当用户在配置面板选择某个配置项时，展示对应的可选值
2. **模型选择器**：在节点配置中选择使用哪个AI模型
3. **Advisor配置**：选择要使用的记忆管理器或其他增强器
4. **工具选择**：选择要调用的外部工具

**前端实现示例：**

```javascript
// 根据节点的 supportedConfigs 动态加载配置项
async function loadNodeConfigs(supportedConfigs) {
  const configs = {};
  
  for (const configType of supportedConfigs) {
    const response = await fetch(
      `/client/agent/config/config-definitions?configType=${configType}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const result = await response.json();
    configs[configType] = result.data[0];
  }
  
  return configs;
}

// 示例：加载LLM节点的配置
const llmConfigs = await loadNodeConfigs(['MODEL', 'USER_PROMPT', 'TIMEOUT']);

// 渲染配置面板
renderConfigPanel({
  modelOptions: llmConfigs.MODEL.options,
  // ... 其他配置
});
```

---

### 3.3 查询配置字段属性定义

**接口地址：** `GET /client/agent/config/config-field-definitions`

**接口说明：** 获取指定配置类型的可自定义字段列表，用于动态生成表单

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configType | String | 是 | 配置类型（MODEL/ADVISOR/MCP_TOOL/USER_PROMPT/TIMEOUT等） |

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": [
    {
      "fieldName": "model",                       // 字段名称（用于提交数据）
      "fieldLabel": "模型",                       // 字段标签（用于显示）
      "fieldType": "select",                      // 字段类型（text/number/boolean/select/textarea/json/password等）
      "required": true,                           // 是否必填
      "description": "选择要使用的AI模型",         // 字段描述
      "defaultValue": "gpt-3.5-turbo",           // 默认值
      "options": [                                // 可选项（针对select类型）
        "gpt-4",
        "gpt-3.5-turbo",
        "deepseek-chat"
      ]
    },
    {
      "fieldName": "temperature",
      "fieldLabel": "温度",
      "fieldType": "number",
      "required": false,
      "description": "控制输出的随机性，范围0-2",
      "defaultValue": 0.7,
      "options": null
    },
    {
      "fieldName": "maxTokens",
      "fieldLabel": "最大Token数",
      "fieldType": "number",
      "required": false,
      "description": "生成文本的最大长度",
      "defaultValue": 2048,
      "options": null
    },
    {
      "fieldName": "systemPrompt",
      "fieldLabel": "系统提示词",
      "fieldType": "textarea",
      "required": false,
      "description": "定义AI的角色和行为",
      "defaultValue": "你是一个有帮助的AI助手",
      "options": null
    },
    {
      "fieldName": "apiKey",
      "fieldLabel": "API密钥",
      "fieldType": "password",
      "required": true,
      "description": "模型服务商的API密钥",
      "defaultValue": null,
      "options": null
    }
  ]
}
```

**字段类型说明：**
- `text`: 单行文本输入框
- `number`: 数字输入框
- `boolean`: 开关/复选框
- `select`: 下拉选择框
- `textarea`: 多行文本输入框
- `json`: JSON编辑器
- `password`: 密码输入框

**使用场景：**
1. **动态表单生成**：根据字段定义自动生成配置表单
2. **表单验证**：使用 `required` 字段进行必填验证
3. **默认值填充**：使用 `defaultValue` 初始化表单
4. **输入类型控制**：根据 `fieldType` 渲染不同的输入组件

**前端实现示例：**

```javascript
// 获取MODEL配置的字段定义
const response = await fetch(
  '/client/agent/config/config-field-definitions?configType=MODEL',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const result = await response.json();

// 动态生成表单
function generateForm(fieldDefinitions) {
  const formFields = fieldDefinitions.map(field => {
    switch(field.fieldType) {
      case 'text':
      case 'password':
        return createTextInput(field);
      case 'number':
        return createNumberInput(field);
      case 'select':
        return createSelectInput(field);
      case 'textarea':
        return createTextareaInput(field);
      case 'boolean':
        return createCheckbox(field);
      case 'json':
        return createJsonEditor(field);
      default:
        return createTextInput(field);
    }
  });
  
  return formFields;
}

// 示例：创建下拉框
function createSelectInput(field) {
  return {
    type: 'select',
    name: field.fieldName,
    label: field.fieldLabel,
    required: field.required,
    defaultValue: field.defaultValue,
    options: field.options,
    placeholder: field.description
  };
}
```

---

## 4. Agent 管理接口

### 4.1 保存Agent配置

**接口地址：** `POST /client/agent/save`

**接口说明：** 创建或更新Agent配置，支持保存拖拉拽编辑器生成的DAG配置

**请求参数：**

```json
{
  "agentId": "agent_123456",                      // 可选，Agent ID（不传则创建新Agent）
  "agentName": "我的智能助手",                     // 必填，Agent名称
  "description": "这是一个帮助用户完成任务的智能助手",  // 可选，描述
  "graphJson": "{...}",                           // 必填，DAG配置JSON字符串（见下方示例）
  "status": 0                                     // 可选，状态（0:草稿, 1:已发布, 2:已停用）
}
```

**graphJson 数据结构示例：**

```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "LLM_NODE",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "主对话节点",
        "config": {
          "MODEL": {
            "model": "gpt-4",
            "temperature": 0.7,
            "maxTokens": 2048,
            "apiKey": "sk-xxx"
          },
          "USER_PROMPT": {
            "systemPrompt": "你是一个专业的AI助手",
            "userPromptTemplate": "{{input}}"
          }
        }
      }
    },
    {
      "id": "node_2",
      "type": "ROUTER_NODE",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "路由节点",
        "config": {
          "MODEL": {
            "model": "gpt-3.5-turbo"
          }
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "label": "默认"
    }
  ]
}
```

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": {
    "agentId": "agent_123456",                    // Agent ID
    "status": 0,                                  // 状态
    "message": "保存成功"                          // 提示信息
  }
}
```

**使用场景：**
1. **保存草稿**：用户在编辑器中配置Agent后，保存为草稿（status=0）
2. **发布Agent**：配置完成后，发布Agent（status=1）
3. **更新配置**：修改已有Agent的配置（传入agentId）
4. **自动保存**：编辑器可以定时调用此接口自动保存

**前端实现示例：**

```javascript
// 保存Agent配置
async function saveAgent(agentData) {
  // 将拖拽编辑器的数据转换为JSON字符串
  const graphJson = JSON.stringify({
    nodes: agentData.nodes,
    edges: agentData.edges
  });
  
  const response = await fetch('/client/agent/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      agentId: agentData.id,
      agentName: agentData.name,
      description: agentData.description,
      graphJson: graphJson,
      status: 0  // 保存为草稿
    })
  });
  
  return await response.json();
}

// 发布Agent
async function publishAgent(agentId) {
  // 获取当前Agent数据
  const agentData = getCurrentAgentData();
  
  // 修改状态为已发布
  agentData.status = 1;
  
  return await saveAgent(agentData);
}

// ... existing code ...

### 4.4 查询Agent详情

**接口地址：** `GET /client/agent/detail/{agentId}`

**接口说明：** 根据agentId查询Agent的详细配置信息

**请求参数：**

| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| agentId | String | Path | 是 | Agent唯一标识 |

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": {
    "agentId": "agent-123",
    "agentName": "翻译助手",
    "description": "智能翻译助手",
    "status": 0,
    "statusDesc": "草稿",
    "graphJson": "{...}",
    "createTime": "2025-12-22T10:00:00",
    "updateTime": "2025-12-22T11:00:00"
  }
}
```

**使用场景：**
1. 用户在 Agent 列表点击某个 Agent 进入编辑器
2. 前端调用此接口获取完整的 Agent 配置
3. 使用 `convertFromGraphJsonSchema` 转换数据并加载到编辑器
```

---

### 4.2 与Agent进行流式聊天

**接口地址：** `POST /client/agent/chat`

**接口说明：** 与指定Agent进行流式对话，使用SSE（Server-Sent Events）返回实时响应

**请求方式：** POST

**Content-Type：** application/json

**响应格式：** text/event-stream（SSE流）

**请求参数：**

```json
{
  "agentId": "agent_123",                         // 必填，Agent ID
  "userMessage": "你好，请帮我分析一下这个问题",    // 必填，用户消息
  "conversationId": "conversation_456"            // 可选，会话ID（不传则自动生成）
}
```

**响应数据（SSE流）：**

SSE流会实时返回AI生成的文本片段，每个片段格式如下：

```
调用发起:/client/agent/chat
接收消息:{"nodeName":"任务分析","type":"node_lifecycle","nodeId":"plan-node","status":"starting","timestamp":1766330113160}
接收消息:{"completed":false,"content":"简单任务\n\n**任务分析：**\n用户提出了一个非常直接的数学计算问题，要求计算“1+1”的结果。这是一个基础的算术运算，不涉及复杂的数据处理、逻辑判断或多步骤操作。\n\n**执行计划：**\n1. **识别计算请求：** 解析","nodeName":"计划节点","sessionId":"2002712875281551360","timestamp":1766330120692,"type":"node_execute"}
接收消息:{"completed":false,"content":"用户输入，识别出核心问题是进行“1+1”的加法运算。\n2. **执行计算：** 对数字1和1进行加法运算。\n3. **得出结果：** 1 + 1 = 2。\n4. **组织回复：** 将计算","nodeName":"计划节点","sessionId":"2002712875281551360","timestamp":1766330120710,"type":"node_execute"}
接收消息:{"completed":false,"content":"结果以友好的方式告知用户。\n\n**预期输出：**\n你好！1+1等于2。","nodeName":"计划节点","sessionId":"2002712875281551360","timestamp":1766330120710,"type":"node_execute"}
接收消息:{"nodeName":"任务分析","result":"简单任务\n\n**任务分析：**\n用户提出了一个非常直接的数学计算问题，要求计算“1+1”的结果。这是一个基础的算术运算，不涉及复杂的数据处理、逻辑判断或多步骤操作。\n\n**执行计划：**\n1. **识别计算请求：** 解析用户输入，识别出核心问题是进行“1+1”的加法运算。\n2. **执行计算：** 对数字1和1进行加法运算。\n3. **得出结果：** 1 + 1 = 2。\n4. **组织回复：** 将计算结果以友好的方式告知用户。\n\n**预期输出：**\n你好！1+1等于2。","type":"node_lifecycle","nodeId":"plan-node","durationMs":10376,"status":"completed","timestamp":1766330123537}
接收消息:{"nodeName":"任务路由","type":"node_lifecycle","nodeId":"router-node","status":"starting","timestamp":1766330124285}
接收消息:{"completed":false,"content":"simple-task-node","nodeName":"UNKNOWN","sessionId":"2002712875281551360","timestamp":1766330128514,"type":"node_execute"}
接收消息:{"nodeName":"任务路由","result":"com.zj.aiagent.shared.design.dag.NodeRouteDecision@4a8ca00b","type":"node_lifecycle","nodeId":"router-node","durationMs":5364,"status":"completed","timestamp":1766330129649}
接收消息:{"nodeName":"简单任务处理","type":"node_lifecycle","nodeId":"simple-task-node","status":"starting","timestamp":1766330130414}
接收消息:{"completed":false,"content":"你好！1+1等于2。","nodeName":"精准执行节点","sessionId":"2002712875281551360","timestamp":1766330134818,"type":"node_execute"}
接收消息:{"nodeName":"简单任务处理","result":"你好！1+1等于2。","type":"node_lifecycle","nodeId":"simple-task-node","durationMs":5560,"status":"completed","timestamp":1766330135974}
调用完成:/client/agent/chat
```

**事件类型说明：**
- `type: "node_lifecycle"`: 当前所执行的节点
- `type: "node_execute"`: 节点的响应内容
- `type: "error"`: 发生错误，包含错误信息

**使用场景：**
1. **实时对话**：用户在聊天界面发送消息，实时显示AI回复
2. **打字机效果**：逐字显示AI回复内容
3. **会话管理**：使用 `conversationId` 维护多轮对话上下文

**前端实现示例：**

```javascript
// 使用EventSource进行SSE流式对话
async function chatWithAgent(agentId, message, conversationId) {
  const response = await fetch('/client/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      agentId: agentId,
      userMessage: message,
      conversationId: conversationId
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let aiResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }

    // 解码数据
    const chunk = decoder.decode(value, { stream: true });
    
    // 处理SSE数据（可能包含多个事件）
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        
        if (data.type === 'token') {
          // 追加文本片段
          aiResponse += data.content;
          // 更新UI显示
          updateChatMessage(aiResponse);
        } else if (data.type === 'done') {
          // 对话结束，保存conversationId
          conversationId = data.conversationId;
          console.log('对话结束', conversationId);
        } else if (data.type === 'error') {
          // 处理错误
          console.error('对话错误:', data.message);
          showError(data.message);
        }
      }
    }
  }

  return { aiResponse, conversationId };
}

// 使用示例
const result = await chatWithAgent(
  'agent_123',
  '你好，请帮我分析一下这个问题',
  null  // 首次对话传null
);

// 继续对话
const result2 = await chatWithAgent(
  'agent_123',
  '继续深入分析',
  result.conversationId  // 使用之前的conversationId
);
```

**使用fetch API + ReadableStream实现（更现代的方式）：**

```javascript
async function streamChat(agentId, message, conversationId = null) {
  try {
    const response = await fetch('/client/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        agentId,
        userMessage: message,
        conversationId
      })
    });

    if (!response.ok) {
      throw new Error('网络请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEMessage(data);
          } catch (e) {
            console.error('解析SSE消息失败:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('聊天错误:', error);
    throw error;
  }
}

function handleSSEMessage(data) {
  switch(data.type) {
    case 'token':
      appendMessage(data.content);
      break;
    case 'done':
      onChatComplete(data.conversationId);
      break;
    case 'error':
      onChatError(data.message);
      break;
  }
}
```

---

### 4.3 查询当前用户的Agent列表

**接口地址：** `GET /client/agent/list`

**接口说明：** 查询当前登录用户创建的所有Agent

**请求参数：** 无（从Token中获取用户ID）

**响应数据：**

```json
{
  "code": "0000",
  "info": "操作成功",
  "data": [
    {
      "id": 1,                                    // 主键ID
      "agentName": "智能客服助手",                 // Agent名称
      "description": "专业的客服问答助手",         // 描述
      "status": 1,                                // 状态（0:草稿, 1:已发布, 2:已停用）
      "statusDesc": "已发布",                     // 状态描述
      "createTime": "2025-12-20T10:30:00",       // 创建时间
      "updateTime": "2025-12-21T15:20:00"        // 更新时间
    },
    {
      "id": 2,
      "agentName": "数据分析助手",
      "description": "帮助用户分析数据",
      "status": 0,
      "statusDesc": "草稿",
      "createTime": "2025-12-21T09:00:00",
      "updateTime": "2025-12-21T22:45:00"
    },
    {
      "id": 3,
      "agentName": "代码审查助手",
      "description": null,
      "status": 2,
      "statusDesc": "已停用",
      "createTime": "2025-12-15T14:20:00",
      "updateTime": "2025-12-20T11:30:00"
    }
  ]
}
```

**使用场景：**
1. **Agent列表页**：展示用户创建的所有Agent
2. **状态筛选**：根据状态（草稿/已发布/已停用）筛选Agent
3. **编辑入口**：点击Agent卡片进入编辑器
4. **测试入口**：点击已发布的Agent进入聊天测试

**前端实现示例：**

```javascript
// 获取Agent列表
async function getAgentList() {
  const response = await fetch('/client/agent/list', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  return result.data;
}

// 渲染Agent列表
async function renderAgentList() {
  const agents = await getAgentList();
  
  const agentCards = agents.map(agent => ({
    id: agent.id,
    name: agent.agentName,
    description: agent.description || '暂无描述',
    status: agent.statusDesc,
    statusColor: getStatusColor(agent.status),
    createTime: formatDate(agent.createTime),
    updateTime: formatDate(agent.updateTime),
    actions: {
      edit: () => editAgent(agent.id),
      test: agent.status === 1 ? () => testAgent(agent.id) : null,
      delete: () => deleteAgent(agent.id)
    }
  }));
  
  return agentCards;
}

function getStatusColor(status) {
  switch(status) {
    case 0: return 'gray';   // 草稿
    case 1: return 'green';  // 已发布
    case 2: return 'red';    // 已停用
    default: return 'gray';
  }
}
```

---

## 5. 公共接口

### 5.1 健康检查

**接口地址：** `GET /public/health`

**接口说明：** 检查服务是否正常运行（无需认证）

**请求参数：** 无

**响应数据：**

```
ok
```

**使用场景：**
1. 服务健康检查
2. 负载均衡器健康探测
3. 监控系统状态检查

---

## 附录

### A. 完整的拖拉拽流程示例

#### 步骤1：初始化编辑器

```javascript
// 1. 获取节点类型列表
const nodeTypesResponse = await fetch('/client/agent/config/node-types', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const nodeTypes = await nodeTypesResponse.json();

// 2. 渲染组件库（左侧面板）
renderComponentPalette(nodeTypes.data);
```

#### 步骤2：配置节点

```javascript
// 当用户拖拽节点到画布并双击打开配置面板时

// 1. 获取该节点支持的配置项
const selectedNode = {
  type: 'LLM_NODE',
  supportedConfigs: ['MODEL', 'USER_PROMPT', 'TIMEOUT']
};

// 2. 加载每个配置项的定义
for (const configType of selectedNode.supportedConfigs) {
  // 2.1 获取配置项的可选值列表
  const optionsResponse = await fetch(
    `/client/agent/config/config-definitions?configType=${configType}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const options = await optionsResponse.json();
  
  // 2.2 获取配置项的字段定义
  const fieldsResponse = await fetch(
    `/client/agent/config/config-field-definitions?configType=${configType}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const fields = await fieldsResponse.json();
  
  // 2.3 渲染配置表单
  renderConfigForm(configType, options.data[0], fields.data);
}
```

#### 步骤3：保存Agent

```javascript
// 当用户点击"保存"按钮时

// 1. 收集画布数据
const graphData = {
  nodes: getNodesFromCanvas(),
  edges: getEdgesFromCanvas()
};

// 2. 保存Agent配置
const saveResponse = await fetch('/client/agent/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    agentId: currentAgentId || null,
    agentName: '我的Agent',
    description: '这是一个测试Agent',
    graphJson: JSON.stringify(graphData),
    status: 0  // 保存为草稿
  })
});

const saveResult = await saveResponse.json();
console.log('保存成功，Agent ID:', saveResult.data.agentId);
```

#### 步骤4：测试Agent

```javascript
// 当用户点击"测试"按钮时

// 使用流式对话测试Agent
async function testAgent(agentId) {
  let conversationId = null;
  
  // 发送第一条消息
  const result1 = await streamChat(agentId, '你好', conversationId);
  conversationId = result1.conversationId;
  
  // 继续对话
  const result2 = await streamChat(agentId, '能帮我做什么?', conversationId);
}
```

---

### B. 数据结构说明

#### B.1 节点配置JSON结构

完整的节点配置应该包含以下内容：

```json
{
  "id": "node_unique_id",
  "type": "LLM_NODE",
  "position": {
    "x": 100,
    "y": 200
  },
  "data": {
    "label": "节点显示名称",
    "description": "节点描述",
    "config": {
      "MODEL": {
        "model": "gpt-4",
        "temperature": 0.7,
        "maxTokens": 2048,
        "apiKey": "sk-xxx",
        "systemPrompt": "你是一个AI助手"
      },
      "TIMEOUT": {
        "timeout": 30000
      }
    }
  }
}
```

#### B.2 边（连接线）JSON结构

```json
{
  "id": "edge_unique_id",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": "output",
  "targetHandle": "input",
  "label": "连接线标签",
  "type": "default",
  "animated": false
}
```

---

### C. 错误码说明

| 错误码 | 说明 | 常见原因 |
|--------|------|----------|
| 0000 | 成功 | - |
| 0001 | 业务错误 | 用户名已存在、验证码错误、Agent不存在等 |
| 0002 | 系统错误 | 服务器内部错误、数据库连接失败等 |
| 0003 | 参数错误 | 必填参数缺失、参数格式不正确等 |
| 0401 | 未授权 | 未登录或Token已过期 |
| 0403 | 禁止访问 | 无权限访问该资源 |
| 0404 | 资源不存在 | 请求的资源未找到 |

---

### D. 开发建议

#### D.1 Token管理

```javascript
// 统一的API请求封装
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  const result = await response.json();
  
  // 统一处理未授权错误
  if (result.code === '0401') {
    // Token过期，跳转到登录页
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  
  return result;
}
```

#### D.2 错误处理

```javascript
// 统一的错误处理
function handleApiError(result) {
  if (result.code !== '0000') {
    // 显示错误提示
    showErrorMessage(result.info);
    return false;
  }
  return true;
}

// 使用示例
const result = await apiRequest('/client/agent/save', {
  method: 'POST',
  body: JSON.stringify(agentData)
});

if (!handleApiError(result)) {
  return;
}

// 处理成功响应
console.log('保存成功', result.data);
```

#### D.3 状态管理建议

对于复杂的拖拉拽编辑器，建议使用状态管理库（如Zustand、Redux等）：

```javascript
// 使用Zustand管理Agent编辑器状态
import create from 'zustand';

const useAgentStore = create((set, get) => ({
  // 状态
  nodes: [],
  edges: [],
  selectedNode: null,
  agentInfo: null,
  nodeTypes: [],
  
  // Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  // 异步操作
  loadNodeTypes: async () => {
    const result = await apiRequest('/client/agent/config/node-types');
    if (result.code === '0000') {
      set({ nodeTypes: result.data });
    }
  },
  
  saveAgent: async () => {
    const { nodes, edges, agentInfo } = get();
    const graphJson = JSON.stringify({ nodes, edges });
    
    const result = await apiRequest('/client/agent/save', {
      method: 'POST',
      body: JSON.stringify({
        ...agentInfo,
        graphJson
      })
    });
    
    return result;
  }
}));
```

---

### E. 接口调用时序图

```
用户注册流程:
┌─────┐          ┌─────────┐          ┌─────────┐
│ 前端 │          │  后端   │          │  邮箱   │
└──┬──┘          └────┬────┘          └────┬────┘
   │                  │                     │
   │  发送验证码      │                     │
   ├─────────────────>│                     │
   │                  │   发送邮件           │
   │                  ├────────────────────>│
   │                  │                     │
   │  返回成功        │                     │
   │<─────────────────┤                     │
   │                  │                     │
   │  用户输入验证码  │                     │
   │                  │                     │
   │  提交注册        │                     │
   ├─────────────────>│                     │
   │                  │                     │
   │  返回Token       │                     │
   │<─────────────────┤                     │
   │                  │                     │

Agent编辑流程:
┌─────┐          ┌─────────┐
│ 前端 │          │  后端   │
└──┬──┘          └────┬────┘
   │                  │
   │  获取节点类型    │
   ├─────────────────>│
   │<─────────────────┤
   │                  │
   │  获取配置定义    │
   ├─────────────────>│
   │<─────────────────┤
   │                  │
   │  用户拖拽配置... │
   │                  │
   │  保存Agent       │
   ├─────────────────>│
   │<─────────────────┤
   │                  │

聊天流程(SSE):
┌─────┐          ┌─────────┐
│ 前端 │          │  后端   │
└──┬──┘          └────┬────┘
   │                  │
   │  发送消息(POST)  │
   ├─────────────────>│
   │                  │
   │  SSE: token      │
   │<─────────────────┤
   │  SSE: token      │
   │<─────────────────┤
   │  SSE: token      │
   │<─────────────────┤
   │  SSE: done       │
   │<─────────────────┤
   │                  │
```

---

## 总结

本接口文档涵盖了AI Agent平台的所有核心功能：

1. **用户管理**：注册、登录、用户信息查询
2. **Agent配置**：节点类型、配置项定义、字段定义查询
3. **Agent管理**：创建/更新Agent、流式聊天、Agent列表查询
4. **公共接口**：健康检查

前端开发人员可以根据这些接口实现：
- ✅ 用户认证系统
- ✅ 拖拉拽Agent编辑器
- ✅ 动态配置表单生成
- ✅ 实时聊天对话
- ✅ Agent列表管理

如有任何疑问，请随时联系后端开发团队。
