# AI Agent 平台前端开发提示词

## 项目概述

你需要开发一个**拖拉拽的AI Agent自定义平台**，允许用户通过可视化界面创建和配置AI智能体。

## 核心功能

### 1. 用户系统
- 邮箱注册（带验证码）
- 用户登录
- Token认证管理

### 2. Agent编辑器（核心功能）
- 拖拽式节点编辑器
- 节点配置面板
- 动态表单生成
- 画布保存/加载

### 3. Agent管理
- Agent列表展示
- Agent状态管理（草稿/已发布/已停用）
- Agent测试对话

## 技术栈建议

### 推荐方案
```
- 框架: React 18+ / Vue 3+
- 拖拽编辑器: React Flow / Vue Flow
- 状态管理: Zustand / Pinia
- UI组件库: Ant Design / Element Plus / Shadcn UI
- HTTP客户端: Axios
- 表单验证: React Hook Form + Zod / VeeValidate
- 样式方案: Tailwind CSS
- 流式数据: EventSource / Fetch API
```

## 接口文档

请参考 `api-documentation.md` 文件，其中包含：
- 14个RESTful API接口
- 完整的请求/响应数据结构
- 使用场景和示例代码
- SSE流式对话实现

## 页面结构

```
/
├── /login                    # 登录页
├── /register                 # 注册页
├── /dashboard                # 仪表盘（Agent列表）
├── /agent/editor/:id?        # Agent编辑器（创建/编辑）
└── /agent/chat/:id           # Agent聊天测试页
```

## 开发任务清单

### Phase 1: 用户认证 (1-2天)

**任务：**
1. 实现登录页面
   - 账号密码表单
   - 表单验证
   - 调用 `POST /client/user/login`
   - 保存Token到localStorage
   
2. 实现注册页面
   - 邮箱输入 + 发送验证码按钮
   - 倒计时功能（60秒）
   - 验证码输入
   - 密码设置
   - 调用 `POST /client/user/email/sendCode`
   - 调用 `POST /client/user/email/register`

3. Token管理
   - 创建axios实例，自动携带Token
   - 实现401拦截，跳转登录
   - 刷新页面时验证Token有效性

**代码示例：**

```typescript
// src/utils/request.ts
import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// 请求拦截器 - 添加Token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理401
request.interceptors.response.use(
  response => {
    const { code, info, data } = response.data;
    if (code === '0401') {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('未授权'));
    }
    if (code !== '0000') {
      return Promise.reject(new Error(info));
    }
    return data;
  },
  error => {
    return Promise.reject(error);
  }
);

export default request;
```

---

### Phase 2: Agent列表页 (1天)

**任务：**
1. 创建Dashboard页面
2. 调用 `GET /client/agent/list` 获取列表
3. 以卡片形式展示Agent
4. 实现状态筛选（全部/草稿/已发布/已停用）
5. 添加"新建Agent"按钮，跳转编辑器

**UI要求：**
- 显示Agent名称、描述、状态
- 显示创建时间、更新时间
- 提供"编辑"、"测试"、"删除"操作按钮
- 已发布的Agent才显示"测试"按钮

**代码示例：**

```typescript
// src/api/agent.ts
import request from '@/utils/request';

export const getAgentList = () => {
  return request.get('/client/agent/list');
};

// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { getAgentList } from '@/api/agent';

function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [filter, setFilter] = useState('all'); // all, draft, published, disabled

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const data = await getAgentList();
    setAgents(data);
  };

  const filteredAgents = agents.filter(agent => {
    if (filter === 'all') return true;
    if (filter === 'draft') return agent.status === 0;
    if (filter === 'published') return agent.status === 1;
    if (filter === 'disabled') return agent.status === 2;
    return true;
  });

  return (
    <div>
      {/* 筛选器 */}
      <div>
        <button onClick={() => setFilter('all')}>全部</button>
        <button onClick={() => setFilter('draft')}>草稿</button>
        <button onClick={() => setFilter('published')}>已发布</button>
        <button onClick={() => setFilter('disabled')}>已停用</button>
      </div>

      {/* Agent卡片列表 */}
      <div className="grid grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* 新建按钮 */}
      <button onClick={() => navigate('/agent/editor')}>
        + 新建Agent
      </button>
    </div>
  );
}
```

---

### Phase 3: 拖拽编辑器框架 (2-3天)

**任务：**
1. 集成React Flow / Vue Flow
2. 创建左侧组件库面板
3. 实现节点拖拽到画布功能
4. 实现节点连线功能
5. 实现节点选中/删除/复制功能

**核心功能：**
- 从 `GET /client/agent/config/node-types` 获取可用节点类型
- 渲染组件库（显示节点图标、名称、描述）
- 支持拖拽节点到画布
- 支持节点之间连线
- 支持画布缩放、平移

**代码示例：**

```typescript
// src/pages/AgentEditor.tsx
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

function AgentEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeTypes, setNodeTypes] = useState([]);

  // 加载节点类型
  useEffect(() => {
    loadNodeTypes();
  }, []);

  const loadNodeTypes = async () => {
    const data = await request.get('/client/agent/config/node-types');
    setNodeTypes(data);
  };

  // 处理节点拖拽
  const onDrop = useCallback((event) => {
    event.preventDefault();
    
    const nodeType = event.dataTransfer.getData('nodeType');
    const position = reactFlowInstance.project({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: getNodeLabel(nodeType),
        config: {}
      }
    };

    setNodes((nds) => [...nds, newNode]);
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  return (
    <div className="h-screen flex">
      {/* 左侧组件库 */}
      <div className="w-64 bg-gray-100 p-4">
        <h2>节点库</h2>
        {nodeTypes.map(nodeType => (
          <div
            key={nodeType.nodeType}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('nodeType', nodeType.nodeType);
            }}
            className="p-3 mb-2 bg-white rounded cursor-move"
          >
            <div className="text-2xl">{nodeType.icon}</div>
            <div className="font-bold">{nodeType.nodeName}</div>
            <div className="text-sm text-gray-500">{nodeType.description}</div>
          </div>
        ))}
      </div>

      {/* 画布区域 */}
      <div className="flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* 右侧配置面板 */}
      <div className="w-80 bg-gray-50 p-4">
        {selectedNode && <NodeConfigPanel node={selectedNode} />}
      </div>
    </div>
  );
}
```

---

### Phase 4: 动态配置面板 (3-4天)

**任务：**
1. 创建节点配置面板组件
2. 根据节点的 `supportedConfigs` 动态加载配置项
3. 调用 `GET /client/agent/config/config-definitions` 获取配置选项
4. 调用 `GET /client/agent/config/config-field-definitions` 获取字段定义
5. 动态生成表单（支持text/number/select/textarea/json/password等类型）
6. 表单验证（必填项、格式验证）
7. 保存配置到节点的data.config

**关键逻辑：**

```typescript
// src/components/NodeConfigPanel.tsx
import { useEffect, useState } from 'react';

function NodeConfigPanel({ node, onConfigChange }) {
  const [configDefinitions, setConfigDefinitions] = useState({});
  const [fieldDefinitions, setFieldDefinitions] = useState({});
  const [formData, setFormData] = useState(node.data.config || {});

  useEffect(() => {
    loadConfigs();
  }, [node]);

  const loadConfigs = async () => {
    const supportedConfigs = node.data.supportedConfigs || [];
    
    // 加载每个配置项的定义
    for (const configType of supportedConfigs) {
      // 1. 获取配置选项（如模型列表）
      const options = await request.get(
        `/client/agent/config/config-definitions?configType=${configType}`
      );
      
      // 2. 获取字段定义（如温度、maxTokens等字段）
      const fields = await request.get(
        `/client/agent/config/config-field-definitions?configType=${configType}`
      );

      setConfigDefinitions(prev => ({
        ...prev,
        [configType]: options[0]
      }));

      setFieldDefinitions(prev => ({
        ...prev,
        [configType]: fields
      }));
    }
  };

  const renderField = (field) => {
    switch (field.fieldType) {
      case 'select':
        return (
          <select
            value={formData[field.fieldName] || field.defaultValue}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.required}
          >
            <option value="">请选择</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={formData[field.fieldName] || field.defaultValue}
            onChange={(e) => handleFieldChange(field.fieldName, Number(e.target.value))}
            required={field.required}
            placeholder={field.description}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={formData[field.fieldName] || field.defaultValue}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={field.description}
            rows={4}
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={formData[field.fieldName] || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={field.description}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={formData[field.fieldName] || field.defaultValue}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.checked)}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={formData[field.fieldName] || field.defaultValue || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={field.description}
          />
        );
    }
  };

  const handleFieldChange = (fieldName, value) => {
    const newFormData = {
      ...formData,
      [fieldName]: value
    };
    setFormData(newFormData);
    onConfigChange(newFormData);
  };

  return (
    <div className="space-y-4">
      <h3>{node.data.label}</h3>
      
      {Object.entries(fieldDefinitions).map(([configType, fields]) => (
        <div key={configType} className="border p-4 rounded">
          <h4>{configDefinitions[configType]?.configName}</h4>
          
          {fields.map(field => (
            <div key={field.fieldName} className="mb-3">
              <label className="block mb-1">
                {field.fieldLabel}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              {renderField(field)}
              {field.description && (
                <p className="text-sm text-gray-500 mt-1">{field.description}</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <button onClick={() => onConfigChange(formData)}>
        保存配置
      </button>
    </div>
  );
}
```

---

### Phase 5: Agent保存与加载 (1-2天)

**任务：**
1. 实现保存功能
   - 收集画布上所有节点和连线
   - 转换为JSON格式
   - 调用 `POST /client/agent/save`
   
2. 实现加载功能
   - 从Agent列表进入编辑器时
   - 解析graphJson
   - 还原节点和连线到画布

3. 实现自动保存
   - 每隔30秒自动保存草稿

**代码示例：**

```typescript
// 保存Agent
const saveAgent = async (status = 0) => {
  const graphJson = JSON.stringify({
    nodes: nodes,
    edges: edges
  });

  const data = await request.post('/client/agent/save', {
    agentId: currentAgentId,
    agentName: agentName,
    description: description,
    graphJson: graphJson,
    status: status
  });

  console.log('保存成功', data);
  return data;
};

// 加载Agent
const loadAgent = async (agentId) => {
  // 假设从Agent列表传入了完整的agent对象
  // 或者需要新增一个获取单个Agent详情的接口
  
  const agent = agents.find(a => a.id === agentId);
  const graph = JSON.parse(agent.graphJson);
  
  setNodes(graph.nodes);
  setEdges(graph.edges);
  setAgentName(agent.agentName);
  setDescription(agent.description);
};

// 自动保存
useEffect(() => {
  const timer = setInterval(() => {
    if (nodes.length > 0) {
      saveAgent(0); // 保存为草稿
    }
  }, 30000); // 30秒

  return () => clearInterval(timer);
}, [nodes, edges]);
```

---

### Phase 6: 流式聊天功能 (2-3天)

**任务：**
1. 创建聊天测试页面
2. 实现SSE流式数据接收
3. 实现打字机效果
4. 多轮对话管理（conversationId）
5. 聊天历史记录展示

**核心功能：**
- 调用 `POST /client/agent/chat` 进行流式对话
- 使用Fetch API + ReadableStream接收SSE流
- 逐字显示AI回复
- 保存conversationId用于多轮对话

**代码示例：**

```typescript
// src/pages/AgentChat.tsx
import { useState, useRef, useEffect } from 'react';

function AgentChat({ agentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const conversationIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 创建AI消息占位符
    const aiMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      await streamChat(input);
    } catch (error) {
      console.error('聊天错误:', error);
      // 更新最后一条消息为错误提示
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = '抱歉，发生了错误';
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const streamChat = async (message) => {
    const response = await fetch('/api/client/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        agentId: agentId,
        userMessage: message,
        conversationId: conversationIdRef.current
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
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'token') {
              // 追加文本到最后一条消息
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content += data.content;
                return newMessages;
              });
            } else if (data.type === 'done') {
              // 保存conversationId
              conversationIdRef.current = data.conversationId;
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error('解析SSE消息失败:', e);
          }
        }
      }
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* 聊天历史 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息..."
            disabled={isLoading}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 状态管理建议

使用Zustand进行全局状态管理：

```typescript
// src/store/useAgentStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentStore {
  // 状态
  nodes: any[];
  edges: any[];
  selectedNode: any;
  agentInfo: {
    id: string | null;
    name: string;
    description: string;
    status: number;
  };
  nodeTypes: any[];
  
  // Actions
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  setSelectedNode: (node: any) => void;
  setAgentInfo: (info: any) => void;
  
  // 异步操作
  loadNodeTypes: () => Promise<void>;
  saveAgent: () => Promise<any>;
  loadAgent: (agentId: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      nodes: [],
      edges: [],
      selectedNode: null,
      agentInfo: { id: null, name: '', description: '', status: 0 },
      nodeTypes: [],

      // Setters
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setSelectedNode: (node) => set({ selectedNode: node }),
      setAgentInfo: (info) => set({ agentInfo: info }),

      // 加载节点类型
      loadNodeTypes: async () => {
        const data = await request.get('/client/agent/config/node-types');
        set({ nodeTypes: data });
      },

      // 保存Agent
      saveAgent: async () => {
        const { nodes, edges, agentInfo } = get();
        const graphJson = JSON.stringify({ nodes, edges });
        
        const data = await request.post('/client/agent/save', {
          agentId: agentInfo.id,
          agentName: agentInfo.name,
          description: agentInfo.description,
          graphJson: graphJson,
          status: agentInfo.status
        });

        set({
          agentInfo: {
            ...agentInfo,
            id: data.agentId
          }
        });

        return data;
      },

      // 加载Agent
      loadAgent: async (agentId) => {
        // 这里假设有获取单个Agent的接口
        // 或者从列表中找到对应的Agent
        const agent = {}; // 获取Agent数据
        const graph = JSON.parse(agent.graphJson);
        
        set({
          nodes: graph.nodes,
          edges: graph.edges,
          agentInfo: {
            id: agent.id,
            name: agent.agentName,
            description: agent.description,
            status: agent.status
          }
        });
      }
    }),
    {
      name: 'agent-storage'
    }
  )
);
```

---

## UI/UX设计要点

### 1. 编辑器布局
```
┌─────────────────────────────────────────────────────┐
│  Header: Agent名称 | 保存 | 发布 | 测试              │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│  组件库  │        画布区域          │  配置面板      │
│          │                          │                │
│  - 节点1 │   ┌──────┐               │  节点属性:     │
│  - 节点2 │   │ LLM  │──┐            │  - 模型: GPT-4 │
│  - 节点3 │   └──────┘  │            │  - 温度: 0.7   │
│  - ...   │             │            │  - ...         │
│          │          ┌──▼──┐         │                │
│          │          │路由 │         │                │
│          │          └─────┘         │                │
│          │                          │                │
└──────────┴──────────────────────────┴────────────────┘
```

### 2. 节点样式建议
- 使用不同颜色区分节点类型
- 显示节点图标（emoji或图标库）
- 节点配置完成后显示✓标记
- 配置不完整时显示⚠️警告

### 3. 交互细节
- 拖拽节点时显示半透明预览
- 连线时显示可连接的端点高亮
- 删除节点前弹出确认对话框
- 配置面板支持折叠/展开
- 保存成功后显示Toast提示

### 4. 响应式设计
- 在小屏幕上，配置面板改为抽屉式（Drawer）
- 组件库改为可收起的侧边栏
- 聊天界面全屏适配移动端

---

## 测试要点

### 单元测试
- API请求函数
- 表单验证逻辑
- 状态管理Store

### 集成测试
- 完整的注册登录流程
- Agent创建到保存流程
- 流式聊天功能

### E2E测试（建议）
- 用户注册 → 登录 → 创建Agent → 配置节点 → 保存 → 测试聊天

---

## 常见问题

### Q1: 如何处理Token过期？
**A:** 在axios响应拦截器中拦截401错误，清除Token并跳转登录页。

### Q2: 如何实现自动保存？
**A:** 使用useEffect + setInterval，每30秒保存一次草稿。

### Q3: 图形过大时如何优化性能？
**A:** 
- 使用React Flow的虚拟化功能
- 节点超过100个时启用简化渲染模式
- 使用React.memo优化组件渲染

### Q4: 如何处理SSE连接中断？
**A:** 
- 监听error事件
- 实现重连机制
- 显示连接状态提示

### Q5: 配置数据如何验证？
**A:** 
- 使用Zod或Yup定义schema
- 在保存前进行完整性检查
- 必填字段未填时禁用保存按钮

---

## 部署建议

### 开发环境
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
```

### 生产环境
```bash
# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 代理配置（开发时避免跨域）
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
```

---

## 交付清单

- [ ] 完整的源代码
- [ ] README.md（包含安装和运行说明）
- [ ] 环境变量配置示例
- [ ] 核心功能演示视频/截图
- [ ] 已知问题和TODO列表
- [ ] API接口文档（已提供）

---

## 时间估算

| 阶段 | 预计时间 |
|------|----------|
| Phase 1: 用户认证 | 1-2天 |
| Phase 2: Agent列表 | 1天 |
| Phase 3: 拖拽编辑器 | 2-3天 |
| Phase 4: 动态配置面板 | 3-4天 |
| Phase 5: 保存与加载 | 1-2天 |
| Phase 6: 流式聊天 | 2-3天 |
| 测试与优化 | 2-3天 |
| **总计** | **12-18天** |

---

## 参考资源

- [React Flow 官方文档](https://reactflow.dev/)
- [Zustand 官方文档](https://docs.pmnd.rs/zustand/)
- [Ant Design 组件库](https://ant.design/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [MDN - Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## 联系方式

如有技术问题，请联系后端团队获取支持。

祝开发顺利！🚀
