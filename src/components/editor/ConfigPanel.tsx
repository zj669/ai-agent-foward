import React, { useEffect, useState } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { getConfigSchema } from '@/api/config';
import { Form, Input, Select, InputNumber, Checkbox, Switch, Button, Spin, Empty, Divider, message, Radio, Tooltip, Modal } from 'antd';
import { InfoCircleOutlined, DeleteOutlined, CloseOutlined, SettingOutlined, NodeIndexOutlined } from '@ant-design/icons';

// Type definitions for config fields
interface FieldDef {
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    required: boolean;
    defaultValue?: any;
    options?: string[];
    description?: string;
}

interface ConfigDef {
    configType: string;
    configName: string;
    description: string;
    options?: { id: string; name: string; type: string }[];
}

const renderField = (field: FieldDef) => {
    switch (field.fieldType) {
        case 'select':
            return (
                <Select placeholder="请选择">
                    {field.options?.map(opt => <Select.Option key={opt} value={opt}>{opt}</Select.Option>)}
                </Select>
            );
        case 'number':
            return <InputNumber className="w-full" />;
        case 'checkbox':
        case 'boolean':
            return <Switch />;
        case 'textarea':
            return <Input.TextArea rows={4} className="rounded-lg" />;
        case 'password':
            return <Input.Password />;
        default:
            return <Input />;
    }
};

interface ModelConfigProps {
    configDef: ConfigDef;
    fieldDefs: FieldDef[];
}

const ModelConfig: React.FC<ModelConfigProps> = ({ configDef, fieldDefs }) => {
    const form = Form.useFormInstance();
    const modelSource = Form.useWatch(['MODEL', 'modelSource'], form);

    const customFields = ['baseUrl', 'apiKey', 'modelName'];
    const commonFields = fieldDefs.filter(f => !customFields.includes(f.fieldName));

    const [prevModelId, setPrevModelId] = React.useState<string | undefined>(undefined);

    const handleModeChange = (e: any) => {
        const newSource = e.target.value;
        const currentModelId = form.getFieldValue(['MODEL', 'modelId']);
        form.setFieldValue(['MODEL', 'modelSource'], newSource);
        if (newSource === 'platform') {
            if (prevModelId) form.setFieldValue(['MODEL', 'modelId'], prevModelId);
            form.setFieldValue(['MODEL', 'apiKey'], undefined);
            form.setFieldValue(['MODEL', 'baseUrl'], undefined);
            form.setFieldValue(['MODEL', 'modelName'], undefined);
        } else {
            if (currentModelId) setPrevModelId(currentModelId);
            form.setFieldValue(['MODEL', 'modelId'], undefined);
        }
    };

    return (
        <div className="mb-4">
            <Form.Item label="模型来源" className="mb-4">
                <Radio.Group value={modelSource} onChange={handleModeChange} optionType="button" buttonStyle="solid" className="w-full flex">
                    <Radio.Button value="platform" className="flex-1 text-center">系统预置</Radio.Button>
                    <Radio.Button value="custom" className="flex-1 text-center">自定义</Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Form.Item name={['MODEL', 'modelSource']} hidden><Input /></Form.Item>

            {modelSource === 'platform' && (
                <Form.Item
                    name={['MODEL', 'modelId']}
                    label="选择模型"
                    rules={[{ required: true, message: '请选择模型' }]}
                >
                    <Select placeholder="请选择模型" className="w-full">
                        {configDef.options?.map(opt => (
                            <Select.Option key={opt.id} value={opt.id}>
                                {opt.name} <span className="text-slate-400 text-xs">({opt.type})</span>
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            )}

            {modelSource === 'custom' && (
                <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-3 font-medium">自定义模型连接信息</p>
                    {fieldDefs.filter(f => customFields.includes(f.fieldName)).map(field => (
                        <Form.Item
                            key={field.fieldName}
                            name={['MODEL', field.fieldName]}
                            label={field.fieldLabel}
                            rules={[{ required: field.required, message: '此项必填' }]}
                            tooltip={field.description}
                            className="bg-white p-2 rounded border border-slate-100 mb-3"
                        >
                            {renderField(field)}
                        </Form.Item>
                    ))}
                </div>
            )}

            {commonFields.length > 0 && (
                <>
                    <Divider dashed className="border-slate-200 my-4" />
                    <div className="px-1">
                        <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">参数配置</div>
                        {commonFields.map(field => (
                            <Form.Item
                                key={field.fieldName}
                                name={['MODEL', field.fieldName]}
                                label={<span>{field.fieldLabel}{field.description && <Tooltip title={field.description}><InfoCircleOutlined className="ml-1 text-slate-400" /></Tooltip>}</span>}
                                valuePropName={field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? 'checked' : 'value'}
                            >
                                {renderField(field)}
                            </Form.Item>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const getIdFieldName = (configType: string): string => {
    switch (configType) {
        case 'MODEL': return 'modelId';
        case 'ADVISOR': return 'advisorId';
        case 'MCP_TOOL': return 'mcpId';
        case 'SYSTEM_PROMPT': return 'promptId';
        default: return configType.toLowerCase() + 'Id';
    }
};

const configCache: { defs: Record<string, ConfigDef>; fields: Record<string, FieldDef[]>; } = { defs: {}, fields: {} };

interface ConfigPanelProps {
    onClose?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onClose }) => {
    const { nodes, edges, selectedNodeId, selectedEdgeId, updateNodeData, updateEdgeData, deleteNode, deleteEdge } = useAgentStore();
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const selectedEdge = edges.find(e => e.id === selectedEdgeId);

    const [loading, setLoading] = useState(false);
    const [fieldDefsMap, setFieldDefsMap] = useState<Record<string, FieldDef[]>>({});
    const [configDefsMap, setConfigDefsMap] = useState<Record<string, ConfigDef>>({});
    const [form] = Form.useForm();

    const processInitialValues = (rawConfig: any) => {
        const config = JSON.parse(JSON.stringify(rawConfig || {}));
        if (config.MODEL) {
            if (config.MODEL.modelSource === 'platform') {
                delete config.MODEL.apiKey; delete config.MODEL.baseUrl; delete config.MODEL.modelName;
            } else if (config.MODEL.modelId) {
                config.MODEL.modelSource = 'platform';
                delete config.MODEL.apiKey; delete config.MODEL.baseUrl; delete config.MODEL.modelName;
            } else {
                config.MODEL.modelSource = 'custom';
            }
        }
        return config;
    };

    useEffect(() => {
        if (!selectedNode) return;
        let active = true;

        const load = async () => {
            let supportedConfigs = (selectedNode.data?.supportedConfigs as string[]) || [];
            if (!supportedConfigs.length) {
                setFieldDefsMap({}); setConfigDefsMap({}); form.resetFields(); return;
            }

            const missingConfigs = supportedConfigs.filter(type => !configCache.defs[type] || !configCache.fields[type]);

            if (missingConfigs.length > 0) {
                setLoading(true);
                try {
                    await Promise.all(missingConfigs.map(async (configType) => {
                        try {
                            const res = await getConfigSchema(configType);
                            const schema = res;
                            if (Array.isArray(schema) && schema.length > 0) {
                                const configDef: ConfigDef = {
                                    configType: configType, configName: configType, description: `${configType} 配置`, options: []
                                };
                                const fieldDefs: FieldDef[] = schema.map((f: any) => ({
                                    fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType,
                                    required: f.required, defaultValue: f.defaultValue,
                                    options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : undefined,
                                    description: f.description
                                }));
                                configCache.defs[configType] = configDef;
                                configCache.fields[configType] = fieldDefs;
                            }
                        } catch (e) { console.error(`Failed to load config schema for ${configType}:`, e); }
                    }));
                } catch (e) {
                    console.error(e); message.error('加载配置失败');
                } finally {
                    if (active) setLoading(false);
                }
            }

            if (!active) return;

            const fieldsMap: Record<string, FieldDef[]> = {};
            const configsMap: Record<string, ConfigDef> = {};
            for (const configType of supportedConfigs) {
                if (configCache.defs[configType]) configsMap[configType] = configCache.defs[configType];
                if (configCache.fields[configType]) fieldsMap[configType] = configCache.fields[configType];
            }
            setConfigDefsMap(configsMap);
            setFieldDefsMap(fieldsMap);

            const rawConfig = (selectedNode.data?.config as any) || {};
            const cleanConfig = processInitialValues(rawConfig);
            form.resetFields();
            form.setFieldsValue(cleanConfig);
        };
        load();
        return () => { active = false; };
    }, [selectedNode?.id, selectedNode?.data?.supportedConfigs, form]);

    const handleValuesChange = (changedValues: any, allValues: any) => {
        if (selectedNodeId) updateNodeData(selectedNodeId, { config: allValues });
    };

    if (selectedEdge) {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <NodeIndexOutlined />
                        </div>
                        <div>
                            <div className="font-bold text-slate-700">连接线</div>
                            <div className="text-xs text-slate-400 font-mono">{selectedEdge.id}</div>
                        </div>
                    </div>
                    {onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} className="text-slate-400 hover:text-red-500" />}
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <Form layout="vertical">
                            <Form.Item label="连接类型" className="mb-2 font-medium">
                                <Select
                                    value={selectedEdge.data?.edgeType || 'DEPENDENCY'}
                                    onChange={(val) => updateEdgeData(selectedEdge.id, { edgeType: val })}
                                    className="w-full"
                                >
                                    <Select.Option value="DEPENDENCY">标准依赖 (Dependency)</Select.Option>
                                    <Select.Option value="LOOP_BACK">循环回溯 (Loop Back)</Select.Option>
                                    <Select.Option value="CONDITIONAL">条件分支 (Conditional)</Select.Option>
                                </Select>
                            </Form.Item>

                            <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-100 mt-3 leading-relaxed">
                                {selectedEdge.data?.edgeType === 'LOOP_BACK' ? (
                                    <p><InfoCircleOutlined className="mr-1" /> 循环边允许流程回溯到之前的节点。请注意，循环次数受最大迭代限制 (Max Loop Iterations) 控制，防止死循环。</p>
                                ) : selectedEdge.data?.edgeType === 'CONDITIONAL' ? (
                                    <p><InfoCircleOutlined className="mr-1" /> 条件边通常由路由节点控制，根据执行结果动态选择路径。</p>
                                ) : (
                                    <p><InfoCircleOutlined className="mr-1" /> 标准依赖边表示正常的流程执行顺序。</p>
                                )}
                            </div>
                        </Form>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <Button block danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({
                            title: '删除连接', content: '确定要删除该连接线吗？',
                            okText: '删除', okType: 'danger', cancelText: '取消',
                            onOk: () => {
                                if (selectedEdgeId) { deleteEdge(selectedEdgeId); if (onClose) onClose(); }
                            }
                        });
                    }}>
                        删除连接
                    </Button>
                </div>
            </div>
        );
    }

    if (!selectedNode) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <NodeIndexOutlined className="text-4xl mb-3 text-slate-300" />
                <div className="text-sm font-medium">未选择对象</div>
                <div className="text-xs mt-1">请点击画布中的节点或连线</div>
                {onClose && <Button type="dashed" className="mt-6" onClick={onClose}>关闭面板</Button>}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-blue-50">
                        {(selectedNode.data?.nodeType as string)?.substring(0, 2) || 'ND'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={selectedNode.data?.label as string}>
                            {(selectedNode.data?.label as React.ReactNode) || '未命名节点'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedNode.id}</div>
                    </div>
                </div>
                {onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} className="text-slate-400 hover:text-red-500" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-40 gap-3">
                        <Spin />
                        <span className="text-xs text-slate-400">加载配置中...</span>
                    </div>
                ) : Object.keys(fieldDefsMap).length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无配置项" />
                ) : (
                    <Form form={form} layout="vertical" onValuesChange={handleValuesChange} className="space-y-4">
                        {Object.keys(fieldDefsMap).map(configType => {
                            const configDef = configDefsMap[configType];
                            const fieldDefs = fieldDefsMap[configType] || [];
                            const hasOptions = configDef?.options && configDef.options.length > 0;

                            return (
                                <div key={configType} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                                        <SettingOutlined className="text-blue-500" />
                                        <span className="font-bold text-slate-700 text-sm">{configDef?.configName || configType}</span>
                                    </div>
                                    {configDef?.description && <p className="text-xs text-slate-400 mb-4 bg-slate-50 p-2 rounded">{configDef.description}</p>}

                                    {configType === 'MODEL' ? (
                                        <ModelConfig configDef={configDef!} fieldDefs={fieldDefs} />
                                    ) : hasOptions ? (
                                        <Form.Item
                                            key={`${configType}-selection`}
                                            name={[configType, getIdFieldName(configType)]}
                                            label={`选择${configDef?.configName || configType}`}
                                            rules={[{ required: !['MCP_TOOL', 'ADVISOR'].includes(configType), message: '请选择' }]}
                                        >
                                            <Select
                                                placeholder={['MCP_TOOL', 'ADVISOR'].includes(configType) ? "请选择 (可选)" : "请选择"}
                                                allowClear={['MCP_TOOL', 'ADVISOR'].includes(configType)}
                                                className="w-full"
                                            >
                                                {configDef!.options!.map(opt => (
                                                    <Select.Option key={opt.id} value={opt.id}>
                                                        {opt.name} {opt.type ? <span className="text-slate-400 text-xs">({opt.type})</span> : ''}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    ) : (
                                        fieldDefs.map(field => (
                                            <Form.Item
                                                key={field.fieldName}
                                                name={[configType, field.fieldName]}
                                                label={field.fieldLabel}
                                                rules={[{ required: field.required, message: '此项必填' }]}
                                                tooltip={field.description}
                                                valuePropName={field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? 'checked' : 'value'}
                                            >
                                                {renderField(field)}
                                            </Form.Item>
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </Form>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button block danger icon={<DeleteOutlined />} onClick={() => {
                    Modal.confirm({
                        title: '删除节点', content: '确定要删除该节点吗？',
                        okText: '删除', okType: 'danger', cancelText: '取消',
                        onOk: () => { if (selectedNodeId) { deleteNode(selectedNodeId); if (onClose) onClose(); } }
                    });
                }}>
                    删除节点
                </Button>
            </div>
        </div>
    );
};

export default ConfigPanel;
